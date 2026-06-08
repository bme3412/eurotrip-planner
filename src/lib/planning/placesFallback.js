/**
 * Live Google Places fallback for cities without a curated attraction guide.
 *
 * ~200 of the ~330 cities have only a visit-calendar (coords + weather) and no
 * attractions.json, so the deterministic builder falls back to generic "Explore
 * central X" blocks. When enabled, this fetches real nearby points of interest
 * from Google Places around the city centre and maps them into the same shape
 * `buildItinerary` / the candidate pool expect — so sparse cities get real,
 * named places (and, fed through the curator, the same quality treatment).
 *
 * Grounding/provenance: every record is tagged `_provenance: 'google_places'`
 * so the UI can mark it as a live suggestion rather than a curated pick.
 *
 * Cost control: Nearby Search is billed per call and is NOT cached upstream, so
 * results are memoised in-process and mirrored to /tmp (POIs are stable). One
 * call per never-seen city. Off by default (ITINERARY_PLACES_FALLBACK).
 */
import fs from 'fs';
import path from 'path';

import { getNearbyPlaces } from '../google-places/index.js';
import { getGooglePlacesApiKeyStatus } from '../google-places/client.js';
import { getCityPath } from '../manifest.js';

const CACHE_PATH = path.join('/tmp', 'itinerary-places-fallback.json');
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days — POIs barely move
const RADIUS_M = 4000;
const INCLUDED_TYPES = ['tourist_attraction', 'museum', 'art_gallery', 'historical_landmark', 'park'];
const FIELD_MASK = [
  'places.id', 'places.displayName', 'places.location', 'places.types',
  'places.rating', 'places.userRatingCount', 'places.editorialSummary',
  'places.regularOpeningHours', 'places.websiteUri', 'places.priceLevel',
].join(',');

// ── Disk-backed memo (keyed by city slug) ───────────────────────────
let store = null;
function loadStore() {
  if (store) return store;
  store = new Map();
  try {
    const raw = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
    const now = Date.now();
    for (const [k, v] of Object.entries(raw)) {
      if (v?.expiresAt > now) store.set(k, v);
    }
  } catch {
    // No cache yet — start empty.
  }
  return store;
}
function persistStore() {
  try {
    const obj = {};
    for (const [k, v] of store.entries()) obj[k] = v;
    fs.writeFileSync(CACHE_PATH, JSON.stringify(obj), 'utf-8');
  } catch {
    // Non-fatal — in-memory memo still works.
  }
}

// ── Mapping helpers ─────────────────────────────────────────────────
function prettifyType(t) {
  if (!t) return 'Attraction';
  return String(t).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const PRICE_BY_LEVEL = {
  PRICE_LEVEL_FREE: 'Free',
  PRICE_LEVEL_INEXPENSIVE: '€',
  PRICE_LEVEL_MODERATE: '€€',
  PRICE_LEVEL_EXPENSIVE: '€€€',
  PRICE_LEVEL_VERY_EXPENSIVE: '€€€€',
};

const OUTDOOR_TYPES = new Set(['park', 'tourist_attraction', 'historical_landmark']);

/** Map a Google rating (0–5) + popularity into the guide's 1–5 significance. */
function deriveSignificance(rating, count) {
  const base = Number.isFinite(rating) ? Math.round(rating) : 4;
  const bump = Number.isFinite(count) && count > 5000 ? 1 : 0;
  return Math.max(1, Math.min(5, base + bump));
}

function placeToSite(place) {
  if (!place?.displayName?.text || !place.location) return null;
  const types = place.types || [];
  return {
    name: place.displayName.text,
    type: prettifyType(types[0]),
    description: place.editorialSummary?.text || '',
    latitude: place.location.latitude,
    longitude: place.location.longitude,
    ratings: {
      cultural_significance: deriveSignificance(place.rating, place.userRatingCount),
      suggested_duration_hours: 1.5,
    },
    price_range: PRICE_BY_LEVEL[place.priceLevel] || null,
    // parseOpeningHours reads `openingHours.periods` first — Google's New API shape.
    openingHours: place.regularOpeningHours || null,
    official_url: place.websiteUri || null,
    website: place.websiteUri || null,
    googlePlaceId: place.id || null,
    indoor: types.some((t) => OUTDOOR_TYPES.has(t)) ? false : undefined,
    _provenance: 'google_places',
  };
}

/** Read a city's centre coordinates from its index.json. */
function readCityCenter(cityId) {
  try {
    const dir = getCityPath(cityId);
    if (!dir) return null;
    const idx = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf-8'));
    const c = idx?.coordinates;
    const lat = c?.lat ?? c?.latitude;
    const lng = c?.lng ?? c?.longitude;
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { latitude: lat, longitude: lng };
  } catch {
    // No index / no coords.
  }
  return null;
}

/**
 * Get real nearby attractions for a city via Google Places, mapped to the guide
 * shape. Returns [] (never throws) when disabled, keyless, coordless, or on error.
 *
 * @param {string} cityId
 * @returns {Promise<Array>} attraction-shaped records tagged with provenance
 */
export async function getFallbackAttractions(cityId) {
  if (!cityId) return [];
  if (!getGooglePlacesApiKeyStatus().configured) return [];

  const cache = loadStore();
  const hit = cache.get(cityId);
  if (hit && hit.expiresAt > Date.now()) return hit.sites;

  const center = readCityCenter(cityId);
  if (!center) return [];

  try {
    const res = await getNearbyPlaces(center, RADIUS_M, INCLUDED_TYPES, FIELD_MASK);
    const sites = (res?.places || []).map(placeToSite).filter(Boolean);
    cache.set(cityId, { sites, expiresAt: Date.now() + TTL_MS });
    persistStore();
    return sites;
  } catch (err) {
    console.warn('[placesFallback] nearby search failed:', err?.message || err);
    return [];
  }
}
