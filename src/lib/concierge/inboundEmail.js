// Pure helpers for the inbound-email channel (Resend Inbound → agent turn).
// No fetch, no Supabase — testable in plain Node.

import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Verify a Svix webhook signature (Resend delivers webhooks via Svix).
 * signedContent = `${id}.${timestamp}.${payload}`, HMAC-SHA256 with the
 * base64-decoded secret (after the `whsec_` prefix), base64 output. The
 * `svix-signature` header may hold several space-separated `v1,<sig>` entries.
 */
export function verifySvixSignature({
  id,
  timestamp,
  signature,
  payload,
  secret,
  toleranceSec = 300,
  nowMs = Date.now,
}) {
  if (!id || !timestamp || !signature || !payload || !secret) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(nowMs() / 1000 - ts) > toleranceSec) return false;

  let key;
  try {
    key = Buffer.from(secret.startsWith('whsec_') ? secret.slice(6) : secret, 'base64');
  } catch {
    return false;
  }
  const expected = createHmac('sha256', key).update(`${id}.${timestamp}.${payload}`).digest('base64');

  return String(signature)
    .split(' ')
    .some((part) => {
      const [version, sig] = part.split(',');
      if (version !== 'v1' || !sig) return false;
      try {
        return timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
      } catch {
        return false;
      }
    });
}

/** Extract the bare address from "Name <a@b.com>" / "a@b.com". */
export function parseEmailAddress(raw) {
  if (typeof raw !== 'string') return null;
  const angled = raw.match(/<([^<>\s]+@[^<>\s]+)>/);
  const bare = angled?.[1] || raw.trim();
  const m = bare.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  return m ? bare.toLowerCase() : null;
}

const QUOTE_MARKERS = [
  /^On .{4,200} wrote:\s*$/,
  /^-{2,}\s*Original Message\s*-{0,}/i,
  /^-{2,}\s*Forwarded message\s*-{0,}/i,
  /^From:\s.+$/,
  /^Sent from my /i,
  /^_{10,}\s*$/,
];

/**
 * Keep only the freshly-typed part of an email reply: cut at the first
 * quote marker or quoted (`>`) block, drop a trailing `--` signature.
 */
export function stripQuotedReply(text) {
  if (typeof text !== 'string') return '';
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const kept = [];
  for (const line of lines) {
    if (line.startsWith('>')) break;
    if (QUOTE_MARKERS.some((re) => re.test(line.trim()))) break;
    if (line.trim() === '--') break;
    kept.push(line);
  }
  return kept.join('\n').trim();
}

/** Very small fallback when an email arrives with html but no text part. */
export function htmlToText(html) {
  if (typeof html !== 'string') return '';
  return html
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Re: subject for the agent's reply, without stacking Re: Re: Re:. */
export function replySubject(subject) {
  const s = typeof subject === 'string' ? subject.trim() : '';
  if (!s) return 'From Olivier';
  return /^re:/i.test(s) ? s : `Re: ${s}`;
}
