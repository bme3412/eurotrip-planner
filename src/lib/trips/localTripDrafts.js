import {
  deriveTripTitle,
  getAnchorCities,
  getTripTimeRange,
  normalizeTripState,
  TRIP_LIFECYCLE_STATUSES,
} from './tripLifecycle';
import { ensureClientDedupKey } from './clientDedupKey';

export const LOCAL_TRIP_DRAFTS_KEY = 'plannerLocalTripDrafts';
const LEGACY_WIZARD_SAVES_KEY = 'eurotrip-saved-itineraries';
const LEGACY_WIZARD_MIGRATED_KEY = 'plannerLegacyWizardSavesMigrated';

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

export function upsertLocalTripDraft({
  id = null,
  tripState,
  title = null,
  messages = null,
  generatedItinerary = null,
  itineraryGeneratedAt = null,
} = {}) {
  const now = new Date().toISOString();
  const draftId = id || makeLocalTripId();
  const existingDrafts = readLocalTripDrafts();
  const existing = existingDrafts.find((draft) => draft.id === draftId);
  // Mint a stable idempotency key once and carry it inside trip_state.meta so it
  // survives normalize + the POST body. Reuse the existing draft's key on update.
  const seededTripState = existing?.client_dedup_key
    ? { ...(tripState || {}), meta: { ...(tripState?.meta || {}), clientDedupKey: existing.client_dedup_key } }
    : tripState;
  const { key: clientDedupKey, tripState: keyedTripState } = ensureClientDedupKey(seededTripState);
  const normalized = normalizeTripState(keyedTripState);
  const cities = getAnchorCities(normalized);
  const timeRange = getTripTimeRange(normalized);

  const draft = {
    ...(existing || {}),
    id: draftId,
    local: true,
    client_dedup_key: clientDedupKey,
    title: title || deriveTripTitle(normalized),
    status: TRIP_LIFECYCLE_STATUSES.DRAFT,
    cities,
    trip_state: normalized,
    messages: Array.isArray(messages) ? messages : existing?.messages || [],
    generated_itinerary: generatedItinerary ?? existing?.generated_itinerary ?? null,
    itinerary_generated_at: itineraryGeneratedAt ?? existing?.itinerary_generated_at ?? null,
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

function wizardCityToTripCity(city, { role, order, nights } = {}) {
  if (!city) return null;
  const source = city.city || city;
  const id = source.id || city.id || source.name?.toLowerCase?.() || city.cityName?.toLowerCase?.();
  const name = source.name || city.name || city.cityName || id;
  if (!id || !name) return null;

  return {
    id,
    name,
    country: source.country || city.country || null,
    latitude: source.lat || source.latitude || null,
    longitude: source.lng || source.longitude || null,
    role,
    order,
    nights: Number.isFinite(Number(nights)) ? Number(nights) : null,
  };
}

function legacyWizardToTripState(saved) {
  const data = saved?.data || {};
  const cities = [];

  const startCity = wizardCityToTripCity(data.startCity, {
    role: 'start',
    order: 0,
    nights: Array.isArray(data.startCityDays) ? data.startCityDays.length : null,
  });
  if (startCity) cities.push(startCity);

  for (const stop of data.intermediateStops || []) {
    const nights = Array.isArray(stop.days) ? stop.days.length : stop.days;
    const city = wizardCityToTripCity(stop, {
      role: 'stop',
      order: cities.length,
      nights,
    });
    if (city) cities.push(city);
  }

  const endCity = wizardCityToTripCity(data.endCity, {
    role: 'end',
    order: cities.length,
    nights: Array.isArray(data.endCityDays) ? data.endCityDays.length : null,
  });
  if (endCity) cities.push(endCity);

  return normalizeTripState({
    route: {
      cities,
      routeShape: cities.length > 1 ? 'one-way' : null,
    },
    dates: {
      startDate: data.tripDates?.start || null,
      endDate: data.tripDates?.end || null,
      totalNights: cities.reduce((sum, city) => sum + (Number(city.nights) || 0), 0) || null,
    },
    preferences: {
      pace: data.preferences?.paceId || null,
      interests: data.preferences?.interests || [],
    },
    budget: {
      style: data.preferences?.budget || null,
    },
  });
}

export function migrateLegacyWizardItineraries() {
  if (!canUseLocalStorage()) return [];
  if (window.localStorage.getItem(LEGACY_WIZARD_MIGRATED_KEY) === 'true') {
    return readLocalTripDrafts();
  }

  let legacy = [];
  try {
    const raw = window.localStorage.getItem(LEGACY_WIZARD_SAVES_KEY);
    legacy = raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.warn('[local-trip-drafts] Failed to read legacy wizard saves:', error);
  }

  if (!Array.isArray(legacy) || legacy.length === 0) {
    window.localStorage.setItem(LEGACY_WIZARD_MIGRATED_KEY, 'true');
    return readLocalTripDrafts();
  }

  let drafts = readLocalTripDrafts();
  for (const saved of legacy) {
    const tripState = legacyWizardToTripState(saved);
    const title = saved.name || deriveTripTitle(tripState);
    const id = `legacy_${saved.id}`;
    const existing = drafts.find((draft) => draft.id === id);
    if (existing) continue;

    const now = new Date().toISOString();
    drafts = [
      {
        id,
        local: true,
        title,
        status: TRIP_LIFECYCLE_STATUSES.DRAFT,
        cities: getAnchorCities(tripState),
        trip_state: tripState,
        messages: [],
        generated_itinerary: saved.generatedItinerary || null,
        itinerary_generated_at: saved.generatedItinerary ? saved.savedAt || now : null,
        time_range: getTripTimeRange(tripState),
        created_at: saved.savedAt || now,
        updated_at: saved.savedAt || now,
        migrated_from: LEGACY_WIZARD_SAVES_KEY,
      },
      ...drafts,
    ].slice(0, 25);
  }

  writeLocalTripDrafts(drafts);
  window.localStorage.setItem(LEGACY_WIZARD_MIGRATED_KEY, 'true');
  return drafts;
}
