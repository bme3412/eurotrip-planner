/**
 * Enriches attraction data with live Google Places details.
 *
 * Reads pre-resolved place_ids from public/data/google-place-ids.json
 * and fetches fresh details (rating, reviews, photos, hours, summary).
 */

import fs from 'fs';
import path from 'path';
import { getPlaceDetails } from './index.js';

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

/**
 * Enrich a single attraction with Google Places data.
 * Returns the original attraction merged with Google fields, or unchanged on failure.
 */
export async function enrichAttractionWithGoogleData(attraction, citySlug) {
  const map = loadPlaceIdMap();
  const entry = map?.[citySlug]?.[attraction.name];
  if (!entry?.placeId) return attraction;

  try {
    const details = await getPlaceDetails(entry.placeId, ENRICHMENT_FIELD_MASK);

    return {
      ...attraction,
      googlePlaceId: entry.placeId,
      googleRating: details.rating ?? undefined,
      googleReviewCount: details.userRatingCount ?? undefined,
      googlePhotos: (details.photos || []).slice(0, 5).map((p) => ({
        name: p.name,
        widthPx: p.widthPx,
        heightPx: p.heightPx,
      })),
      currentlyOpen: details.currentOpeningHours?.openNow ?? undefined,
      googleOpeningHours: details.regularOpeningHours?.weekdayDescriptions ?? undefined,
      googleUrl: details.googleMapsUri ?? undefined,
      googleEditorialSummary: details.editorialSummary?.text ?? undefined,
      googlePriceLevel: details.priceLevel ?? undefined,
    };
  } catch (err) {
    console.error(`[enrichment] Failed for ${attraction.name}: ${err.message}`);
    return attraction;
  }
}

/**
 * Enrich all attractions for a city, running up to `concurrency` in parallel.
 */
export async function enrichAttractionsForCity(attractions, citySlug, concurrency = 3) {
  if (!attractions?.length) return attractions;

  const results = [];
  for (let i = 0; i < attractions.length; i += concurrency) {
    const batch = attractions.slice(i, i + concurrency);
    const enriched = await Promise.all(
      batch.map((a) => enrichAttractionWithGoogleData(a, citySlug))
    );
    results.push(...enriched);
  }
  return results;
}
