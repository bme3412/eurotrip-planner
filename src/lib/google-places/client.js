/**
 * Google Places API (New) client — server-side only.
 *
 * Uses the REST endpoints with X-Goog-Api-Key / X-Goog-FieldMask headers
 * per the "New" API convention.
 */

const BASE_URL = 'https://places.googleapis.com/v1';

export class GooglePlacesApiError extends Error {
  constructor(message, { status = null, body = '', service = 'Google Places' } = {}) {
    super(message);
    this.name = 'GooglePlacesApiError';
    this.status = status;
    this.body = body;
    this.service = service;
    this.diagnostic = classifyGoogleApiError({ status, body, message });
  }
}

export function classifyGoogleApiError({ status = null, body = '', message = '' } = {}) {
  const text = `${message} ${body}`.toLowerCase();
  if (text.includes('google_places_api_key is not set')) return 'missing_api_key';
  if (status === 403 && (text.includes('api key not valid') || text.includes('invalid api key'))) return 'invalid_api_key';
  if (status === 403 && (text.includes('has not been used') || text.includes('not enabled') || text.includes('disabled'))) return 'api_not_enabled';
  if (status === 403 && text.includes('billing')) return 'billing_not_enabled';
  if (status === 429 || text.includes('quota')) return 'quota_exceeded';
  if (status === 400) return 'bad_request';
  return status ? `http_${status}` : 'unknown';
}

export function getGooglePlacesApiKeyStatus() {
  return {
    configured: Boolean(process.env.GOOGLE_PLACES_API_KEY),
  };
}

function getApiKey() {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) {
    throw new GooglePlacesApiError('GOOGLE_PLACES_API_KEY is not set', {
      service: 'Google Places configuration',
    });
  }
  return key;
}

/**
 * Fetch Place Details (New).
 * @param {string} placeId — Google place ID (e.g. "ChIJD7fiBh9u5kcRYJSMaMOCCwQ")
 * @param {string} fieldMask — comma-separated fields
 * @returns {Promise<object>} parsed JSON response
 */
export async function placeDetails(placeId, fieldMask) {
  const res = await fetch(`${BASE_URL}/places/${placeId}`, {
    headers: {
      'X-Goog-Api-Key': getApiKey(),
      'X-Goog-FieldMask': fieldMask,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new GooglePlacesApiError(`Place Details failed (${res.status})`, {
      status: res.status,
      body,
      service: 'Place Details',
    });
  }
  return res.json();
}

/**
 * Text Search (New).
 * @param {string} query — free-text search string
 * @param {object} [options]
 * @param {object} [options.locationBias] — { circle: { center: { latitude, longitude }, radius } }
 * @param {number} [options.maxResultCount] — max results (1-20)
 * @param {string} [options.fieldMask] — response field mask
 * @returns {Promise<object>} parsed JSON with `places` array
 */
export async function textSearch(query, options = {}) {
  const {
    locationBias,
    maxResultCount = 5,
    fieldMask = 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount',
  } = options;

  const body = { textQuery: query, maxResultCount };
  if (locationBias) body.locationBias = locationBias;

  const res = await fetch(`${BASE_URL}/places:searchText`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': getApiKey(),
      'X-Goog-FieldMask': fieldMask,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new GooglePlacesApiError(`Text Search failed (${res.status})`, {
      status: res.status,
      body: text,
      service: 'Text Search',
    });
  }
  return res.json();
}

/**
 * Nearby Search (New).
 * @param {{ latitude: number, longitude: number }} location — center point
 * @param {number} radius — radius in meters
 * @param {string[]} includedTypes — place types (e.g. ["restaurant"])
 * @param {string} [fieldMask]
 * @returns {Promise<object>} parsed JSON with `places` array
 */
export async function nearbySearch(location, radius, includedTypes, fieldMask) {
  const body = {
    locationRestriction: {
      circle: {
        center: location,
        radius,
      },
    },
    includedTypes,
    maxResultCount: 20,
  };

  const mask =
    fieldMask ||
    'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.types';

  const res = await fetch(`${BASE_URL}/places:searchNearby`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': getApiKey(),
      'X-Goog-FieldMask': mask,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new GooglePlacesApiError(`Nearby Search failed (${res.status})`, {
      status: res.status,
      body: text,
      service: 'Nearby Search',
    });
  }
  return res.json();
}

/**
 * Get a Place Photo URL (New) — returns the photo URI without redirecting.
 * @param {string} photoName — resource name e.g. "places/ChIJ.../photos/AUac..."
 * @param {number} maxWidthPx
 * @param {number} [maxHeightPx]
 * @returns {Promise<string>} the photo URI
 */
export async function placePhoto(photoName, maxWidthPx = 800, maxHeightPx) {
  const params = new URLSearchParams({
    key: getApiKey(),
    maxWidthPx: String(maxWidthPx),
    skipHttpRedirect: 'true',
  });
  if (maxHeightPx) params.set('maxHeightPx', String(maxHeightPx));

  const res = await fetch(`${BASE_URL}/${photoName}/media?${params}`);
  if (!res.ok) {
    const text = await res.text();
    throw new GooglePlacesApiError(`Place Photo failed (${res.status})`, {
      status: res.status,
      body: text,
      service: 'Place Photo',
    });
  }
  const data = await res.json();
  return data.photoUri;
}
