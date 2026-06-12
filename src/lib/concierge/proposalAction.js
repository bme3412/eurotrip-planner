// Signed one-click proposal actions for concierge emails. Apply/Skip links in
// an hours-alert email carry an HMAC over (tripId, messageId), so deciding a
// proposal from an email needs no session — but the link only works for the
// one proposal it was minted for. Same secret strategy as unsubscribe.js.
// Pure module (node:crypto only) so the token math is testable in plain Node.

import { createHmac, timingSafeEqual } from 'node:crypto';

function secret() {
  return process.env.CONCIERGE_UNSUBSCRIBE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
}

export function makeProposalToken({ tripId, messageId }, key = secret()) {
  if (!tripId || !messageId || !key) return null;
  return createHmac('sha256', key)
    .update(`proposal:${tripId}:${messageId}`)
    .digest('hex')
    .slice(0, 32);
}

export function verifyProposalToken({ tripId, messageId }, token, key = secret()) {
  const expected = makeProposalToken({ tripId, messageId }, key);
  if (!expected || typeof token !== 'string' || token.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
  } catch {
    return false;
  }
}

/**
 * Build the Apply/Skip URL for a proposal email button.
 * @param {'apply'|'skip'} decision
 */
export function proposalActionUrl(
  { tripId, messageId, decision },
  base = process.env.NEXT_PUBLIC_SITE_URL || 'https://eurotrip-planner.vercel.app',
) {
  const token = makeProposalToken({ tripId, messageId });
  if (!token || (decision !== 'apply' && decision !== 'skip')) return null;
  const params = new URLSearchParams({ trip: tripId, message: messageId, decision, token });
  return `${base.replace(/\/$/, '')}/api/concierge/email/proposal?${params.toString()}`;
}
