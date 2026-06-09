import webpush from 'web-push';
import { getSupabaseAdmin } from '@/lib/supabase/server';

// Web Push delivery. Best-effort: sends to all of a user's subscriptions and
// prunes dead ones (404/410). No-ops gracefully when VAPID keys aren't configured,
// so the in-app notification (the durable channel) is unaffected.

let configured = false;
function ensureConfigured() {
  if (configured) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:concierge@eurotrip-planner.com', pub, priv);
  configured = true;
  return true;
}

/**
 * Push a notification to every device a user has subscribed.
 * @returns {Promise<{ sent: number, pruned: number, skipped?: string }>}
 */
export async function pushToUser(userId, { title, body, url }) {
  if (!userId) return { sent: 0, pruned: 0, skipped: 'no_user' };
  if (!ensureConfigured()) return { sent: 0, pruned: 0, skipped: 'no_vapid' };

  const supabase = await getSupabaseAdmin();
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId);
  if (!subs?.length) return { sent: 0, pruned: 0, skipped: 'no_subs' };

  const payload = JSON.stringify({ title, body, url });
  let sent = 0;
  const dead = [];
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload
        );
        sent += 1;
      } catch (err) {
        const code = err?.statusCode;
        if (code === 404 || code === 410) dead.push(s.endpoint); // gone — prune
        else console.error('[webpush] send failed:', code, err?.message);
      }
    })
  );

  if (dead.length) {
    await supabase.from('push_subscriptions').delete().in('endpoint', dead);
  }
  return { sent, pruned: dead.length };
}
