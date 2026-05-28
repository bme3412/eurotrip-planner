// Pure string helpers used by the message renderers. Kept JSX-free so they
// can be imported anywhere without dragging React in.

export function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Strip lightweight markdown that the LLM tends to emit so chat reads as plain prose.
// - **bold** / __bold__ / *italic* / _italic_ -> inner text
// - Leading "- " or "* " bullets -> "• "
// - Leading "#" / "##" headers -> bare text
// - Inline `code` -> code (no backticks)
// - Also patches missing whitespace after a sentence-ending number such as "June 30The flight" -> "June 30. The flight"
export function stripMarkdown(input) {
  if (typeof input !== 'string' || !input) return input;
  let out = input;
  // Headers at line starts
  out = out.replace(/^[ \t]{0,3}#{1,6}[ \t]+/gm, '');
  // Bullets at line starts
  out = out.replace(/^[ \t]{0,3}[-*][ \t]+/gm, '• ');
  // Bold/italic emphasis (handle bold before italic so ** wins)
  out = out.replace(/\*\*([^*\n]+)\*\*/g, '$1');
  out = out.replace(/__([^_\n]+)__/g, '$1');
  out = out.replace(/(^|\s)\*([^*\n]+)\*/g, '$1$2');
  out = out.replace(/(^|\s)_([^_\n]+)_/g, '$1$2');
  // Inline code
  out = out.replace(/`([^`\n]+)`/g, '$1');
  // Fix run-on like "June 30The flight" -> "June 30. The flight"
  out = out.replace(/(\d)([A-Z][a-z])/g, '$1. $2');
  return out;
}
