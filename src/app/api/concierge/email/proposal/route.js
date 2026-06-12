import { getSupabaseAdmin } from '@/lib/supabase/server';
import { getTripWithDetails } from '@/lib/trips/tripsRepository';
import { verifyProposalToken } from '@/lib/concierge/proposalAction';
import { decideProposal } from '@/lib/concierge/proposalDecision';

export const runtime = 'nodejs';
export const maxDuration = 60;

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function page(title, body, status = 200, tripId = null) {
  const tripLink = tripId
    ? `<p style="margin:20px 0 0"><a href="/trips/${esc(tripId)}/today" style="display:inline-block;background:#1e63e9;color:#fff;font-weight:700;font-size:14px;padding:10px 20px;border-radius:999px;text-decoration:none">Open Trip Home</a></p>`
    : '';
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;background:#faf8f3;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <div style="max-width:480px;margin:80px auto;padding:32px;background:#fff;border:1px solid #f0e9da;border-radius:20px;text-align:center">
    <h1 style="font-size:20px;color:#1f2937;margin:0 0 12px">${esc(title)}</h1>
    <p style="font-size:15px;color:#6b7280;line-height:1.6;margin:0">${esc(body)}</p>
    ${tripLink}
  </div>
</body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}

/**
 * GET /api/concierge/email/proposal?trip=…&message=…&decision=apply|skip&token=…
 *
 * One-click Apply/Skip from an hours-alert email. The HMAC token (minted at
 * send time over tripId+messageId) is the authorization; the acting identity
 * is the trip's owner read from the trip row — never from the request.
 * decideProposal re-validates against a fresh trip read and is idempotent on
 * already-decided proposals, so clicking twice (or both links) is safe.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const tripId = searchParams.get('trip');
  const messageId = searchParams.get('message');
  const decision = searchParams.get('decision');
  const token = searchParams.get('token');

  if (!tripId || !messageId || (decision !== 'apply' && decision !== 'skip')) {
    return page('That link didn’t work', 'The link is malformed — open Trip Home to act on the suggestion there.', 400);
  }
  if (!verifyProposalToken({ tripId, messageId }, token)) {
    return page('That link didn’t work', 'The link is invalid or has been rotated. Open Trip Home to act on the suggestion there.', 400);
  }

  const trip = await getTripWithDetails(tripId);
  if (!trip || (!trip.user_id && !trip.user_email)) {
    return page('Trip not found', 'This trip no longer exists.', 404);
  }

  try {
    const supabase = await getSupabaseAdmin();
    const result = await decideProposal(supabase, {
      tripId,
      userId: trip.user_id,
      userEmail: trip.user_email,
      messageId,
      decision,
    });

    if (!result.ok) {
      return page('Couldn’t do that', result.error || 'The suggestion may have expired.', 409, tripId);
    }
    if (decision === 'skip') {
      return page('Skipped', 'Left your day as it was. Olivier won’t bring this one up again.', 200, tripId);
    }
    return page(
      'Applied',
      result.summary ? `Done — ${result.summary}` : 'Done — your itinerary has been updated.',
      200,
      tripId,
    );
  } catch (err) {
    console.error('[concierge/email-proposal] failed:', err?.message);
    return page('Something went wrong', 'We couldn’t update the trip — try again from Trip Home.', 502, tripId);
  }
}
