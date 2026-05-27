const ROUTES_MATRIX_URL = 'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix';

class GoogleRoutesApiError extends Error {
  constructor(message, { status = null, body = '' } = {}) {
    super(message);
    this.name = 'GoogleRoutesApiError';
    this.status = status;
    this.body = body;
  }
}

function getApiKey() {
  return process.env.GOOGLE_ROUTES_API_KEY || process.env.GOOGLE_PLACES_API_KEY || null;
}

function toWaypoint(point) {
  return {
    waypoint: {
      location: {
        latLng: {
          latitude: point.latitude,
          longitude: point.longitude,
        },
      },
    },
  };
}

function parseDurationSeconds(value) {
  if (!value || typeof value !== 'string') return null;
  const match = value.match(/^([\d.]+)s$/);
  return match ? Math.round(Number(match[1])) : null;
}

export function isGoogleRoutesConfigured() {
  return Boolean(getApiKey());
}

/**
 * Fetch a travel-time matrix from Google Routes.
 * @param {{ latitude: number, longitude: number }[]} points
 * @param {{ travelMode?: 'WALK' | 'DRIVE' | 'BICYCLE' | 'TRANSIT' }} options
 */
export async function computeTravelMatrix(points, options = {}) {
  const apiKey = getApiKey();
  if (!apiKey || !Array.isArray(points) || points.length < 2) return null;

  const travelMode = options.travelMode || 'WALK';
  const res = await fetch(ROUTES_MATRIX_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'originIndex,destinationIndex,duration,distanceMeters,status,condition',
    },
    body: JSON.stringify({
      origins: points.map(toWaypoint),
      destinations: points.map(toWaypoint),
      travelMode,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new GoogleRoutesApiError(`Routes matrix failed (${res.status})`, {
      status: res.status,
      body,
    });
  }

  const rows = await res.json();
  const matrix = Array.from({ length: points.length }, () => Array(points.length).fill(null));

  for (const row of rows || []) {
    const originIndex = row.originIndex;
    const destinationIndex = row.destinationIndex;
    if (originIndex == null || destinationIndex == null || originIndex === destinationIndex) continue;
    matrix[originIndex][destinationIndex] = {
      durationSeconds: parseDurationSeconds(row.duration),
      distanceMeters: row.distanceMeters ?? null,
      status: row.status ?? null,
      condition: row.condition ?? null,
    };
  }

  return { matrix, travelMode, source: 'google_routes' };
}
