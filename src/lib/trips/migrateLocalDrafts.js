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
import { canPersistTripDraft } from './tripLifecycle';
import { readLocalTripDrafts, removeLocalTripDraft } from './localTripDrafts';

export const LOCAL_DRAFTS_MIGRATION_KEY = 'plannerLocalDraftsMigratedFor';

function canUseLocalStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

/**
 * A coarse fingerprint of a trip used to detect duplicates. Works for both
 * synced trips (from /api/trips) and local drafts since both expose `title`,
 * `cities` and `time_range`.
 */
export function tripSignature(trip) {
  if (!trip) return '';
  const title = (trip.title || '').trim().toLowerCase();
  const cities = Array.isArray(trip.cities)
    ? trip.cities.map((city) => (city?.name || city?.id || '').toLowerCase()).join('>')
    : '';
  const tr = trip.time_range || {};
  let dates;
  if (tr.startDate && tr.endDate) {
    dates = `${tr.startDate}_${tr.endDate}`;
  } else if (tr.flexibleMonth) {
    dates = tr.flexibleMonth;
  } else if (tr.totalNights) {
    dates = `${tr.totalNights}n`;
  } else if (trip.start_date && trip.end_date) {
    dates = `${trip.start_date}_${trip.end_date}`;
  } else {
    dates = '';
  }
  return `${title}|${cities}|${dates}`;
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
  const seen = new Set(existingTrips.map(tripSignature));

  for (const draft of drafts) {
    // Incomplete drafts (no city/time range) can't be persisted server-side —
    // leave them in localStorage untouched rather than dropping them.
    if (!canPersistTripDraft(draft.trip_state)) continue;

    const signature = tripSignature(draft);
    if (seen.has(signature)) {
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
        body: JSON.stringify({ tripState: draft.trip_state, title: draft.title }),
      });

      if (!res.ok) {
        result.failed += 1;
        continue;
      }

      seen.add(signature);
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
