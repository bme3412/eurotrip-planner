import Anthropic from '@anthropic-ai/sdk';
import { buildFullPrompt } from '@/lib/conversation/systemPromptV2';
import { TOOLS_V2, DATA_TOOLS, UI_TOOLS } from '@/lib/conversation/toolsV2';
import { initialTripState } from '@/lib/conversation/tripState';
import { executeToolCall } from '@/lib/conversation/toolHandlers';

/**
 * Create an SSE stream for real-time responses.
 */
function createSSEStream() {
  const encoder = new TextEncoder();
  let controller;

  const stream = new ReadableStream({
    start(c) { controller = c; },
  });

  const send = (data) => {
    try {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    } catch {
      // Stream may be closed
    }
  };

  const close = () => {
    try { controller.close(); } catch { /* already closed */ }
  };

  return { stream, send, close };
}

export async function POST(request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { messages, tripState: clientTripState, isStart, recentToolHistory } = await request.json();
    console.log('[conversation] POST received:', { isStart, messageCount: messages?.length || 0 });

    const client = new Anthropic({ apiKey });

    // Use client-provided trip state or start fresh
    let tripState = clientTripState || { ...initialTripState };

    // Build system prompt with current context + gap analysis
    let systemPrompt = buildFullPrompt(tripState);

    // Append recent tool history if provided (gives Claude memory of its own tool calls)
    if (recentToolHistory?.length > 0) {
      const historyText = recentToolHistory
        .map(t => `- Called ${t.tool}: ${t.summary}`)
        .join('\n');
      systemPrompt += `\n\n## Recent Tool History\nThese tools were called in previous turns:\n${historyText}`;
    }

    // Build messages array
    let apiMessages;
    if (isStart || !messages || messages.length === 0) {
      apiMessages = [{
        role: 'user',
        content: 'Hi, I want to plan a European trip.',
      }];
    } else {
      apiMessages = messages
        .filter(m => m.content)
        .map(m => ({ role: m.role, content: m.content }));
    }

    // Ensure messages alternate roles (Anthropic requirement)
    const mergedMessages = [];
    for (const msg of apiMessages) {
      const prev = mergedMessages[mergedMessages.length - 1];
      if (prev && prev.role === msg.role) {
        prev.content += '\n' + msg.content;
      } else {
        mergedMessages.push({ ...msg });
      }
    }

    // Ensure first message is 'user'
    if (mergedMessages.length > 0 && mergedMessages[0].role !== 'user') {
      mergedMessages.unshift({ role: 'user', content: 'I want to plan a European trip.' });
    }

    const { stream, send, close } = createSSEStream();

    // Process in background
    (async () => {
      try {
        let continueLoop = true;
        let currentMessages = [...mergedMessages];
        let loopCount = 0;
        const MAX_LOOPS = 8;

        while (continueLoop && loopCount < MAX_LOOPS) {
          continueLoop = false;
          loopCount++;

          console.log(`[conversation] Loop ${loopCount}: calling Anthropic (${currentMessages.length} messages)`);

          // Use Anthropic SDK streaming so text deltas reach the client as they're produced
          const streamResp = client.messages.stream({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4096,
            system: systemPrompt,
            messages: currentMessages,
            tools: TOOLS_V2,
          });

          streamResp.on('text', (textDelta) => {
            if (textDelta) send({ type: 'content_delta', content: textDelta });
          });

          const response = await streamResp.finalMessage();
          const blockTypes = response.content.map(b => b.type === 'tool_use' ? `tool_use(${b.name})` : b.type);
          console.log(`[conversation] Loop ${loopCount}: stop_reason=${response.stop_reason}, blocks=[${blockTypes.join(', ')}]`);

          // --- PASS 1: Execute tools and collect all tool results ---
          const toolResults = [];
          let hasDataTools = false;

          for (const block of response.content) {
            if (block.type === 'text') {
              // no-op: already streamed via content_delta
            } else if (block.type === 'tool_use') {
              // Send every tool call to client (for UI rendering or informational)
              send({
                type: 'tool_use',
                id: block.id,
                name: block.name,
                input: block.input,
              });

              if (DATA_TOOLS.has(block.name)) {
                hasDataTools = true;
                const result = await executeToolCall(block.name, block.input, tripState);

                // If extract_trip_data, update the server-side trip state and send to client
                if (block.name === 'extract_trip_data' && result?.updatedState) {
                  tripState = result.updatedState;
                  send({ type: 'state_update', state: tripState });
                }

                // If resolve_cities, merge resolved data back into tripState
                if (result && block.name === 'resolve_cities') {
                  send({ type: 'tool_result', name: block.name, result });
                  for (const resolved of (Array.isArray(result) ? result : [])) {
                    if (!resolved.resolved) continue;
                    const city = tripState.route?.cities?.find(c =>
                      c.name?.toLowerCase() === resolved.input?.toLowerCase()
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
                // UI tools pass through to client. Add a synthetic tool_result
                // so the message history stays valid when mixed with data tools.
                toolResults.push({
                  type: 'tool_result',
                  tool_use_id: block.id,
                  content: JSON.stringify({ rendered: true }),
                });
              }
            }
          }

          // --- PASS 2: If tools were called and stop_reason is tool_use, continue the loop ---
          // Claude needs to see tool results before it can write follow-up text.
          // This applies to BOTH data tools and UI tools.
          if (toolResults.length > 0 && response.stop_reason === 'tool_use') {
            currentMessages.push({
              role: 'assistant',
              content: response.content,
            });
            currentMessages.push({
              role: 'user',
              content: toolResults,
            });

            // Rebuild system prompt with updated trip state (gap analysis may have changed)
            if (hasDataTools) {
              systemPrompt = buildFullPrompt(tripState);
            }

            continueLoop = true;
          }
        }

        send({ type: 'done' });
      } catch (error) {
        console.error('[conversation] Streaming error:', error);
        send({ type: 'error', error: error.message || 'Unknown error' });
      } finally {
        close();
      }
    })();

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('[conversation] Request error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
