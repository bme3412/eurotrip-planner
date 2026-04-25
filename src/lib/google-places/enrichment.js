/**
 * Enriches attraction data with live Google Places details.
 *
 * Reads pre-resolved place_ids from public/data/google-place-ids.json
 * and fetches fresh details (rating, reviews, photos, hours, summary).
 */

import fs from 'fs';
import path from 'path';
import { getPlaceDetails } from './index.js';
import { classifyGoogleApiError } from './client.js';

const ENRICHMENT_FIELD_MASK = [
  'id',
  'displayName',
  'rating',
  'userRatingCount',
  'currentOpeningHours',
  'regularOpeningHours',
  'photos',
  'websiteUri',
  'googleMapsUri',
  'editorialSummary',
  'priceLevel',
  'location',
].join(',');

let placeIdMap = null;

function loadPlaceIdMap() {
  if (placeIdMap) return placeIdMap;
  try {
    const fp = path.join(process.cwd(), 'public', 'data', 'google-place-ids.json');
    placeIdMap = JSON.parse(fs.readFileSync(fp, 'utf-8'));
  } catch {
    placeIdMap = {};
  }
  return placeIdMap;
}

function normalizeName(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function findPlaceEntry(map, citySlug, attractionName) {
  const cityMap = map?.[citySlug];
  if (!cityMap || !attractionName) return null;
  if (cityMap[attractionName]) return cityMap[attractionName];

  const target = normalizeName(attractionName);
  const match = Object.entries(cityMap).find(([name]) => normalizeName(name) === target);
  return match?.[1] || null;
}

function addDiagnostic(diagnostics, type, payload = {}) {
  if (!diagnostics) return;
  if (type === 'total') diagnostics.total = (diagnostics.total || 0) + 1;
  if (type === 'matched') diagnostics.matchedPlaceIds = (diagnostics.matchedPlaceIds || 0) + 1;
  if (type === 'details') diagnostics.detailsFetched = (diagnostics.detailsFetched || 0) + 1;
  if (type === 'photos') diagnostics.withPhotos = (diagnostics.withPhotos || 0) + 1;
  if (type === 'missing') {
    diagnostics.missingPlaceIds = diagnostics.missingPlaceIds || [];
    diagnostics.missingPlaceIds.push(payload.name);
  }
  if (type === 'error') {
    diagnostics.errors = diagnostics.errors || [];
    diagnostics.errors.push(payload);
  }
}

/**
 * Enrich a single attraction with Google Places data.
 * Returns the original attraction merged with Google fields, or unchanged on failure.
 */
export async function enrichAttractionWithGoogleData(attraction, citySlug, options = {}) {
  const { diagnostics } = options;
  addDiagnostic(diagnostics, 'total');

  const map = loadPlaceIdMap();
  const entry = findPlaceEntry(map, citySlug, attraction.name);
  if (!entry?.placeId) {
    addDiagnostic(diagnostics, 'missing', { name: attraction.name });
    return attraction;
  }

  addDiagnostic(diagnostics, 'matched');
  const base = {
    ...attraction,
    googlePlaceId: entry.placeId,
    googlePlaceName: entry.googleName,
    googlePlaceConfidence: entry.confidence,
  };

  try {
    const details = await getPlaceDetails(entry.placeId, ENRICHMENT_FIELD_MASK);
    const photos = (details.photos || []).slice(0, 5).map((p) => ({
      name: p.name,
      widthPx: p.widthPx,
      heightPx: p.heightPx,
    }));

    addDiagnostic(diagnostics, 'details');
    if (photos.length > 0) addDiagnostic(diagnostics, 'photos');

    return {
      ...base,
      googlePlaceId: entry.placeId,
      googleRating: details.rating ?? undefined,
      googleReviewCount: details.userRatingCount ?? undefined,
      googlePhotos: photos,
      currentlyOpen: details.currentOpeningHours?.openNow ?? undefined,
      googleCurrentOpeningHours: details.currentOpeningHours ?? undefined,
      googleOpeningHours: details.regularOpeningHours?.weekdayDescriptions ?? undefined,
      openingHours: details.regularOpeningHours ?? undefined,
      googleUrl: details.googleMapsUri ?? undefined,
      googleWebsite: details.websiteUri ?? undefined,
      googleEditorialSummary: details.editorialSummary?.text ?? undefined,
      googlePriceLevel: details.priceLevel ?? undefined,
      googleLocation: details.location ?? undefined,
      latitude: attraction.latitude ?? details.location?.latitude ?? null,
      longitude: attraction.longitude ?? details.location?.longitude ?? null,
    };
  } catch (err) {
    const diagnostic = err?.diagnostic || classifyGoogleApiError({ status: err?.status, body: err?.body, message: err?.message });
    console.error(`[enrichment] Failed for ${attraction.name}: ${diagnostic} ${err.message}`);
    addDiagnostic(diagnostics, 'error', {
      name: attraction.name,
      diagnostic,
      status: err?.status || null,
      service: err?.service || 'Place Details',
    });
    return {
      ...base,
      googleEnrichmentError: diagnostic,
    };
  }
}

/**
 * Enrich all attractions for a city, running up to `concurrency` in parallel.
 */
export async function enrichAttractionsForCity(attractions, citySlug, concurrency = 3, options = {}) {
  if (!attractions?.length) return attractions;

  const results = [];
  for (let i = 0; i < attractions.length; i += concurrency) {
    const batch = attractions.slice(i, i + concurrency);
    const enriched = await Promise.all(
      batch.map((a) => enrichAttractionWithGoogleData(a, citySlug, options))
    );
    results.push(...enriched);
  }
  return results;
}
