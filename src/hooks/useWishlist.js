'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseClient } from '@/lib/supabase/client';
import {
  fromSupabaseRow,
  isWishlisted,
  readLocalWishlist,
  toSupabaseInsert,
  toggleWishlist,
  writeLocalWishlist,
} from '@/lib/savedItems/wishlistStore';

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
 * @returns {{
 *   isSaved: boolean,
 *   loading: boolean,
 *   toggle: () => Promise<{ action: 'added'|'removed'|'noop' }>,
 * }}
 */
export function useWishlist(cityName, cityData) {
  const { user, isSupabaseConfigured } = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const isSavedRef = useRef(false);
  isSavedRef.current = isSaved;

  const useSupabase = !!(user && isSupabaseConfigured);

  useEffect(() => {
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
  }, [cityName, useSupabase, user?.id]);

  const toggle = useCallback(async () => {
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
  }, [cityName, cityData, useSupabase, user?.id]);

  return { isSaved, loading, toggle };
}

/**
 * useWishlistList — read+remove for the "My saved cities" page.
 */
export function useWishlistList() {
  const { user, isSupabaseConfigured, loading: authLoading } = useAuth();
  const [savedTrips, setSavedTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  const useSupabase = !!(user && isSupabaseConfigured);

  const reload = useCallback(async () => {
    setLoading(true);
    if (useSupabase) {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase
          .from('saved_trips')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        if (!error && Array.isArray(data)) {
          setSavedTrips(data.map(fromSupabaseRow).filter(Boolean));
        } else if (error) {
          console.error('[useWishlistList] supabase load error', error);
        }
      }
    } else {
      setSavedTrips(readLocalWishlist(getBrowserStorage()));
    }
    setLoading(false);
  }, [useSupabase, user?.id]);

  useEffect(() => {
    if (authLoading) return;
    reload();
  }, [authLoading, reload]);

  const remove = useCallback(async (trip) => {
    if (useSupabase) {
      const supabase = getSupabaseClient();
      if (supabase && trip.id) {
        await supabase.from('saved_trips').delete().eq('id', trip.id);
      }
    } else {
      const list = readLocalWishlist(getBrowserStorage());
      const next = list.filter((t) => t.cityName !== trip.cityName);
      writeLocalWishlist(next, getBrowserStorage());
    }
    setSavedTrips((curr) => curr.filter((t) => t.cityName !== trip.cityName));
  }, [useSupabase]);

  return { savedTrips, loading: loading || authLoading, remove, reload };
}
