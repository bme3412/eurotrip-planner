import { TOOLS_V2, DATA_TOOLS, UI_TOOLS } from '@/lib/conversation/toolsV2';
import { buildFullPromptBlocks } from '@/lib/conversation/systemPromptV2';
import { executeToolCall as defaultExecuteToolCall } from '@/lib/conversation/toolHandlers';

export const MAX_LOOPS = 8;
export const MODEL = 'claude-sonnet-4-20250514';

/**
 * Run the multi-turn planner agent loop.
 *
 * Pure-ish orchestration: takes an Anthropic-like client, an initial trip
 * state, and emits SSE-style events through the `send` callback. Factored
 * out of /api/conversation/route.js so it can be unit-tested against a
 * mock client.
 *
 * @param {object} opts
 * @param {{messages: {stream: (params: object) => {on: Function, finalMessage: () => Promise<any>}}}} opts.client
 * @param {Array<{role: string, content: any}>} opts.initialMessages
 * @param {object} opts.tripState
 * @param {Function} opts.send                SSE dispatcher `(event) => void`
 * @param {Function} [opts.buildToolHistoryBlock]  returns string
 * @param {Function} [opts.executeToolCall]   defaults to real handler
 * @param {string}   [opts.sessionId]
 * @param {number}   [opts.maxLoops]          default MAX_LOOPS
 * @param {Function} [opts.callWithRetry]     defaults to no-retry direct call
 * @returns {Promise<{tripState: object, loopCount: number, hitMaxLoops: boolean}>}
 */
export async function runPlannerLoop({
  client,
  initialMessages,
  tripState: initialTripState,
  send,
  buildToolHistoryBlock = () => '',
  executeToolCall = defaultExecuteToolCall,
  sessionId,
  maxLoops = MAX_LOOPS,
  callWithRetry,
}) {
  let tripState = initialTripState;
  let systemForCall = buildFullPromptBlocks(tripState, buildToolHistoryBlock());
  let currentMessages = [...initialMessages];
  let continueLoop = true;
  let loopCount = 0;
  let lastLoopHadToolUse = false;

  const invokeModel = callWithRetry || (async ({ params, onText }) => {
    const s = client.messages.stream(params);
    s.on('text', (delta) => {
      if (delta && onText) onText(delta);
    });
    return s.finalMessage();
  });

  while (continueLoop && loopCount < maxLoops) {
    continueLoop = false;
    loopCount += 1;
    lastLoopHadToolUse = false;

    const maxTokens = loopCount === 1 ? 4096 : 2048;
    const response = await invokeModel({
      params: {
        model: MODEL,
        max_tokens: maxTokens,
        system: systemForCall,
        messages: currentMessages,
        tools: TOOLS_V2,
      },
      onText: (delta) => send({ type: 'content_delta', content: delta }),
      sessionId,
    });

    const toolResults = [];
    let hasDataTools = false;

    for (const block of response.content || []) {
      if (block.type !== 'tool_use') continue;

      lastLoopHadToolUse = true;
      send({
        type: 'tool_use',
        id: block.id,
        name: block.name,
        input: block.input,
      });

      if (DATA_TOOLS.has(block.name)) {
        hasDataTools = true;
        const result = await executeToolCall(block.name, block.input, tripState);

        if (
          (block.name === 'extract_trip_data' || block.name === 'remove_cities') &&
          result?.updatedState
        ) {
          tripState = result.updatedState;
          send({ type: 'state_update', state: tripState });
        }

        if (result && block.name === 'resolve_cities') {
          send({ type: 'tool_result', name: block.name, result });
          for (const resolved of Array.isArray(result) ? result : []) {
            if (!resolved.resolved) continue;
            const city = tripState.route?.cities?.find(
              (c) => c.name?.toLowerCase() === resolved.input?.toLowerCase()
            );
            if (city) {
              city.id = resolved.id;
              city.country = resolved.country;
              city.latitude = resolved.latitude;
              city.longitude = resolved.longitude;
            }
          }
          send({ type: 'state_update', state: tripState });
        }

        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(result || {}),
        });
      } else if (UI_TOOLS.has(block.name)) {
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify({ rendered: true }),
        });
      }
    }

    if (toolResults.length > 0 && lastLoopHadToolUse) {
      currentMessages.push({ role: 'assistant', content: response.content });
      currentMessages.push({ role: 'user', content: toolResults });
      if (hasDataTools) {
        systemForCall = buildFullPromptBlocks(tripState, buildToolHistoryBlock());
      }
      continueLoop = true;
    }
  }

  const hitMaxLoops = loopCount >= maxLoops && lastLoopHadToolUse;
  if (hitMaxLoops) {
    send({
      type: 'incomplete',
      reason: 'max_loops',
      message:
        "I'm taking longer than expected to work through this. Send another message and I'll pick up where I left off.",
    });
  }

  send({ type: 'done' });

  return { tripState, loopCount, hitMaxLoops };
}
