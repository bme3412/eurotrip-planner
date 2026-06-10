// Signed one-click unsubscribe for concierge emails. The link in every brief
// carries an HMAC of the recipient address, so flipping email_enabled needs no
// session — but nobody can unsubscribe someone else. Pure module (node:crypto
// only) so the token math is testable in plain Node.

import { createHmac, timingSafeEqual } from 'node:crypto';

function secret() {
  // Dedicated secret when set; the service-role key otherwise so the flow
  // works without new env. Rotating either invalidates old links — acceptable,
  // every email carries a fresh one.
  return process.env.CONCIERGE_UNSUBSCRIBE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
}

export function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

export function makeUnsubscribeToken(email, key = secret()) {
  const normalized = normalizeEmail(email);
  if (!normalized || !key) return null;
  return createHmac('sha256', key).update(`unsubscribe:${normalized}`).digest('hex').slice(0, 32);
}

export function verifyUnsubscribeToken(email, token, key = secret()) {
  const expected = makeUnsubscribeToken(email, key);
  if (!expected || typeof token !== 'string' || token.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
  } catch {
    return false;
  }
}

export function unsubscribeUrl(email, base = process.env.NEXT_PUBLIC_SITE_URL || 'https://eurotrip-planner.vercel.app') {
  const normalized = normalizeEmail(email);
  const token = makeUnsubscribeToken(normalized);
  if (!token) return null;
  const params = new URLSearchParams({ email: normalized, token });
  return `${base.replace(/\/$/, '')}/api/concierge/email/unsubscribe?${params.toString()}`;
}
