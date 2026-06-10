import { getSupabaseAdmin } from '@/lib/supabase/server';
import { verifyUnsubscribeToken, normalizeEmail } from '@/lib/concierge/unsubscribe';

export const runtime = 'nodejs';

function page(title, body, status = 200) {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title></head>
<body style="margin:0;background:#faf8f3;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <div style="max-width:480px;margin:80px auto;padding:32px;background:#fff;border:1px solid #f0e9da;border-radius:20px;text-align:center">
    <h1 style="font-size:20px;color:#1f2937;margin:0 0 12px">${title}</h1>
    <p style="font-size:15px;color:#6b7280;line-height:1.6;margin:0">${body}</p>
  </div>
</body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

/**
 * GET /api/concierge/email/unsubscribe?email=…&token=…
 * One-click unsubscribe from brief emails (link in every email footer). Flips
 * concierge_preferences.email_enabled off; in-app and push are untouched.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const email = normalizeEmail(searchParams.get('email'));
  const token = searchParams.get('token');

  if (!email || !verifyUnsubscribeToken(email, token)) {
    return page('That link didn’t work', 'The unsubscribe link is invalid or expired. You can also turn off email from your trip’s travel-agent page.', 400);
  }

  try {
    const supabase = await getSupabaseAdmin();
    const { error } = await supabase
      .from('concierge_preferences')
      .update({ email_enabled: false, updated_at: new Date().toISOString() })
      .eq('user_email', email);
    if (error) throw error;
  } catch (err) {
    console.error('[concierge/unsubscribe] update failed:', err?.message);
    return page('Something went wrong', 'We couldn’t update your preferences — try again in a moment.', 502);
  }

  return page('You’re unsubscribed', 'No more brief emails. Olivier still keeps your in-app inbox up to date, and you can turn email back on anytime from your trip’s travel-agent page.');
}
