/**
 * Barrel export that wraps the raw client with caching.
 *
 * Import from here in application code instead of client.js directly.
 */

import * as client from './client.js';
import * as cache from './cache.js';

/**
 * Get place details, hitting cache first.
 * @param {string} placeId
 * @param {string} fieldMask
 * @returns {Promise<object>}
 */
export async function getPlaceDetails(placeId, fieldMask) {
  const cached = await cache.getCachedPlaceDetails(placeId, fieldMask);
  if (cached) return cached;

  const data = await client.placeDetails(placeId, fieldMask);
  await cache.setCachedPlaceDetails(placeId, fieldMask, data);
  return data;
}

/**
 * Text search — not cached (results vary by context).
 */
export async function searchPlaces(query, options) {
  return client.textSearch(query, options);
}

/**
 * Nearby search — not cached.
 */
export async function getNearbyPlaces(location, radius, types, fieldMask) {
  return client.nearbySearch(location, radius, types, fieldMask);
}

/**
 * Get a resolved photo URI, cached briefly (the googleusercontent URL expires).
 * @param {string} photoName — resource name from places.photos[].name
 * @param {number} [width=800]
 * @param {number} [height]
 * @returns {Promise<string>} photo URI
 */
export async function getPlacePhotoUrl(photoName, width = 800, height) {
  const cached = await cache.getCachedPhotoUrl(photoName, width, height);
  if (cached) return cached;

  const url = await client.placePhoto(photoName, width, height);
  await cache.setCachedPhotoUrl(photoName, width, height, url);
  return url;
}

export { clearCache, cacheSize } from './cache.js';
