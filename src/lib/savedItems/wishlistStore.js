/**
 * Pure helpers for the "wishlist" (saved cities / saved_trips) store.
 *
 * Kept React-free so the toggle algebra and shape conversions can be unit
 * tested independently of Supabase / localStorage I/O.
 */

export const WISHLIST_STORAGE_KEY = 'savedTrips';
export const WISHLIST_MIGRATION_KEY = 'eurotrip.wishlist.migratedFor';

/** True when `cityName` is present in `list`. Case-sensitive. */
export function isWishlisted(list, cityName) {
  if (!cityName) return false;
  return list.some((t) => t.cityName === cityName);
}

/**
 * Build a local-storage record for a newly-saved city.
 */
export function buildLocalWishlistEntry({ cityName, cityData, savedAt }) {
  return {
    cityName,
    displayName: cityData?.displayName || cityName,
    country: cityData?.country || 'Unknown',
    savedAt: savedAt || new Date().toISOString(),
    image: cityData?.heroImage || null,
    description: cityData?.overview?.introduction || null,
  };
}

/**
 * Pure toggle. Returns the next list and the action taken so the hook layer
 * knows whether to call insert or delete on Supabase.
 *
 * Result shape: { next, action: 'added' | 'removed' }
 */
export function toggleWishlist(list, { cityName, cityData }) {
  if (!cityName) return { next: list, action: 'noop' };

  const existingIdx = list.findIndex((t) => t.cityName === cityName);
  if (existingIdx >= 0) {
    const next = list.slice();
    next.splice(existingIdx, 1);
    return { next, action: 'removed' };
  }
  return {
    next: [...list, buildLocalWishlistEntry({ cityName, cityData })],
    action: 'added',
  };
}

/** Build the Supabase insert payload for `saved_trips`. */
export function toSupabaseInsert({ userId, cityName, cityData }) {
  return {
    user_id: userId,
    city_name: cityName,
    display_name: cityData?.displayName || cityName,
    country: cityData?.country || 'Unknown',
    image: cityData?.heroImage || null,
    description: cityData?.overview?.introduction || null,
  };
}

/**
 * Map a Supabase `saved_trips` row into the legacy UI shape.
 */
export function fromSupabaseRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    cityName: row.city_name,
    displayName: row.display_name,
    country: row.country,
    image: row.image,
    description: row.description,
    savedAt: row.created_at,
  };
}

export function readLocalWishlist(storage) {
  if (!storage) return [];
  try {
    const raw = storage.getItem(WISHLIST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeLocalWishlist(list, storage) {
  if (!storage) return;
  try {
    storage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Fail quietly.
  }
}

/** Whether we've already migrated the local wishlist into Supabase for this user. */
export function wasMigratedFor(userId, storage) {
  if (!storage || !userId) return false;
  try {
    return storage.getItem(WISHLIST_MIGRATION_KEY) === userId;
  } catch {
    return false;
  }
}

/** Mark the local wishlist as migrated for `userId` so we don't repeat the work. */
export function markMigratedFor(userId, storage) {
  if (!storage || !userId) return;
  try {
    storage.setItem(WISHLIST_MIGRATION_KEY, userId);
  } catch {
    // Fail quietly.
  }
}

/** Drop the local wishlist after a successful migration to the server. */
export function clearLocalWishlist(storage) {
  if (!storage) return;
  try {
    storage.removeItem(WISHLIST_STORAGE_KEY);
  } catch {
    // Fail quietly.
  }
}
