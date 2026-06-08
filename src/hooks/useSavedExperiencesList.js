'use client';

import { useMemo } from 'react';
import { useSavedCollection } from '@/hooks/useSavedCollection';
import {
  defaultIdOf,
  fromSupabaseRow as favFromSupabaseRow,
  readAllLocalFavorites,
  readLocalFavorites,
  writeLocalFavorites,
} from '@/lib/savedItems/favoritesStore';

/**
 * Collection config for saved attractions, shared with the generic list hook.
 * Unlike the wishlist, attractions are stored per-city, so the local read
 * flattens every `favorites-{city}` bucket and stamps each item with its city.
 */
const experiencesListConfig = {
  table: 'saved_experiences',
  orderBy: 'created_at',
  fromRow: (row) => ({ ...favFromSupabaseRow(row), id: row.id, cityName: row.city_name }),
  readLocal: (storage) =>
    readAllLocalFavorites(storage).flatMap(({ cityName, items }) =>
      items.map((item) => ({ ...item, cityName })),
    ),
  removeRemote: (supabase, userId, item) =>
    item.id
      ? supabase.from('saved_experiences').delete().eq('id', item.id)
      : supabase
          .from('saved_experiences')
          .delete()
          .eq('user_id', userId)
          .eq('city_name', item.cityName)
          .eq('experience_name', defaultIdOf(item)),
  removeLocal: (storage, item) => {
    const id = defaultIdOf(item);
    const next = readLocalFavorites(item.cityName, storage).filter((it) => defaultIdOf(it) !== id);
    writeLocalFavorites(item.cityName, next, storage);
  },
  sameItem: (a, b) => a.cityName === b.cityName && defaultIdOf(a) === defaultIdOf(b),
};

/**
 * useSavedExperiencesList — read+remove for the "Saved experiences" section on
 * the My Trips page, grouped by city. Signed-in reads from saved_experiences
 * across all cities; guests read every local bucket.
 *
 * @returns {{ byCity: Array<{cityName:string, items:any[]}>, total:number, loading:boolean, remove:Function }}
 */
export function useSavedExperiencesList() {
  const { items, total, loading, remove } = useSavedCollection(experiencesListConfig);

  const byCity = useMemo(() => {
    const groups = new Map();
    for (const item of items) {
      const city = item.cityName || 'Other';
      const bucket = groups.get(city) || [];
      bucket.push(item);
      groups.set(city, bucket);
    }
    return [...groups.entries()].map(([cityName, cityItems]) => ({ cityName, items: cityItems }));
  }, [items]);

  return { byCity, total, loading, remove };
}
