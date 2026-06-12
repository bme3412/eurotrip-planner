import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { listTripsForUser } from '@/lib/trips/tripsRepository';
import { runAgentTurn } from '@/lib/concierge/agentRuntime';
import { isInvited } from '@/lib/concierge/invites';
import { sendAgentReplyEmail } from '@/lib/concierge/email';
import { proposalActionUrl } from '@/lib/concierge/proposalAction';
import {
  verifySvixSignature,
  parseEmailAddress,
  stripQuotedReply,
  htmlToText,
  replySubject,
} from '@/lib/concierge/inboundEmail';

export const runtime = 'nodejs';
// Agent turns run inline (~5–25s); Svix waits before retrying.
export const maxDuration = 60;

/** The trip Olivier answers for: active today, else the most recent.
 *  (Same resolution as the Telegram webhook.) */
async function resolveTrip({ userId, userEmail }) {
  const trips = await listTripsForUser({ userId, userEmail });
  if (!trips.length) return null;
  const today = new Date().toISOString().slice(0, 10);
  const active = trips.find(
    (t) => t.status === 'active' && (!t.start_date || t.start_date <= today) && (!t.end_date || t.end_date >= today),
  );
  return active || trips[0];
}

/** Svix retries on slow/failed deliveries — drop emails we already hold. */
async function alreadyHandled(supabase, emailId) {
  if (!emailId) return false;
  const { data } = await supabase
    .from('concierge_messages')
    .select('id')
    .eq('meta->>inbound_email_id', String(emailId))
    .limit(1);
  return !!data?.length;
}

/**
 * POST /api/concierge/email/inbound — Resend Inbound webhook.
 *
 * Replying to any Olivier email lands here (outbound mail carries
 * Reply-To: CONCIERGE_INBOUND_EMAIL). Flow: verify the Svix signature →
 * fail-closed invite gate on the sender → resolve their user + active trip →
 * one agent turn → reply by email (with Apply/Skip links when the turn
 * produced a proposal).
 *
 * Always answers 2xx for handled-but-ignored mail (unknown sender, empty
 * body) so Svix doesn't retry spam back at us.
 */
export async function POST(request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'unconfigured' }, { status: 503 });
  }

  const payload = await request.text();
  const verified = verifySvixSignature({
    id: request.headers.get('svix-id'),
    timestamp: request.headers.get('svix-timestamp'),
    signature: request.headers.get('svix-signature'),
    payload,
    secret,
  });
  if (!verified) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let event = {};
  try {
    event = JSON.parse(payload);
  } catch {
    return NextResponse.json({ ok: true, ignored: 'bad_json' });
  }
  if (event.type !== 'email.received' || !event.data) {
    return NextResponse.json({ ok: true, ignored: 'not_inbound' });
  }

  const data = event.data;
  const sender = parseEmailAddress(data.from);
  if (!sender) return NextResponse.json({ ok: true, ignored: 'no_sender' });

  const supabase = await getSupabaseAdmin();

  // Fail-closed invite gate — same posture as every other send path. Gating
  // BEFORE the body fetch means spam never costs a Resend API call.
  if (!(await isInvited({ supabase, email: sender }))) {
    console.warn('[email/inbound] uninvited sender ignored');
    return NextResponse.json({ ok: true, ignored: 'not_invited' });
  }

  const { data: prefs } = await supabase
    .from('concierge_preferences')
    .select('user_id, user_email')
    .eq('user_email', sender)
    .maybeSingle();
  if (!prefs?.user_id) {
    return NextResponse.json({ ok: true, ignored: 'no_account' });
  }

  const emailId = data.email_id || request.headers.get('svix-id');
  if (await alreadyHandled(supabase, emailId)) {
    return NextResponse.json({ ok: true, ignored: 'duplicate' });
  }

  // The email.received webhook carries METADATA ONLY — the body must be
  // fetched from the Received Emails API. (data.text/html kept as a
  // future-proof fast path should Resend ever inline them.)
  let bodyText = typeof data.text === 'string' ? data.text : null;
  let bodyHtml = typeof data.html === 'string' ? data.html : null;
  if (!bodyText && !bodyHtml && data.email_id && process.env.RESEND_API_KEY) {
    try {
      const res = await fetch(`https://api.resend.com/emails/receiving/${data.email_id}`, {
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      });
      if (res.ok) {
        const full = await res.json();
        bodyText = typeof full.text === 'string' ? full.text : null;
        bodyHtml = typeof full.html === 'string' ? full.html : null;
      } else {
        console.error('[email/inbound] body fetch failed:', res.status);
      }
    } catch (err) {
      console.error('[email/inbound] body fetch error:', err?.message);
    }
  }

  const rawText = bodyText && bodyText.trim() ? bodyText : htmlToText(bodyHtml);
  const message = stripQuotedReply(rawText).slice(0, 1500);
  if (!message) return NextResponse.json({ ok: true, ignored: 'empty' });

  const trip = await resolveTrip({ userId: prefs.user_id, userEmail: prefs.user_email || sender });
  if (!trip) {
    await sendAgentReplyEmail({
      to: sender,
      subject: replySubject(data.subject),
      text: 'No trips on file yet — plan one on EuroTrip and I’ll take it from there.',
    });
    return NextResponse.json({ ok: true, ignored: 'no_trip' });
  }

  const result = await runAgentTurn({
    supabase,
    trip,
    userId: prefs.user_id,
    userEmail: prefs.user_email || sender,
    message,
    channel: 'email',
    userMeta: { inbound_email_id: String(emailId || '') },
  });

  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://eurotrip-planner.vercel.app').replace(/\/$/, '');
  if (result.error) {
    await sendAgentReplyEmail({
      to: sender,
      subject: replySubject(data.subject),
      text: 'I’m having trouble right now — try me again in a moment, or open Trip Home.',
      tripUrl: `${base}/trips/${trip.id}/today`,
    });
    return NextResponse.json({ ok: true, error: result.error });
  }

  const canAct = result.proposal && result.messageId;
  await sendAgentReplyEmail({
    to: sender,
    subject: replySubject(data.subject),
    text: result.text,
    proposalSummary: canAct ? result.proposal.diff || null : null,
    applyUrl: canAct ? proposalActionUrl({ tripId: trip.id, messageId: result.messageId, decision: 'apply' }) : null,
    skipUrl: canAct ? proposalActionUrl({ tripId: trip.id, messageId: result.messageId, decision: 'skip' }) : null,
    tripUrl: `${base}/trips/${trip.id}/today`,
  });

  return NextResponse.json({ ok: true });
}
