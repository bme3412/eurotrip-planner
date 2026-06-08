'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseClient } from '@/lib/supabase/client';
import {
  clearLocalWishlist,
  fromSupabaseRow,
  isWishlisted,
  markMigratedFor,
  readLocalWishlist,
  toSupabaseInsert,
  toggleWishlist,
  wasMigratedFor,
  writeLocalWishlist,
} from '@/lib/savedItems/wishlistStore';
import { migrateLocalToSupabase } from '@/lib/savedItems/wishlistMigration';
import { useSavedCollection } from '@/hooks/useSavedCollection';

function getBrowserStorage() {
  if (typeof window === 'undefined') return null;
  try { return window.localStorage; } catch { return null; }
}

/**
 * useWishlist — single-city "Save this city" toggle.
 *
 * Authenticated users sync to the `saved_trips` Supabase table; guests use
 * the `savedTrips` localStorage key. Same surface either way.
 *
 * On first sign-in we migrate any guest-saved cities from localStorage into
 * `saved_trips`, then clear the local copy so there is one source of truth.
 *
 * @returns {{
 *   isSaved: boolean,
 *   loading: boolean,
 *   toggle: () => Promise<{ action: 'added'|'removed'|'noop' }>,
 *   isGuest: boolean,
 * }}
 */
export function useWishlist(cityName, cityData) {
  const { user, isSupabaseConfigured, loading: authLoading } = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [migrationTick, setMigrationTick] = useState(0);
  const isSavedRef = useRef(false);
  isSavedRef.current = isSaved;

  const useSupabase = !!(user && isSupabaseConfigured);
  const isGuest = !user && isSupabaseConfigured;

  // One-shot migration of localStorage wishlist into Supabase on first sign-in
  // for this user. Keyed by user id so a different account triggers it again.
  useEffect(() => {
    if (authLoading || !useSupabase) return;
    const storage = getBrowserStorage();
    if (wasMigratedFor(user.id, storage)) return;

    let cancelled = false;
    (async () => {
      const localList = readLocalWishlist(storage);
      const supabase = getSupabaseClient();
      const { error } = await migrateLocalToSupabase({
        supabase,
        userId: user.id,
        localList,
      });
      if (cancelled) return;
      if (error) {
        console.error('[useWishlist] migration failed', error);
        return; // leave local intact; we'll retry on next mount
      }
      clearLocalWishlist(storage);
      markMigratedFor(user.id, storage);
      // Force the load effect to re-fetch so any migrated rows appear.
      setMigrationTick((n) => n + 1);
    })();

    return () => { cancelled = true; };
  }, [authLoading, useSupabase, user?.id]);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    setLoading(true);

    (async () => {
      if (useSupabase) {
        const supabase = getSupabaseClient();
        if (supabase) {
          const { data, error } = await supabase
            .from('saved_trips')
            .select('id')
            .eq('user_id', user.id)
            .eq('city_name', cityName);
          if (!cancelled) {
            if (error) console.error('[useWishlist] supabase load error', error);
            setIsSaved(Array.isArray(data) && data.length > 0);
          }
        }
      } else {
        const list = readLocalWishlist(getBrowserStorage());
        if (!cancelled) setIsSaved(isWishlisted(list, cityName));
      }
      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [cityName, useSupabase, user?.id, authLoading, migrationTick]);

  const toggle = useCallback(async () => {
    // Avoid writing to the wrong store while auth is still resolving.
    if (authLoading) return { action: 'noop' };

    const wasSaved = isSavedRef.current;
    // Optimistic flip.
    setIsSaved(!wasSaved);

    if (useSupabase) {
      const supabase = getSupabaseClient();
      if (!supabase) return { action: 'noop' };
      if (wasSaved) {
        const { error } = await supabase
          .from('saved_trips')
          .delete()
          .eq('user_id', user.id)
          .eq('city_name', cityName);
        if (error) {
          console.error('[useWishlist] supabase delete error', error);
          setIsSaved(true);
          return { action: 'noop' };
        }
        return { action: 'removed' };
      }
      const { error } = await supabase
        .from('saved_trips')
        .insert(toSupabaseInsert({ userId: user.id, cityName, cityData }));
      if (error) {
        console.error('[useWishlist] supabase insert error', error);
        setIsSaved(false);
        return { action: 'noop' };
      }
      return { action: 'added' };
    }

    const list = readLocalWishlist(getBrowserStorage());
    const { next, action } = toggleWishlist(list, { cityName, cityData });
    if (action !== 'noop') writeLocalWishlist(next, getBrowserStorage());
    return { action };
  }, [cityName, cityData, useSupabase, user?.id, authLoading]);

  return { isSaved, loading: loading || authLoading, toggle, isGuest };
}

/**
 * Collection config for saved cities, consumed by the generic useSavedCollection
 * list hook. Defined once so the My Trips list and any future surface share it.
 */
const wishlistListConfig = {
  table: 'saved_trips',
  orderBy: 'created_at',
  fromRow: fromSupabaseRow,
  readLocal: (storage) => readLocalWishlist(storage),
  removeRemote: (supabase, _userId, trip) =>
    trip.id ? supabase.from('saved_trips').delete().eq('id', trip.id) : Promise.resolve(),
  removeLocal: (storage, trip) => {
    const next = readLocalWishlist(storage).filter((t) => t.cityName !== trip.cityName);
    writeLocalWishlist(next, storage);
  },
  sameItem: (a, b) => a.cityName === b.cityName,
};

/**
 * useWishlistList — read+remove for the "My saved cities" page. Thin wrapper
 * over the shared useSavedCollection lifecycle; keeps the legacy `savedTrips`
 * surface so existing call sites are untouched.
 */
export function useWishlistList() {
  const { items, loading, remove, reload } = useSavedCollection(wishlistListConfig);
  return { savedTrips: items, loading, remove, reload };
}
