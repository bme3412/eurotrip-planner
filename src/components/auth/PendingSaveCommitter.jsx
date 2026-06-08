'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseClient } from '@/lib/supabase/client';
import {
  readLocalWishlist,
  clearLocalWishlist,
} from '@/lib/savedItems/wishlistStore';
import { migrateLocalToSupabase as migrateWishlist } from '@/lib/savedItems/wishlistMigration';
import { migrateAllFavoritesToSupabase, FAVORITES_MIGRATION_KEY } from '@/lib/savedItems/favoritesMigration';
import { WISHLIST_MIGRATION_KEY } from '@/lib/savedItems/wishlistStore';
import { wasMigratedFor, markMigratedFor } from '@/lib/savedItems/createSavedCollection';
import { clearPending, PENDING_SAVE_TYPES } from '@/lib/savedItems/pendingSave';

function getStorage() {
  if (typeof window === 'undefined') return null;
  try { return window.localStorage; } catch { return null; }
}

/**
 * Commits guest-saved items into the account after sign-in.
 *
 * Mounted once high in the tree (under AuthProvider) so the soft-gate flow works
 * no matter where the OAuth redirect lands — a guest can save an attraction on a
 * city page, sign in, return to /saved-trips, and still have it migrated. Trip
 * drafts migrate on the /saved-trips page; saved cities and attractions migrate
 * here. All migrations are per-user idempotent, so overlap with page-level
 * triggers is harmless.
 */
export default function PendingSaveCommitter() {
  const { user, isSupabaseConfigured, loading } = useAuth();
  const ranForRef = useRef(null);

  useEffect(() => {
    if (loading || !user || !isSupabaseConfigured) return;
    if (ranForRef.current === user.id) return;
    ranForRef.current = user.id;

    const storage = getStorage();
    const supabase = getSupabaseClient();
    if (!supabase) return;

    let cancelled = false;
    (async () => {
      // Saved cities
      if (!wasMigratedFor(WISHLIST_MIGRATION_KEY, user.id, storage)) {
        const localList = readLocalWishlist(storage);
        const { error } = await migrateWishlist({ supabase, userId: user.id, localList });
        if (!cancelled && !error) {
          clearLocalWishlist(storage);
          markMigratedFor(WISHLIST_MIGRATION_KEY, user.id, storage);
        }
      }

      // Saved attractions (previously had no migration at all)
      if (!wasMigratedFor(FAVORITES_MIGRATION_KEY, user.id, storage)) {
        const { error } = await migrateAllFavoritesToSupabase({ supabase, userId: user.id, storage });
        if (!cancelled && !error) {
          markMigratedFor(FAVORITES_MIGRATION_KEY, user.id, storage);
        }
      }

      if (!cancelled) PENDING_SAVE_TYPES.forEach(clearPending);
    })();

    return () => { cancelled = true; };
  }, [user, isSupabaseConfigured, loading]);

  return null;
}
