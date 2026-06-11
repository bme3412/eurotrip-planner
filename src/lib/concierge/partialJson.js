/**
 * Tolerant parser for a PARTIAL JSON document — the accumulated
 * `input_json_delta` text of an in-flight Anthropic tool call. Repairs the
 * truncation (dangling escape, unterminated string, unclosed brackets,
 * trailing comma/colon) and parses, so the UI can render prose fields as the
 * model writes them. Returns null when no valid object can be recovered yet.
 */
export function parsePartialJson(text) {
  if (!text || typeof text !== 'string') return null;
  try {
    return JSON.parse(text);
  } catch {
    /* fall through to repair */
  }

  // Walk the text tracking string/escape state and the open-bracket stack.
  let inString = false;
  let escaped = false;
  const stack = [];
  for (const ch of text) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      if (inString) escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === '{' || ch === '[') stack.push(ch);
    else if (ch === '}' || ch === ']') stack.pop();
  }

  let repaired = text;
  if (escaped) repaired = repaired.slice(0, -1); // dangling backslash
  if (inString) repaired += '"';
  // A value cut right after `:` or a trailing comma both break parse.
  repaired = repaired.replace(/:\s*$/, ': null').replace(/,\s*$/, '');
  for (let i = stack.length - 1; i >= 0; i--) repaired += stack[i] === '{' ? '}' : ']';

  try {
    return JSON.parse(repaired);
  } catch {
    return null; // e.g. a key name cut mid-way — caller keeps its last good parse
  }
}
