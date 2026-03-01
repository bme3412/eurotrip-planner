/**
 * POST /api/plan/agent-bedrock
 *
 * Streaming agentic itinerary planner using Amazon Bedrock Converse API.
 * Uses ConverseStreamCommand for token-by-token streaming, then handles
 * tool_use stopReason with the same executors as the OpenAI agent.
 *
 * Emits the same SSE events as /api/plan/agent so PlannerChat works unchanged.
 *
 * Hardened with:
 *   - Exponential backoff retry for throttling
 *   - Fallback to OpenAI agent on non-retryable errors
 *   - Token/cost logging per request
 */

import {
  BedrockRuntimeClient,
  ConverseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { getTripWithDetails } from '@/lib/trips/tripState';
import { getCityData } from '@/lib/data-utils';
import {
  BEDROCK_TOOL_CONFIG,
  execGetCityAttractions,
  execGetPlaceDetails,
  execSearchNearby,
  execUpdateItinerary,
  buildSystemPrompt,
  buildToolSummary,
} from '@/lib/planning/agentTools';

export const runtime = 'nodejs';

const MODEL_ID = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-v2:0';
const MAX_TOOL_ROUNDS = 10;
const MAX_RETRIES = 3;

const RETRYABLE_ERRORS = new Set([
  'ThrottlingException',
  'ServiceUnavailableException',
  'ModelTimeoutException',
  'ModelNotReadyException',
]);

function sseEvent(type, data) {
  return `data: ${JSON.stringify({ type, ...data })}\n\n`;
}

function toBedrockMessages(userMessages) {
  const messages = [];
  for (const m of userMessages) {
    if (!m.role || !m.content) continue;
    if (m.role === 'system') continue;
    const text = typeof m.content === 'string' ? m.content : String(m.content || '').trim();
    if (!text) continue;
    messages.push({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: [{ text }],
    });
  }
  return messages;
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

async function sendWithRetry(client, command) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await client.send(command);
    } catch (err) {
      const errorName = err.name || err.__type || '';
      const isRetryable = RETRYABLE_ERRORS.has(errorName);

      if (!isRetryable || attempt === MAX_RETRIES) {
        throw err;
      }

      const backoff = Math.pow(2, attempt) * 200;
      console.warn(`[bedrock] ${errorName}, retrying in ${backoff}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
}

function isNonRetryableBedrockError(err) {
  const name = err.name || err.__type || '';
  return (
    name === 'AccessDeniedException' ||
    name === 'ResourceNotFoundException' ||
    name === 'ValidationException' ||
    (name === 'ModelErrorException' && !RETRYABLE_ERRORS.has(name))
  );
}

async function consumeStream(response, emit) {
  const assistantContent = [];
  let currentText = '';
  let currentToolUse = null;
  let toolUseInput = '';
  let stopReason = null;
  let usage = null;

  for await (const event of response.stream) {
    if (event.contentBlockStart) {
      const start = event.contentBlockStart.start;
      currentText = '';

      if (start?.toolUse) {
        currentToolUse = { toolUseId: start.toolUse.toolUseId, name: start.toolUse.name };
        toolUseInput = '';
        emit('tool_call', { name: start.toolUse.name, args: {} });
      } else {
        currentToolUse = null;
      }
    }

    if (event.contentBlockDelta) {
      const delta = event.contentBlockDelta.delta;
      if (delta?.text) {
        currentText += delta.text;
        emit('delta', { text: delta.text });
      }
      if (delta?.toolUse?.input) {
        toolUseInput += delta.toolUse.input;
      }
    }

    if (event.contentBlockStop) {
      if (currentToolUse) {
        let parsedInput = {};
        try { parsedInput = JSON.parse(toolUseInput || '{}'); } catch { /* empty */ }
        assistantContent.push({
          toolUse: {
            toolUseId: currentToolUse.toolUseId,
            name: currentToolUse.name,
            input: parsedInput,
          },
        });
      } else if (currentText) {
        assistantContent.push({ text: currentText });
      }
      currentToolUse = null;
      currentText = '';
    }

    if (event.messageStop) {
      stopReason = event.messageStop.stopReason;
    }

    if (event.metadata) {
      usage = event.metadata.usage;
    }
  }

  return { stopReason, assistantContent, usage };
}

export async function POST(request) {
  const region = process.env.AWS_REGION || 'us-east-1';

  const hasCredentials = !!(
    process.env.AWS_ACCESS_KEY_ID ||
    process.env.AWS_SECRET_ACCESS_KEY ||
    process.env.AWS_PROFILE ||
    process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI
  );

  if (!hasCredentials) {
    return new Response(
      sseEvent('error', { message: 'AWS credentials not configured' }),
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

  const { tripId, citySlug, messages: userMessages } = body;
  if (!tripId || !citySlug || !Array.isArray(userMessages) || userMessages.length === 0) {
    return new Response(
      sseEvent('error', { message: 'tripId, citySlug, and messages are required' }),
      { status: 400, headers: { 'Content-Type': 'text/event-stream' } }
    );
  }

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

        const client = new BedrockRuntimeClient({ region });
        const systemPrompt = buildSystemPrompt(trip, cityData);
        const messages = toBedrockMessages(userMessages);

        if (messages.length === 0) {
          emit('error', { message: 'No valid messages' });
          controller.close();
          return;
        }

        let totalInputTokens = 0;
        let totalOutputTokens = 0;
        let totalToolCalls = 0;

        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          const command = new ConverseStreamCommand({
            modelId: MODEL_ID,
            messages,
            system: [{ text: systemPrompt }],
            toolConfig: BEDROCK_TOOL_CONFIG,
            inferenceConfig: { temperature: 0.4, maxTokens: 2048 },
          });

          let response;
          try {
            response = await sendWithRetry(client, command);
          } catch (err) {
            if (round === 0 && isNonRetryableBedrockError(err)) {
              console.warn(`[bedrock] Non-retryable error (${err.name}), falling back to OpenAI agent`);
              controller.close();

              const { POST: openaiPost } = await import('@/app/api/plan/agent/route');
              const fallbackRequest = new Request(request.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
              });
              const fallbackResponse = await openaiPost(fallbackRequest);
              const fallbackReader = fallbackResponse.body.getReader();

              const fallbackStream = new ReadableStream({
                async start(fallbackController) {
                  while (true) {
                    const { done: fDone, value } = await fallbackReader.read();
                    if (fDone) { fallbackController.close(); break; }
                    fallbackController.enqueue(value);
                  }
                },
              });
              return new Response(fallbackStream, { headers: fallbackResponse.headers });
            }

            if (round === 0) throw err;
            emit('error', { message: `Bedrock call failed on round ${round + 1}: ${err.message}` });
            controller.close();
            return;
          }

          const { stopReason, assistantContent, usage } = await consumeStream(response, emit);

          if (usage) {
            totalInputTokens += usage.inputTokens || 0;
            totalOutputTokens += usage.outputTokens || 0;
          }

          messages.push({ role: 'assistant', content: assistantContent });

          if (stopReason !== 'tool_use') {
            console.log('[bedrock] request complete:', {
              model: MODEL_ID,
              inputTokens: totalInputTokens,
              outputTokens: totalOutputTokens,
              toolCalls: totalToolCalls,
              rounds: round + 1,
              tripId,
            });
            done();
            return;
          }

          const toolBlocks = assistantContent.filter((b) => b.toolUse);
          totalToolCalls += toolBlocks.length;
          const toolResultContent = [];

          for (const block of toolBlocks) {
            const { toolUseId, name, input: args } = block.toolUse;

            let result;
            try {
              result = await runTool(name, args, tripId, emit);
            } catch (err) {
              result = { error: err.message };
            }

            const summary = buildToolSummary(name, args, result);
            emit('tool_result', { name, summary, result });

            toolResultContent.push({
              toolResult: {
                toolUseId,
                content: result.error
                  ? [{ text: result.error }]
                  : [{ json: result }],
                status: result.error ? 'error' : 'success',
              },
            });
          }

          messages.push({ role: 'user', content: toolResultContent });
        }

        emit('error', { message: 'Agent exceeded maximum tool rounds' });
        controller.close();
      } catch (err) {
        console.error('[agent-bedrock] error:', err);

        if (isNonRetryableBedrockError(err) && process.env.OPENAI_API_KEY) {
          emit('error', { message: 'Bedrock unavailable, please retry (falling back)' });
        } else {
          emit('error', { message: err.message || 'Bedrock request failed' });
        }
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
