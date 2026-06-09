// Browser helpers to subscribe this device to Web Push. Used by ConciergeOptIn.

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) arr[i] = raw.charCodeAt(i);
  return arr;
}

/** True if this browser can do Web Push at all. */
export function pushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Register the SW, request permission, subscribe, and persist the subscription.
 * @returns {Promise<{ ok: boolean, reason: string }>}
 */
export async function subscribeToPush(authHeaders) {
  if (!pushSupported()) return { ok: false, reason: 'unsupported' };
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key) return { ok: false, reason: 'no_key' };

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { ok: false, reason: 'denied' };

  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
    }
    const res = await fetch('/api/concierge/push/subscribe', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ subscription: sub }),
    });
    return { ok: res.ok, reason: res.ok ? 'subscribed' : 'save_failed' };
  } catch (err) {
    console.error('[push] subscribe failed', err);
    return { ok: false, reason: 'error' };
  }
}
