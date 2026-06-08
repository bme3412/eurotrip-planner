/**
 * One-shot migration of a guest's local saved attractions into Supabase's
 * `saved_experiences` table on first sign-in.
 *
 * Attractions were the one collection without a migration path: guests who
 * saved experiences then signed in silently lost them. Unlike the wishlist,
 * favorites are stored per-city (`favorites-{city}`), so this scans every
 * bucket. Delegates the insert/dedupe mechanics to the shared engine.
 *
 * Kept React-free so it can be unit-tested with a stub supabase client.
 */

import { toSupabaseInsert, defaultIdOf, readAllLocalFavorites, clearLocalFavorites } from './favoritesStore';
import { migrateRows } from './createSavedCollection';

export const FAVORITES_MIGRATION_KEY = 'eurotrip.favorites.migratedFor';

/**
 * Push every local per-city favorites bucket into saved_experiences for
 * `userId`, deduped against rows the user already has on the server.
 *
 * @returns {Promise<{ inserted: number, skipped: number, error: any }>}
 */
export async function migrateAllFavoritesToSupabase({ supabase, userId, storage }) {
  const perCity = readAllLocalFavorites(storage);
  if (perCity.length === 0) return { inserted: 0, skipped: 0, error: null };

  const rows = [];
  for (const { cityName, items } of perCity) {
    for (const item of items) {
      const id = defaultIdOf(item);
      if (!id) continue;
      rows.push(toSupabaseInsert({ userId, cityName, item, id }));
    }
  }

  const result = await migrateRows({
    supabase,
    table: 'saved_experiences',
    userId,
    rows,
    keyColumns: ['city_name', 'experience_name'],
    keyOf: (r) => (r.city_name && r.experience_name ? `${r.city_name}::${r.experience_name}` : null),
  });

  // Only clear local buckets once they're safely on the server.
  if (!result.error && storage) {
    for (const { cityName } of perCity) clearLocalFavorites(cityName, storage);
  }

  return result;
}
