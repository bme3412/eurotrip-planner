/**
 * Bulk migration of browser-local trip drafts (`plannerLocalTripDrafts`) into
 * the signed-in user's Supabase account.
 *
 * The planner's autosave only syncs the *one* draft currently being edited
 * (see useTripPlannerAgent.js). That leaves older local drafts stranded, which
 * used to surface as a confusing "Saved on this device" section — and as
 * duplicates when a draft existed both locally and in the account. This module
 * pushes every local draft up on login, de-duplicating against trips already in
 * the account so we never create a second copy, then clears the local store.
 *
 * Note: a locally *generated* itinerary migrates as a plain draft. Full
 * itinerary persistence (trip_days / trip_activities) only happens server-side
 * via persistGeneratedItinerary, which the POST /api/trips/drafts endpoint does
 * not expose. This only affects users who generated an itinerary while signed
 * out (uncommon); they re-generate to restore the ready itinerary.
 */

import { getSupabaseAuthHeaders } from '@/lib/supabase/authHeaders';
import { canPersistTripDraft, tripSignature } from './tripLifecycle';
import { readLocalTripDrafts, removeLocalTripDraft } from './localTripDrafts';

export const LOCAL_DRAFTS_MIGRATION_KEY = 'plannerLocalDraftsMigratedFor';

// Re-exported for callers that historically imported it from this module.
export { tripSignature };

function canUseLocalStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

function hasMigrated(userId) {
  if (!canUseLocalStorage() || !userId) return false;
  return window.localStorage.getItem(LOCAL_DRAFTS_MIGRATION_KEY) === userId;
}

function markMigrated(userId) {
  if (!canUseLocalStorage() || !userId) return;
  window.localStorage.setItem(LOCAL_DRAFTS_MIGRATION_KEY, userId);
}

/**
 * Migrate every local draft into the signed-in account.
 *
 * @param {object} params
 * @param {object} params.session - Supabase session (provides access_token).
 * @param {string} params.userId - The signed-in user's id (migration guard key).
 * @param {Array}  params.existingTrips - Trips already in the account, used for dedupe.
 * @returns {Promise<{migrated:number, deduped:number, failed:number, ran:boolean}>}
 */
export async function migrateLocalDraftsToAccount({ session, userId, existingTrips = [] } = {}) {
  const result = { migrated: 0, deduped: 0, failed: 0, ran: false };

  if (!session?.access_token || !userId) return result;
  if (hasMigrated(userId)) return result;

  const drafts = readLocalTripDrafts();
  if (drafts.length === 0) {
    markMigrated(userId);
    return result;
  }

  result.ran = true;
  // Primary dedupe is by the stable client_dedup_key (idempotent even if the
  // server already holds the row — the POST upserts on it). tripSignature is a
  // secondary heuristic for legacy local drafts minted before keys existed.
  const draftKey = (trip) => trip?.client_dedup_key || trip?.trip_state?.meta?.clientDedupKey || null;
  const seenKeys = new Set(existingTrips.map(draftKey).filter(Boolean));
  const seenSignatures = new Set(existingTrips.map(tripSignature));

  for (const draft of drafts) {
    // Incomplete drafts (no city/time range) can't be persisted server-side —
    // leave them in localStorage untouched rather than dropping them.
    if (!canPersistTripDraft(draft.trip_state)) continue;

    const key = draftKey(draft);
    const signature = tripSignature(draft);
    if ((key && seenKeys.has(key)) || seenSignatures.has(signature)) {
      // A matching trip already lives in the account: drop the redundant local
      // copy so it stops showing up as a duplicate.
      removeLocalTripDraft(draft.id);
      result.deduped += 1;
      continue;
    }

    try {
      const res = await fetch('/api/trips/drafts', {
        method: 'POST',
        headers: getSupabaseAuthHeaders(session, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ tripState: draft.trip_state, title: draft.title, clientDedupKey: key }),
      });

      if (!res.ok) {
        result.failed += 1;
        continue;
      }

      if (key) seenKeys.add(key);
      seenSignatures.add(signature);
      removeLocalTripDraft(draft.id);
      result.migrated += 1;
    } catch (error) {
      console.warn('[migrate-local-drafts] Failed to migrate a draft:', error);
      result.failed += 1;
    }
  }

  // Only set the per-user guard when nothing failed, so a transient error gets
  // retried on the next visit instead of stranding drafts locally forever.
  if (result.failed === 0) markMigrated(userId);

  return result;
}
