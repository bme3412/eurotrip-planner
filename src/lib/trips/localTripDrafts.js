import {
  deriveTripTitle,
  getAnchorCities,
  getTripTimeRange,
  normalizeTripState,
  TRIP_LIFECYCLE_STATUSES,
} from './tripLifecycle';

export const LOCAL_TRIP_DRAFTS_KEY = 'plannerLocalTripDrafts';

function canUseLocalStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

function makeLocalTripId() {
  return `local_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function readLocalTripDrafts() {
  if (!canUseLocalStorage()) return [];

  try {
    const raw = window.localStorage.getItem(LOCAL_TRIP_DRAFTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('[local-trip-drafts] Failed to read local drafts:', error);
    return [];
  }
}

function writeLocalTripDrafts(drafts) {
  if (!canUseLocalStorage()) return;
  window.localStorage.setItem(LOCAL_TRIP_DRAFTS_KEY, JSON.stringify(drafts));
}

export function getLocalTripDraft(id) {
  if (!id) return null;
  return readLocalTripDrafts().find((draft) => draft.id === id) || null;
}

export function upsertLocalTripDraft({ id = null, tripState, title = null, messages = null } = {}) {
  const normalized = normalizeTripState(tripState);
  const now = new Date().toISOString();
  const draftId = id || makeLocalTripId();
  const existingDrafts = readLocalTripDrafts();
  const existing = existingDrafts.find((draft) => draft.id === draftId);
  const cities = getAnchorCities(normalized);
  const timeRange = getTripTimeRange(normalized);

  const draft = {
    ...(existing || {}),
    id: draftId,
    local: true,
    title: title || deriveTripTitle(normalized),
    status: TRIP_LIFECYCLE_STATUSES.DRAFT,
    cities,
    trip_state: normalized,
    messages: Array.isArray(messages) ? messages : existing?.messages || [],
    time_range: timeRange,
    created_at: existing?.created_at || now,
    updated_at: now,
  };

  const nextDrafts = [
    draft,
    ...existingDrafts.filter((item) => item.id !== draftId),
  ].slice(0, 25);

  writeLocalTripDrafts(nextDrafts);
  return draft;
}

export function removeLocalTripDraft(id) {
  if (!id) return;
  writeLocalTripDrafts(readLocalTripDrafts().filter((draft) => draft.id !== id));
}
