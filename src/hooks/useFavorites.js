'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseClient } from '@/lib/supabase/client';
import {
  defaultIdOf,
  fromSupabaseRow,
  isFavorited,
  readLocalFavorites,
  toSupabaseInsert,
  toggleFavorite as toggleFavoriteReducer,
  writeLocalFavorites,
} from '@/lib/savedItems/favoritesStore';

const noopStorage = null;
function getBrowserStorage() {
  if (typeof window === 'undefined') return noopStorage;
  try { return window.localStorage; } catch { return noopStorage; }
}

/**
 * useFavorites — unified favorites store for per-city "saved experiences".
 *
 * Previously: CityOverview kept favorites only in localStorage (broken sync
 * for authenticated users); AttractionsList had its own near-duplicate copy
 * of the Supabase + localStorage dual logic.
 *
 * Now: one hook, one source of truth. Authenticated users always sync to
 * Supabase; guests fall back to localStorage; the surface is identical.
 *
 * @param {string} cityName
 * @param {object} [opts]
 * @param {(item: any) => string|null} [opts.idOf]  custom id extractor
 * @returns {{
 *   favorites: any[],
 *   isFavorite: (item: any) => boolean,
 *   toggle: (item: any) => Promise<{ action: 'added'|'removed'|'noop', id: string|null }>,
 *   loading: boolean,
 * }}
 */
export function useFavorites(cityName, { idOf = defaultIdOf } = {}) {
  const { user, isSupabaseConfigured } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  // Ref mirrors `favorites` so async toggles always operate on the latest
  // list even if React state hasn't propagated yet.
  const favoritesRef = useRef(favorites);
  favoritesRef.current = favorites;

  const useSupabase = !!(user && isSupabaseConfigured);

  // Load on mount + whenever (auth state, city) changes.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      if (useSupabase) {
        const supabase = getSupabaseClient();
        if (supabase) {
          const { data, error } = await supabase
            .from('saved_experiences')
            .select('*')
            .eq('user_id', user.id)
            .eq('city_name', cityName);
          if (!cancelled) {
            if (!error && Array.isArray(data)) {
              setFavorites(data.map(fromSupabaseRow).filter(Boolean));
            } else if (error) {
              console.error('[useFavorites] supabase load error', error);
            }
          }
        }
      } else {
        const list = readLocalFavorites(cityName, getBrowserStorage());
        if (!cancelled) setFavorites(list);
      }
      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [cityName, useSupabase, user?.id]);

  const isFavorite = useCallback(
    (item) => isFavorited(favoritesRef.current, item, idOf),
    [idOf],
  );

  const toggle = useCallback(async (item) => {
    const current = favoritesRef.current;
    const { next, action, id } = toggleFavoriteReducer(current, item, idOf);
    if (action === 'noop') return { action, id };

    // Optimistic update.
    setFavorites(next);

    if (useSupabase) {
      const supabase = getSupabaseClient();
      if (!supabase) return { action, id };

      if (action === 'removed') {
        const { error } = await supabase
          .from('saved_experiences')
          .delete()
          .eq('user_id', user.id)
          .eq('city_name', cityName)
          .eq('experience_name', id);
        if (error) {
          console.error('[useFavorites] supabase delete error', error);
          setFavorites(current); // roll back
          return { action: 'noop', id };
        }
      } else {
        const { error } = await supabase
          .from('saved_experiences')
          .insert(toSupabaseInsert({ userId: user.id, cityName, item, id }));
        if (error) {
          console.error('[useFavorites] supabase insert error', error);
          setFavorites(current); // roll back
          return { action: 'noop', id };
        }
      }
    } else {
      writeLocalFavorites(cityName, next, getBrowserStorage());
    }

    return { action, id };
  }, [cityName, useSupabase, user?.id, idOf]);

  return { favorites, isFavorite, toggle, loading };
}
