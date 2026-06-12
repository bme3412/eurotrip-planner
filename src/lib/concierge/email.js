// Evening-Brief email — the hero artifact. Builds a designed HTML email from the
// generated day and sends it via Resend (same API shape as
// infra/handlers/briefingOrchestrator.js). No-ops without RESEND_API_KEY so the
// in-app + push channels are unaffected.

// Explicit extension: scripts/concierge-invite.mjs imports this file under
// plain Node, which doesn't resolve extensionless paths.
import { unsubscribeUrl } from './unsubscribe.js';

const FROM_EMAIL = process.env.FROM_EMAIL || 'Olivier <briefing@eurotrip-planner.com>';

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Designed, inline-styled HTML (email clients need inline CSS). */
export function renderBriefEmail({ day, cityName, unsubscribe = null }) {
  const b = day?.briefs?.eveningBrief || {};
  const scheduleRows = (day?.schedule || [])
    .map(
      (s) => `<tr>
        <td style="padding:6px 12px 6px 0;color:#1e63e9;font-weight:600;font-size:13px;white-space:nowrap;vertical-align:top">${esc(s.time || '')}</td>
        <td style="padding:6px 0;color:#1f2937;font-size:14px">${esc(s.name)}${s.neighborhood ? `<span style="color:#9ca3af"> · ${esc(s.neighborhood)}</span>` : ''}</td>
      </tr>`
    )
    .join('');

  return `<!doctype html>
<html><body style="margin:0;background:#faf8f3;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px">
    <div style="background:#ffffff;border:1px solid #f0e9da;border-radius:20px;overflow:hidden">
      <div style="background:linear-gradient(135deg,#1e63e9,#5b8def);padding:22px 24px;color:#ffffff">
        <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;opacity:.85">Tonight · the night before</div>
        <div style="font-size:22px;font-weight:700;margin-top:4px">Tomorrow in ${esc(cityName || 'your city')}</div>
      </div>
      <div style="padding:24px">
        <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#1f2937">${esc(b.body || '')}</p>
        ${b.delight ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:12px 14px;margin:0 0 16px;color:#92400e;font-size:14px;line-height:1.5">✨ ${esc(b.delight)}</div>` : ''}
        ${day?.departBy ? `<p style="margin:0 0 16px;font-size:14px;color:#374151"><strong>Leave by ${esc(day.departBy)}.</strong>${day.routeNote ? ' ' + esc(day.routeNote) : ''}</p>` : ''}
        ${scheduleRows ? `<div style="border-top:1px solid #f3f4f6;padding-top:16px;margin-top:4px">
          <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#9ca3af;margin-bottom:8px">Your whole day</div>
          <table style="width:100%;border-collapse:collapse">${scheduleRows}</table>
        </div>` : ''}
        ${b.meta ? `<p style="margin:18px 0 0;font-size:13px;color:#6b7280">${esc(b.meta)}</p>` : ''}
        <p style="margin:18px 0 0;font-size:14px;color:#6b7280;font-style:italic">${esc(day?.signoff || 'Sleep easy — Olivier')}</p>
      </div>
    </div>
    <p style="text-align:center;color:#9ca3af;font-size:12px;margin:16px 0 0">
      You're getting this because you turned on Olivier for this trip.${unsubscribe ? ` <a href="${esc(unsubscribe)}" style="color:#9ca3af;text-decoration:underline">Unsubscribe</a>` : ' Reply STOP to pause.'}
    </p>
  </div>
</body></html>`;
}

/** Shared Resend send. Best-effort; no-ops without RESEND_API_KEY. */
async function sendViaResend({ to, subject, html }) {
  if (!to) return { sent: false, skipped: 'no_recipient' };
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { sent: false, skipped: 'no_resend_key' };

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
    });
    if (!res.ok) {
      console.error('[concierge/email] Resend error', res.status, await res.text());
      return { sent: false, skipped: 'send_failed' };
    }
    return { sent: true };
  } catch (err) {
    console.error('[concierge/email] send failed:', err?.message);
    return { sent: false, skipped: 'error' };
  }
}

/**
 * Send the evening-brief email. Best-effort.
 * @returns {Promise<{ sent: boolean, skipped?: string }>}
 */
export async function sendBriefEmail({ to, day, cityName }) {
  return sendViaResend({
    to,
    subject: `Tonight's brief · ${cityName || 'your trip'}`,
    html: renderBriefEmail({ day, cityName, unsubscribe: unsubscribeUrl(to) }),
  });
}

/**
 * Hours-alert email: the heads-up plus — when Olivier attached a fix — the
 * proposal with one-click Apply/Skip buttons (signed links, no session
 * needed). This is the email channel's answer to chat inline buttons.
 */
