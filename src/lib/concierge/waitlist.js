// Validation/normalization for early-access waitlist signups. Pure module so
// the logic is testable in plain Node (the route itself imports next/server
// and can't be).

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SOURCES = new Set(['home', 'concierge-preview']);
const MAX_EMAIL_LENGTH = 254;

/**
 * Normalize a raw signup body into an upsert-ready record.
 * @param {object} body - { email, channels?: {push, email}, source? }
 * @returns {{ error: string } | { record: { email, wants_push, wants_email, source } }}
 */
export function normalizeWaitlistSignup(body = {}) {
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email || email.length > MAX_EMAIL_LENGTH || !EMAIL_RE.test(email)) {
    return { error: 'Enter a valid email address.' };
  }

  // Channel toggles default to true; turning BOTH off still means "on the
  // list" — they asked to join, channels are a preference, not consent.
  const channels = body?.channels && typeof body.channels === 'object' ? body.channels : {};
  const wantsPush = channels.push !== false;
  const wantsEmail = channels.email !== false;

  const source = SOURCES.has(body?.source) ? body.source : 'home';

  return { record: { email, wants_push: wantsPush, wants_email: wantsEmail, source } };
}
