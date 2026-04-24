/**
 * Pure helpers for incremental Server-Sent Events line buffering.
 * Extracted from useAgentStream so the buffering logic can be unit tested
 * without a Response body / ReadableStream.
 *
 * Usage:
 *   const state = createSSEBuffer();
 *   const events = feedSSE(state, chunk); // Array of parsed JSON payloads
 *   // ... repeat per chunk ...
 *   const tail = flushSSE(state); // parse anything left after the stream closes
 *
 * Notes:
 *  - Only `data: ` lines are parsed; others (comments, `event:`, blank) are
 *    skipped.
 *  - Malformed JSON on a completed line is dropped silently (matching the
 *    hook's behavior).
 */

export function createSSEBuffer() {
  return { lineBuffer: '' };
}

/**
 * Feed the next chunk of decoded text into the buffer. Returns an array of
 * parsed JSON payloads for every completed SSE `data:` line in the chunk.
 */
export function feedSSE(state, chunk) {
  state.lineBuffer += chunk || '';

  const lines = state.lineBuffer.split('\n');
  // The last segment may be incomplete — keep it buffered for the next chunk.
  state.lineBuffer = lines.pop() || '';

  const events = [];
  for (const rawLine of lines) {
    const parsed = parseSSELine(rawLine);
    if (parsed !== undefined) events.push(parsed);
  }
  return events;
}

/**
 * Flush any residual buffered content at end-of-stream. Returns an array with
 * zero or one event depending on whether the final line was a complete
 * `data:` payload.
 */
export function flushSSE(state) {
  const trimmed = state.lineBuffer.trim();
  state.lineBuffer = '';
  if (!trimmed) return [];
  const parsed = parseSSELine(trimmed);
  return parsed === undefined ? [] : [parsed];
}

/**
 * Parse a single SSE line. Returns undefined for non-`data:` lines, blank
 * payloads, or malformed JSON.
 */
export function parseSSELine(line) {
  if (!line) return undefined;
  if (!line.startsWith('data: ')) return undefined;
  const jsonStr = line.slice(6).trim();
  if (!jsonStr) return undefined;
  try {
    return JSON.parse(jsonStr);
  } catch {
    return undefined;
  }
}
