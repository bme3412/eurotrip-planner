// Evening-Brief email — the hero artifact. Builds a designed HTML email from the
// generated day and sends it via Resend (same API shape as
// infra/handlers/briefingOrchestrator.js). No-ops without RESEND_API_KEY so the
// in-app + push channels are unaffected.

const FROM_EMAIL = process.env.FROM_EMAIL || 'Olivier <briefing@eurotrip-planner.com>';

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Designed, inline-styled HTML (email clients need inline CSS). */
export function renderBriefEmail({ day, cityName }) {
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
      You're getting this because you turned on Olivier for this trip. Reply STOP to pause.
    </p>
  </div>
</body></html>`;
}

/**
 * Send the evening-brief email. Best-effort.
 * @returns {Promise<{ sent: boolean, skipped?: string }>}
 */
export async function sendBriefEmail({ to, day, cityName }) {
  if (!to) return { sent: false, skipped: 'no_recipient' };
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { sent: false, skipped: 'no_resend_key' };

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject: `Tonight's brief · ${cityName || 'your trip'}`,
        html: renderBriefEmail({ day, cityName }),
      }),
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
