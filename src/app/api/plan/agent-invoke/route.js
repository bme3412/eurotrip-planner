/**
 * POST /api/plan/agent-invoke
 *
 * Bedrock Agent with Lambda action groups — fully managed orchestration.
 * Tools execute in Lambda, so this route just streams text and trace events.
 * Simpler than the Return Control route since there's no local tool execution.
 *
 * Emits the same SSE contract as the other agent routes.
 *
 * Env: AWS_REGION, BEDROCK_AGENT_ID, BEDROCK_AGENT_ALIAS_ID
 */

import {
  BedrockAgentRuntimeClient,
  InvokeAgentCommand,
} from '@aws-sdk/client-bedrock-agent-runtime';
import { getTripWithDetails } from '@/lib/trips/tripState';
import { getCityData } from '@/lib/data-utils';
import { buildSystemPrompt } from '@/lib/planning/agentTools';

export const runtime = 'nodejs';

const AGENT_ID = process.env.BEDROCK_AGENT_ID;
const ALIAS_ID = process.env.BEDROCK_AGENT_ALIAS_ID;

function sseEvent(type, data) {
  return `data: ${JSON.stringify({ type, ...data })}\n\n`;
}

export async function POST(request) {
  if (!AGENT_ID || !ALIAS_ID) {
    return new Response(
      sseEvent('error', { message: 'BEDROCK_AGENT_ID and BEDROCK_AGENT_ALIAS_ID are required' }),
      { status: 500, headers: { 'Content-Type': 'text/event-stream' } }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(
      sseEvent('error', { message: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'text/event-stream' } }
    );
  }

  const { tripId, citySlug, messages: userMessages, sessionId: clientSessionId } = body;
  if (!tripId || !citySlug || !Array.isArray(userMessages) || userMessages.length === 0) {
    return new Response(
      sseEvent('error', { message: 'tripId, citySlug, and messages are required' }),
      { status: 400, headers: { 'Content-Type': 'text/event-stream' } }
    );
  }

  const lastUserMessage = [...userMessages].reverse().find((m) => m.role === 'user');
  if (!lastUserMessage?.content) {
    return new Response(
      sseEvent('error', { message: 'No user message found' }),
      { status: 400, headers: { 'Content-Type': 'text/event-stream' } }
    );
  }

  const sessionId = clientSessionId || `trip-${tripId}-${Date.now()}`;

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const push = (chunk) => controller.enqueue(enc.encode(chunk));
      const emit = (type, data) => push(sseEvent(type, data));
      const done = () => { push(sseEvent('done', {})); controller.close(); };

      try {
        const [trip, cityData] = await Promise.all([
          getTripWithDetails(tripId),
          getCityData(citySlug),
        ]);

        if (!trip) {
          emit('error', { message: 'Trip not found' });
          controller.close();
          return;
        }

        const region = process.env.AWS_REGION || 'us-east-1';
        const client = new BedrockAgentRuntimeClient({ region });

        const contextSummary = buildSystemPrompt(trip, cityData);
        const isFirstMessage = userMessages.filter((m) => m.role === 'user').length === 1;

        const inputText = isFirstMessage
          ? `[TRIP CONTEXT]\n${contextSummary}\n\n[USER REQUEST]\n${lastUserMessage.content}`
          : lastUserMessage.content;

        const command = new InvokeAgentCommand({
          agentId: AGENT_ID,
          agentAliasId: ALIAS_ID,
          sessionId,
          inputText,
          enableTrace: true,
          ...(isFirstMessage
            ? {
                sessionState: {
                  sessionAttributes: {
                    tripId,
                    citySlug,
                    city: cityData?.name || trip?.city || '',
                  },
                },
              }
            : {}),
        });

        const response = await client.send(command);

        for await (const event of response.completion || []) {
          if (event.chunk) {
            const bytes = event.chunk.bytes;
            if (bytes) {
              const text = new TextDecoder().decode(bytes);
              if (text) emit('delta', { text });
            }
          }

          if (event.trace?.trace) {
            const trace = event.trace.trace;

            if (trace.orchestrationTrace?.invocationInput?.actionGroupInvocationInput) {
              const agInput = trace.orchestrationTrace.invocationInput.actionGroupInvocationInput;
              if (agInput.function) {
                emit('tool_call', { name: agInput.function, args: {} });
              }
            }

            if (trace.orchestrationTrace?.observation?.actionGroupInvocationOutput) {
              const agOutput = trace.orchestrationTrace.observation.actionGroupInvocationOutput;
              const outputText = agOutput.text || '';
              let parsed = {};
              try { parsed = JSON.parse(outputText); } catch { /* ignore */ }

              const funcName = trace.orchestrationTrace?.invocationInput?.actionGroupInvocationInput?.function || 'tool';
              emit('tool_result', {
                name: funcName,
                summary: parsed.error ? 'Tool error' : 'Tool completed',
                result: parsed,
              });

              if (funcName === 'update_itinerary' && parsed.success) {
                emit('activity_updated', {
                  activityId: parsed.activity_id,
                  activity: { name: parsed.name },
                });
              }
            }
          }
        }

        done();
      } catch (err) {
        console.error('[agent-invoke] error:', err);
        emit('error', { message: err.message || 'Bedrock Agent request failed' });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
