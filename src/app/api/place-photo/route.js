import { NextResponse } from 'next/server';
import { textSearch, placePhoto, getGooglePlacesApiKeyStatus } from '@/lib/google-places/client';

/**
 * GET /api/place-photo?q=<name>&lat=&lng=&w=&h=
 *
 * Resolves a real Google Place photo for a free-text place (e.g. an itinerary
 * activity) without a precomputed placeId: one Text Search (biased by lat/lng
 * when given, requesting the photos field mask) → first photo → 302 redirect to
 * the media URL. Results are cached in-process and at the CDN so repeat lookups
 * for the same activity are cheap. Returns 404 (not an error page) when no photo
 * exists so the client can fall back to its gradient.
 */

// name|lat|lng -> photo resource name (or '' for a known miss). Process-local.
const photoNameCache = new Map();
const MAX_CACHE = 500;

function cacheSet(key, val) {
  if (photoNameCache.size >= MAX_CACHE) {
    photoNameCache.delete(photoNameCache.keys().next().value);
  }
  photoNameCache.set(key, val);
}

function clampDim(v, def) {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return def;
  return Math.max(100, Math.min(1600, n));
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();
  const lat = parseFloat(searchParams.get('lat'));
  const lng = parseFloat(searchParams.get('lng'));
  const w = clampDim(searchParams.get('w'), 800);
  const h = searchParams.get('h') ? clampDim(searchParams.get('h'), undefined) : undefined;

  if (!q) return NextResponse.json({ error: 'q is required' }, { status: 400 });
  if (!getGooglePlacesApiKeyStatus().configured) {
    return NextResponse.json({ error: 'photos unavailable' }, { status: 404 });
  }

  const key = `${q}|${Number.isFinite(lat) ? lat.toFixed(3) : ''}|${Number.isFinite(lng) ? lng.toFixed(3) : ''}`;

  try {
    let photoName = photoNameCache.get(key);

    if (photoName === undefined) {
      const options = {
        maxResultCount: 1,
        fieldMask: 'places.id,places.photos',
      };
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        options.locationBias = { circle: { center: { latitude: lat, longitude: lng }, radius: 3000 } };
      }
      const data = await textSearch(q, options);
      photoName = data?.places?.[0]?.photos?.[0]?.name || '';
      cacheSet(key, photoName); // cache misses too, to avoid re-searching
    }

    if (!photoName) {
      return NextResponse.json({ error: 'no photo' }, {
        status: 404,
        headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=604800' },
      });
    }

    const url = await placePhoto(photoName, w, h);
    return NextResponse.redirect(url, {
      status: 302,
      headers: {
        // Browser 1d, CDN 7d — photo URLs are stable enough and re-resolve cheaply.
        'Cache-Control': 'public, max-age=86400, s-maxage=604800',
      },
    });
  } catch (err) {
    const status = err?.status === 429 ? 429 : 502;
    return NextResponse.json({ error: 'photo lookup failed' }, { status });
  }
}
