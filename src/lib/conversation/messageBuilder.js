/**
 * Pure helpers for building Anthropic-ready messages from the client
 * transcript. Extracted from useMessages so they can be unit tested
 * without React.
 */

export const INITIAL_USER_MESSAGE = 'I want to plan a European trip.';

/**
 * Convert a client-side message (role: 'user' | 'assistant' | 'system_event')
 * to an Anthropic-compatible message (role: 'user' | 'assistant').
 */
export function toApiMessage(msg) {
  if (msg.role === 'system_event') {
    return { role: 'user', content: `[user edited the schedule] ${msg.content}` };
  }
  return { role: msg.role, content: msg.content };
}

/**
 * Build the messages array to send to the Anthropic API.
 *
 * Rules:
 *  - Filter out empty-content messages.
 *  - Convert system_event rows to user notes.
 *  - Only seed an "I want to plan a European trip." user message when the
 *    transcript has no user message yet AND no new user content is being
 *    appended. (Seeding on every turn duplicates with the real first user
 *    message and burns input tokens.)
 *  - Merge consecutive same-role messages (Anthropic requires strict
 *    alternation).
 *  - Ensure the first message is role 'user' — fall back to seeding if not.
 *
 * @param {Array<{role: string, content: string}>} transcript
 * @param {string} [userContent] pending new user message to append
 * @returns {Array<{role: 'user' | 'assistant', content: string}>}
 */
export function buildApiMessages(transcript, userContent) {
  const currentMessages = (transcript || [])
    .filter((m) => m && m.content)
    .map(toApiMessage);

  const hasExistingUser = currentMessages.some((m) => m.role === 'user');
  const hasAppendedUser = !!userContent;
  const needsSeed = !hasExistingUser && !hasAppendedUser;

  const rawApiMessages = [
    ...(needsSeed ? [{ role: 'user', content: INITIAL_USER_MESSAGE }] : []),
    ...currentMessages,
    ...(userContent ? [{ role: 'user', content: userContent }] : []),
  ];

  // Merge consecutive same-role
  const apiMessages = [];
  for (const msg of rawApiMessages) {
    const prev = apiMessages[apiMessages.length - 1];
    if (prev && prev.role === msg.role) {
      prev.content += '\n' + msg.content;
    } else {
      apiMessages.push({ ...msg });
    }
  }

  if (apiMessages.length === 0 || apiMessages[0].role !== 'user') {
    apiMessages.unshift({ role: 'user', content: INITIAL_USER_MESSAGE });
  }

  return apiMessages;
}
