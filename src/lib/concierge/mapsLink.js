// Maps directions deep links for the day's schedule. Olivier doesn't rebuild
// navigation — he hands you to Maps with the right destination and mode
// already filled in. iPhones get Apple Maps, everything else Google Maps.
// Pure module: safe on client and server, plain-Node testable; platform
// detection takes the UA as input so callers decide where it comes from.

const BASE = 'https://www.google.com/maps/dir/?api=1';
const APPLE_BASE = 'https://maps.apple.com/';
const WALKING_MAX_KM = 2.0;

function hasCoords(stop) {
  return Number.isFinite(stop?.lat) && Number.isFinite(stop?.lng);
}

/** Distance between two coordinates in km (haversine). */
export function distanceKm(a, b) {
  if (!hasCoords(a) || !hasCoords(b)) return null;
  const rad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/**
 * A stop as a Maps place parameter: precise coordinates when we have them,
 * otherwise a "name, city" search string. Null when neither exists.
 */
export function placeParam(stop, cityName) {
  if (hasCoords(stop)) return `${stop.lat},${stop.lng}`;
  if (stop?.name) return cityName ? `${stop.name}, ${cityName}` : stop.name;
  return null;
}

/** Short hops walk; everything else (or unknown distance) rides transit. */
export function pickTravelMode(from, to) {
  const d = distanceKm(from, to);
  return d != null && d < WALKING_MAX_KM ? 'walking' : 'transit';
}

/**
 * Build a Google Maps directions URL. Omitting origin lets Maps start from
 * the user's current location — the right default mid-trip.
 */
export function directionsUrl({ origin = null, destination, travelmode = 'transit', platform = 'google' } = {}) {
  if (!destination) return null;
  if (platform === 'apple') {
    const params = new URLSearchParams();
    params.set('daddr', destination);
    if (origin) params.set('saddr', origin);
    params.set('dirflg', travelmode === 'walking' ? 'w' : 'r'); // w=walk, r=transit
    return `${APPLE_BASE}?${params.toString()}`;
  }
  const params = new URLSearchParams();
  if (origin) params.set('origin', origin);
  params.set('destination', destination);
  params.set('travelmode', travelmode);
  return `${BASE}&${params.toString()}`;
}

/**
 * Which maps app a user agent should get. iPadOS Safari reports itself as
 * Macintosh, so callers can pass maxTouchPoints to catch it.
 */
export function mapsPlatform(userAgent = '', maxTouchPoints = 0) {
  const ua = String(userAgent || '');
  if (/iPhone|iPad|iPod/i.test(ua)) return 'apple';
  if (/Macintosh/i.test(ua) && maxTouchPoints > 1) return 'apple';
  return 'google';
}

/** Client-side convenience: detect from the live navigator (google on SSR). */
export function detectMapsPlatform() {
  if (typeof navigator === 'undefined') return 'google';
  return mapsPlatform(navigator.userAgent, navigator.maxTouchPoints || 0);
}

/**
 * One directions link per schedule stop: the first leg starts from wherever
 * the traveler is; later legs start from the previous stop.
 * @param {Array<{name, time, lat, lng}>} schedule
 * @returns {Array<{name, time, url}>}
 */
export function legLinks(schedule = [], { cityName, platform = 'google' } = {}) {
  return (schedule || []).map((stop, i) => {
    const destination = placeParam(stop, cityName);
    const prev = i > 0 ? schedule[i - 1] : null;
    return {
      name: stop?.name ?? null,
      time: stop?.time ?? null,
      url: destination
        ? directionsUrl({
            origin: prev ? placeParam(prev, cityName) : null,
            destination,
            travelmode: prev ? pickTravelMode(prev, stop) : 'transit',
            platform,
          })
        : null,
    };
  });
}
