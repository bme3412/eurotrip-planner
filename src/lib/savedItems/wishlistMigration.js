/**
 * One-shot migration of a guest's local wishlist into Supabase's `saved_trips`
 * table on first sign-in.
 *
 * Kept React-free so it can be unit-tested with a stub supabase client.
 */

import { toSupabaseInsert } from './wishlistStore';

/**
 * Push `localList` into saved_trips for `userId`, deduped against rows the
 * user already has on the server.
 *
 * @returns {Promise<{ inserted: number, skipped: number, error: any }>}
 */
export async function migrateLocalToSupabase({ supabase, userId, localList }) {
  if (!supabase || !userId) return { inserted: 0, skipped: 0, error: null };
  if (!Array.isArray(localList) || localList.length === 0) {
    return { inserted: 0, skipped: 0, error: null };
  }

  const { data: existing, error: readErr } = await supabase
    .from('saved_trips')
    .select('city_name')
    .eq('user_id', userId);
  if (readErr) return { inserted: 0, skipped: 0, error: readErr };

  const taken = new Set((existing || []).map((r) => r.city_name));
  const toInsert = localList
    .filter((t) => t && t.cityName && !taken.has(t.cityName))
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

  if (toInsert.length === 0) {
    return { inserted: 0, skipped: localList.length, error: null };
  }

  const { error: insertErr } = await supabase.from('saved_trips').insert(toInsert);
  if (insertErr) return { inserted: 0, skipped: 0, error: insertErr };

  return {
    inserted: toInsert.length,
    skipped: localList.length - toInsert.length,
    error: null,
  };
}
