/**
 * Soft-gate "pending save" markers.
 *
 * When a guest saves something we keep the item locally AND prompt sign-in. The
 * sign-in is a full OAuth redirect, so in-memory intent is lost; we persist a
 * single pending marker per type in localStorage. Writing a new marker overwrites
 * the previous one — there is at most ONE pending item per type, which keeps the
 * duplicate surface minimal. The marker is a UX signal (which confirmation to
 * show after redirect); the actual data is migrated by the per-type migrations.
 */

const PENDING_KEYS = {
  trip: 'pendingSave.trip',
  city: 'pendingSave.city',
  attraction: 'pendingSave.attraction',
};

export const PENDING_SAVE_TYPES = Object.keys(PENDING_KEYS);

function getStorage() {
  if (typeof window === 'undefined') return null;
  try { return window.localStorage; } catch { return null; }
}

export function setPending(type, payload = {}) {
  const key = PENDING_KEYS[type];
  const storage = getStorage();
  if (!key || !storage) return;
  try {
    storage.setItem(key, JSON.stringify({ ...payload, at: new Date().toISOString() }));
  } catch {
    // fail quietly
  }
}

export function getPending(type) {
  const key = PENDING_KEYS[type];
  const storage = getStorage();
  if (!key || !storage) return null;
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearPending(type) {
  const key = PENDING_KEYS[type];
  const storage = getStorage();
  if (!key || !storage) return;
  try {
    storage.removeItem(key);
  } catch {
    // fail quietly
  }
}

export function hasAnyPending() {
  return PENDING_SAVE_TYPES.some((t) => getPending(t));
}
