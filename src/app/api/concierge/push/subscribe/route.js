import { NextResponse } from 'next/server';
import { getRequesterFromAuthHeader } from '@/lib/supabase/requestAuth';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * POST /api/concierge/push/subscribe   body: { subscription: PushSubscription }
 * Stores (or refreshes) a Web Push subscription for the signed-in user.
 *
 * DELETE /api/concierge/push/subscribe  body: { endpoint }
 * Removes one subscription (e.g. on disable / unsubscribe).
 */
export async function POST(request) {
  const { requester, response } = await getRequesterFromAuthHeader(request);
  if (response) return response;

  let body = {};
  try { body = await request.json(); } catch { /* */ }
  const sub = body?.subscription;
  const endpoint = sub?.endpoint;
  const p256dh = sub?.keys?.p256dh;
  const auth = sub?.keys?.auth;
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
  }

  const supabase = await getSupabaseAdmin();
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: requester.userId,
      user_email: requester.userEmail,
      endpoint,
      p256dh,
      auth,
      platform: 'web',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint' }
  );
  if (error) {
    console.error('[push/subscribe] upsert failed:', error.message);
    return NextResponse.json({ error: 'Could not save subscription' }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request) {
  const { requester, response } = await getRequesterFromAuthHeader(request);
  if (response) return response;

  let body = {};
  try { body = await request.json(); } catch { /* */ }
  const endpoint = body?.endpoint;
  if (!endpoint) return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 });

  const supabase = await getSupabaseAdmin();
  await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint)
    .eq('user_id', requester.userId);
  return NextResponse.json({ ok: true });
}
