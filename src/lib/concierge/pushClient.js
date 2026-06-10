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

/** iOS device, including iPadOS Safari masquerading as a Mac. */
export function isIos() {
  if (typeof navigator === 'undefined') return false;
  if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) return true;
  return /Macintosh/i.test(navigator.userAgent) && (navigator.maxTouchPoints || 0) > 1;
}

/** Running as an installed PWA (launched from the home screen). */
export function isStandalone() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)')?.matches || navigator.standalone === true;
}

/**
 * Why push isn't available here, when it isn't. iOS only exposes Web Push to
 * installed PWAs (16.4+), so Safari-in-a-tab is an install problem, not a
 * support problem.
 * @returns {'ok' | 'needs_install_ios' | 'unsupported'}
 */
export function pushAvailability() {
  if (pushSupported()) return 'ok';
  if (isIos() && !isStandalone()) return 'needs_install_ios';
  return 'unsupported';
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
