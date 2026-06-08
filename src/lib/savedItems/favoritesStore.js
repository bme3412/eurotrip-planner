/**
 * Pure helpers for the "favorites" (per-city saved experiences) store.
 *
 * Kept React-free so the toggle / id-extraction / merge algebra can be
 * unit-tested with node:test. The actual storage I/O (Supabase /
 * localStorage) lives in the useFavorites hook.
 */

/** Default id extractor — matches the shape AttractionsList has always used. */
export function defaultIdOf(item) {
  if (!item) return null;
  return item.name || item.activity || item.title || null;
}

/**
 * Build an id extractor with a custom precedence (e.g. CityOverview prefers
 * `activity` over `name` because its data comes from "things to do" JSON).
 */
export function makeIdOf(precedence) {
  if (!Array.isArray(precedence) || precedence.length === 0) return defaultIdOf;
  return (item) => {
    if (!item) return null;
    for (const key of precedence) {
      if (item[key]) return item[key];
    }
    return null;
  };
}

/** True when `item` is already in `list` under the supplied id extractor. */
export function isFavorited(list, item, idOf = defaultIdOf) {
  const id = idOf(item);
  if (!id) return false;
  return list.some((f) => idOf(f) === id);
}

/**
 * Pure toggle reducer. Returns the next favorites array AND the action that
 * was taken so the hook layer knows what storage write to perform.
 *
 * Result shape: { next, action: 'added' | 'removed', id }
 * If the item has no extractable id, action is 'noop' and next === list.
 */
export function toggleFavorite(list, item, idOf = defaultIdOf) {
  const id = idOf(item);
  if (!id) return { next: list, action: 'noop', id: null };

  const existingIdx = list.findIndex((f) => idOf(f) === id);
  if (existingIdx >= 0) {
    const next = list.slice();
    next.splice(existingIdx, 1);
    return { next, action: 'removed', id };
  }
  return { next: [...list, item], action: 'added', id };
}

/**
 * Transform a Supabase `saved_experiences` row into the in-memory favorite
 * shape that the UI consumes.
 */
export function fromSupabaseRow(row) {
  if (!row) return null;
  return {
    name: row.experience_name,
    category: row.category,
    subcategory: row.subcategory,
    description: row.description,
    ...(row.experience_data || {}),
  };
}

/** Build the Supabase insert payload for `saved_experiences`. */
export function toSupabaseInsert({ userId, cityName, item, id }) {
  return {
    user_id: userId,
    city_name: cityName,
    experience_name: id,
    category: item.category || null,
    subcategory: item.subcategory || null,
    description: item.description || item.shortDescription || null,
    image: item.image || null,
    location: item.location || item.neighborhood || null,
    duration: item.duration || null,
    price_level: item.priceLevel || item.cost || null,
    rating: item.rating || null,
    tags: item.tags || item.themes || null,
    experience_data: item,
  };
}

/** localStorage key used for guest / offline favorites. */
export function favoritesStorageKey(cityName) {
  return `favorites-${cityName}`;
}

/**
 * Safely read favorites for a city from localStorage. Returns [] when the
 * key is missing, the JSON is malformed, or we're running on the server.
 */
export function readLocalFavorites(cityName, storage) {
  if (!storage) return [];
  try {
    const raw = storage.getItem(favoritesStorageKey(cityName));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeLocalFavorites(cityName, list, storage) {
  if (!storage) return;
  try {
    storage.setItem(favoritesStorageKey(cityName), JSON.stringify(list));
  } catch {
    // Quota exceeded or storage unavailable — fail quietly; the in-memory
    // state still reflects the change for this session.
  }
}

const FAVORITES_KEY_PREFIX = 'favorites-';

/**
 * Read every per-city favorites bucket from storage. Favorites are stored under
 * `favorites-{city}` keys (one per city), so the collection view and the
 * sign-in migration both need to scan all of them.
 *
 * @returns {Array<{ cityName: string, items: any[] }>}
 */
export function readAllLocalFavorites(storage) {
  if (!storage) return [];
  const out = [];
  try {
    const len = storage.length || 0;
    for (let i = 0; i < len; i += 1) {
      const key = storage.key(i);
      if (!key || !key.startsWith(FAVORITES_KEY_PREFIX)) continue;
      const cityName = key.slice(FAVORITES_KEY_PREFIX.length);
      const items = readLocalFavorites(cityName, storage);
      if (items.length > 0) out.push({ cityName, items });
    }
  } catch {
    return out;
  }
  return out;
}

/** Remove a single city's favorites bucket (after migration). */
export function clearLocalFavorites(cityName, storage) {
  if (!storage) return;
  try {
    storage.removeItem(favoritesStorageKey(cityName));
  } catch {
    // fail quietly
  }
}
