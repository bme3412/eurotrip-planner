/**
 * One-shot migration of a guest's local wishlist into Supabase's `saved_trips`
 * table on first sign-in. Delegates the insert/dedupe mechanics to the shared
 * saved-items engine (createSavedCollection) so every collection migrates the
 * same idempotent way.
 *
 * Kept React-free so it can be unit-tested with a stub supabase client.
 */

import { toSupabaseInsert } from './wishlistStore';
import { migrateRows } from './createSavedCollection';

/**
 * Push `localList` into saved_trips for `userId`, deduped against rows the
 * user already has on the server.
 *
 * @returns {Promise<{ inserted: number, skipped: number, error: any }>}
 */
export async function migrateLocalToSupabase({ supabase, userId, localList }) {
  if (!Array.isArray(localList) || localList.length === 0) {
    return { inserted: 0, skipped: 0, error: null };
  }

  const rows = localList
    .filter((t) => t && t.cityName)
    .map((t) =>
      toSupabaseInsert({
        userId,
        cityName: t.cityName,
        cityData: {
          displayName: t.displayName,
          country: t.country,
          heroImage: t.image,
          overview: { introduction: t.description },
        },
      }),
    );

  return migrateRows({
    supabase,
    table: 'saved_trips',
    userId,
    rows,
    keyColumns: ['city_name'],
    keyOf: (r) => r.city_name,
  });
}
