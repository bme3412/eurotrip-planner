/**
 * Resolve a real photo for a named photo spot via Google Places (New).
 *
 * One Text Search (location-biased to the spot's coordinates when present)
 * picks the place; one Place Photo media call resolves the image URI.
 * Author attribution is returned so the UI can satisfy Places photo
 * display requirements.
 *
 * Dependencies are injectable for plain-Node testing (next/server-free).
 */

import { textSearch, placePhoto } from './client.js';

/**
 * @param {object} spot
 * @param {string} spot.name        — landmark name (e.g. "Trocadéro Gardens")
 * @param {string} [spot.cityName]  — city for query disambiguation
 * @param {number} [spot.lat]
 * @param {number} [spot.lng]
 * @param {number} [spot.maxWidthPx]
 * @param {object} [deps]           — { search, photo } overrides for tests
 * @returns {Promise<{url: string, attribution: string|null}|null>}
 */
export async function resolveSpotPhoto(
  { name, cityName = '', lat = null, lng = null, maxWidthPx = 800 },
  { search = textSearch, photo = placePhoto } = {},
) {
  if (!name) return null;

  const options = {
    maxResultCount: 1,
    fieldMask: 'places.displayName,places.photos',
  };
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    options.locationBias = {
      circle: { center: { latitude: lat, longitude: lng }, radius: 1500 },
    };
  }

  const res = await search([name, cityName].filter(Boolean).join(' '), options);
  const place = Array.isArray(res?.places) ? res.places[0] : null;
  const photoMeta = Array.isArray(place?.photos) ? place.photos[0] : null;
  if (!photoMeta?.name) return null;

  const url = await photo(photoMeta.name, maxWidthPx);
  if (!url) return null;

  const attribution = photoMeta.authorAttributions?.[0]?.displayName || null;
  return { url, attribution };
}