export function renderHoursAlertEmail({ title, body, proposalSummary = null, applyUrl = null, skipUrl = null, tripUrl = null, unsubscribe = null }) {
  const proposalBlock = proposalSummary && applyUrl && skipUrl
    ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:16px 0 0">
        <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#9ca3af;margin-bottom:6px">Olivier's suggestion</div>
        <p style="margin:0 0 14px;font-size:14px;color:#1f2937;line-height:1.5">${esc(proposalSummary)}</p>
        <a href="${esc(applyUrl)}" style="display:inline-block;background:#1e63e9;color:#ffffff;font-weight:700;font-size:14px;padding:9px 18px;border-radius:999px;text-decoration:none;margin-right:8px">Apply</a>
        <a href="${esc(skipUrl)}" style="display:inline-block;background:#ffffff;color:#374151;font-weight:600;font-size:14px;padding:9px 18px;border-radius:999px;text-decoration:none;border:1px solid #d1d5db">Skip</a>
      </div>`
    : '';

  return `<!doctype html>
<html><body style="margin:0;background:#faf8f3;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px">
    <div style="background:#ffffff;border:1px solid #f0e9da;border-radius:20px;overflow:hidden">
      <div style="background:linear-gradient(135deg,#b45309,#d97706);padding:22px 24px;color:#ffffff">
        <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;opacity:.85">Heads up</div>
        <div style="font-size:22px;font-weight:700;margin-top:4px">${esc(title || 'A change for tomorrow')}</div>
      </div>
      <div style="padding:24px">
        <p style="margin:0;font-size:16px;line-height:1.6;color:#1f2937">${esc(body || '')}</p>
        ${proposalBlock}
        ${tripUrl ? `<p style="margin:18px 0 0"><a href="${esc(tripUrl)}" style="font-size:14px;color:#1e63e9;text-decoration:underline">Open Trip Home</a></p>` : ''}
      </div>
    </div>
    <p style="text-align:center;color:#9ca3af;font-size:12px;margin:16px 0 0">
      You're getting this because you turned on Olivier for this trip.${unsubscribe ? ` <a href="${esc(unsubscribe)}" style="color:#9ca3af;text-decoration:underline">Unsubscribe</a>` : ''}
    </p>
  </div>
</body></html>`;
}

/** Send the hours-alert email. Best-effort. */
export async function sendHoursAlertEmail({ to, title, body, proposalSummary, applyUrl, skipUrl, tripUrl }) {
  return sendViaResend({
    to,
    subject: title || 'Heads up about tomorrow',
    html: renderHoursAlertEmail({
      title,
      body,
      proposalSummary,
      applyUrl,
      skipUrl,
      tripUrl,
      unsubscribe: unsubscribeUrl(to),
    }),
  });
}

/**
 * Notify the operator that someone joined the early-access waitlist. Sent to
 * CONCIERGE_OPERATOR_EMAIL; no-ops without it (or without RESEND_API_KEY).
 */
export async function sendOperatorSignupEmail({ email, source, wantsPush, wantsEmail }) {
  const to = process.env.CONCIERGE_OPERATOR_EMAIL;
  if (!to) return { sent: false, skipped: 'no_operator_email' };
  const channels = [wantsPush && 'push', wantsEmail && 'email'].filter(Boolean).join(' + ') || 'none';
  return sendViaResend({
    to,
    subject: `Waitlist signup · ${email}`,
    html: `<p><strong>${esc(email)}</strong> joined the Olivier waitlist.</p>
<p>Source: ${esc(source || 'unknown')} · Channels: ${esc(channels)}</p>
<p>Invite them with: <code>node --env-file=.env.local scripts/concierge-invite.mjs ${esc(email)}</code></p>`,
  });
}

/** Tell an invitee they're in. Best-effort. */
export async function sendInviteEmail({ to, siteUrl }) {
  const base = siteUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://eurotrip-planner.vercel.app';
  return sendViaResend({
    to,
    subject: 'You’re in — Olivier is ready for your next trip',
    html: `<!doctype html>
<html><body style="margin:0;background:#faf8f3;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px">
    <div style="background:#ffffff;border:1px solid #f0e9da;border-radius:20px;overflow:hidden">
      <div style="background:linear-gradient(135deg,#1e63e9,#5b8def);padding:22px 24px;color:#ffffff">
        <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;opacity:.85">Early access</div>
        <div style="font-size:22px;font-weight:700;margin-top:4px">You&rsquo;re off the waitlist</div>
      </div>
      <div style="padding:24px">
        <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#1f2937">
          Olivier — your travel agent — is on for your account. Plan a trip, open its
          travel-agent page, and turn him on: you&rsquo;ll get an evening brief the night
          before each day, a morning wake-up, and a wind-down, timed to where you are.
        </p>
        <p style="margin:0 0 16px"><a href="${esc(base)}" style="display:inline-block;background:#1e63e9;color:#ffffff;font-weight:700;font-size:14px;padding:10px 20px;border-radius:999px;text-decoration:none">Open EuroTrip</a></p>
        <p style="margin:0;font-size:13px;color:#6b7280">Sign in with this email address — that&rsquo;s how Olivier knows it&rsquo;s you.</p>
      </div>
    </div>
  </div>
</body></html>`,
  });
}
