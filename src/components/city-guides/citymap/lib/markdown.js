/**
 * Strip common markdown emphasis markers so popup HTML doesn't show asterisks
 * or underscores. Pure function.
 */
export function stripMarkdown(text) {
  if (!text) return '';
  return String(text)
    .replace(/\*\*(.*?)\*\*/g, '$1') // **bold**
    .replace(/\*(.*?)\*/g, '$1') //   *italic*
    .replace(/__(.*?)__/g, '$1') //   __bold__
    .replace(/_(.*?)_/g, '$1') //     _italic_
    .replace(/`(.*?)`/g, '$1'); //    `code`
}
