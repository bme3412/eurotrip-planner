'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseClient } from '@/lib/supabase/client';

function getBrowserStorage() {
  if (typeof window === 'undefined') return null;
  try { return window.localStorage; } catch { return null; }
}

/**
 * Generic read+remove hook for a saved-items collection (saved cities, saved
 * attractions, …). Authenticated users read from Supabase; guests read from
 * localStorage. The collection-specific bits are injected via `config` so the
 * two list views (useWishlistList, useSavedExperiencesList) share one lifecycle
 * instead of each re-implementing the load/remove dance.
 *
 * @param {object} config
 * @param {string} config.table                         Supabase table.
 * @param {(row:object)=>any} config.fromRow            Map a server row → UI item.
 * @param {string} [config.orderBy]                     Column to order remote reads by (desc).
 * @param {(storage:Storage)=>any[]} config.readLocal   Read the guest list.
 * @param {(supabase, userId)=>Promise} config.loadRemote  Optional custom remote load.
 * @param {(supabase, userId, item)=>Promise} config.removeRemote  Delete one server row.
 * @param {(storage, item)=>void} config.removeLocal    Delete one local item.
 * @param {(a, b)=>boolean} config.sameItem             Identity test for optimistic removal.
 * @returns {{ items:any[], total:number, loading:boolean, remove:Function, reload:Function }}
 */
export function useSavedCollection(config) {
  const { user, isSupabaseConfigured, loading: authLoading } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const useSupabase = !!(user && isSupabaseConfigured);

  const reload = useCallback(async () => {
    setLoading(true);
    if (useSupabase) {
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          const rows = config.loadRemote
            ? await config.loadRemote(supabase, user.id)
            : await defaultLoadRemote(supabase, user.id, config);
          setItems((rows || []).map(config.fromRow).filter(Boolean));
        } catch (err) {
          console.error('[useSavedCollection] remote load error', err);
        }
      }
    } else {
      setItems(config.readLocal(getBrowserStorage()) || []);
    }
    setLoading(false);
    // config is a stable object literal from the caller; depending on user/auth is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useSupabase, user?.id]);

  useEffect(() => {
    if (authLoading) return;
    reload();
  }, [authLoading, reload]);

  const remove = useCallback(async (item) => {
    if (useSupabase) {
      const supabase = getSupabaseClient();
      if (supabase) await config.removeRemote(supabase, user.id, item);
    } else {
      config.removeLocal(getBrowserStorage(), item);
    }
    setItems((curr) => curr.filter((it) => !config.sameItem(it, item)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useSupabase, user?.id]);

  return { items, total: items.length, loading: loading || authLoading, remove, reload };
}

async function defaultLoadRemote(supabase, userId, config) {
  let query = supabase.from(config.table).select('*').eq('user_id', userId);
  if (config.orderBy) query = query.order(config.orderBy, { ascending: false });
  const { data, error } = await query;
  if (error) throw error;
  return data;
}
