/**
 * POST /api/plan/agent-bedrock-rc
 *
 * Bedrock Agent with Return Control — Bedrock manages the orchestration loop
 * and session memory, but tool execution stays in this Next.js process.
 *
 * When the agent needs a tool, it returns a `returnControl` event with
 * function name + parameters. We run the tool locally (same executors as
 * the Converse route) and send results back via another InvokeAgent call
 * with `sessionState.returnControlInvocationResults`.
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
import {
  execGetCityAttractions,
  execGetPlaceDetails,
  execSearchNearby,
  execUpdateItinerary,
  buildSystemPrompt,
  buildToolSummary,
} from '@/lib/planning/agentTools';

export const runtime = 'nodejs';

const AGENT_ID = process.env.BEDROCK_AGENT_ID;
const ALIAS_ID = process.env.BEDROCK_AGENT_ALIAS_ID;
const MAX_RETURN_CONTROL_ROUNDS = 10;

function sseEvent(type, data) {
  return `data: ${JSON.stringify({ type, ...data })}\n\n`;
}

async function runTool(name, args, tripId, emit) {
  switch (name) {
    case 'get_city_attractions':
      return execGetCityAttractions(args);
    case 'get_place_details':
      return execGetPlaceDetails(args);
    case 'search_nearby':
      return execSearchNearby(args);
    case 'update_itinerary':
      return execUpdateItinerary({ ...args, trip_id: tripId }, emit);
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

function parseParameters(parameters) {
  const result = {};
  for (const p of parameters || []) {
    let value = p.value;
    if (typeof value === 'string') {
      try { value = JSON.parse(value); } catch { /* keep as string */ }
    }
    result[p.name] = value;
  }
  return result;
}

async function invokeAgent(client, sessionId, inputText, sessionState) {
  const command = new InvokeAgentCommand({
    agentId: AGENT_ID,
    agentAliasId: ALIAS_ID,
    sessionId,
    inputText: sessionState ? undefined : inputText,
    enableTrace: true,
    ...(sessionState ? { sessionState } : {}),
  });
  return client.send(command);
}

/**
 * Consume the InvokeAgent response stream.
 * Returns { text, returnControl, traceEvents }.
 */
async function consumeAgentStream(response) {
  let text = '';
  let returnControl = null;
  const traceEvents = [];

  for await (const event of response.completion || []) {
    if (event.chunk) {
      const bytes = event.chunk.bytes;
      if (bytes) {
        text += new TextDecoder().decode(bytes);
      }
    }

    if (event.returnControl) {
      returnControl = event.returnControl;
    }

    if (event.trace?.trace) {
      traceEvents.push(event.trace.trace);
    }
  }

  return { text, returnControl, traceEvents };
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

        const initialSessionState = {
          sessionAttributes: {
            tripId,
            citySlug,
            city: cityData?.name || trip?.city || '',
          },
        };

        let response = await invokeAgent(
          client,
          sessionId,
          inputText,
          isFirstMessage ? initialSessionState : undefined
        );

        for (let round = 0; round < MAX_RETURN_CONTROL_ROUNDS; round++) {
          const { text, returnControl, traceEvents } = await consumeAgentStream(response);

          for (const trace of traceEvents) {
            if (trace.orchestrationTrace?.invocationInput) {
              const inv = trace.orchestrationTrace.invocationInput;
              if (inv.actionGroupInvocationInput) {
                const funcName = inv.actionGroupInvocationInput.function;
                if (funcName) {
                  emit('tool_call', { name: funcName, args: {} });
                }
              }
            }
          }

          if (text) {
            emit('delta', { text });
          }

          if (!returnControl) {
            done();
            return;
          }

          const invocationId = returnControl.invocationId;
          const invocationInputs = returnControl.invocationInputs || [];
          const returnControlResults = [];

          for (const input of invocationInputs) {
            const funcInput = input.functionInvocationInput;
            if (!funcInput) continue;

            const funcName = funcInput.function;
            const actionGroup = funcInput.actionGroup;
            const params = parseParameters(funcInput.parameters);

            emit('tool_call', { name: funcName, args: params });

            let result;
            try {
              result = await runTool(funcName, params, tripId, emit);
            } catch (err) {
              result = { error: err.message };
            }

            const summary = buildToolSummary(funcName, params, result);
            emit('tool_result', { name: funcName, summary, result });

            returnControlResults.push({
              functionResult: {
                actionGroup,
                function: funcName,
                responseBody: {
                  TEXT: { body: JSON.stringify(result) },
                },
              },
            });
          }

          response = await invokeAgent(client, sessionId, undefined, {
            invocationId,
            returnControlInvocationResults: returnControlResults,
          });
        }

        emit('error', { message: 'Agent exceeded maximum return control rounds' });
        controller.close();
      } catch (err) {
        console.error('[agent-bedrock-rc] error:', err);
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
