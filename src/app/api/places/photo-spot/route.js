import fs from 'node:fs';
import path from 'node:path';
import { resolveSpotPhoto } from '@/lib/google-places/spotPhoto';

/**
 * GET /api/places/photo-spot?city=paris&name=Trocadéro+Gardens&lat=48.86&lng=2.28&w=800
 *
 * Resolves a Google Places photo for a photo spot. Responses are cached on
 * disk (7-day TTL) so each unique spot costs at most two Places calls a week
 * regardless of traffic, and browsers/CDN cache the JSON for a day.
 *
 * Degrades to { url: null } without a key or on lookup failure — the UI
 * keeps its gradient placeholder.
 */

const CACHE_FILE = path.join('/tmp', 'photo-spot-cache.json');
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function readCache() {
  try {
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function writeCache(cache) {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache));
  } catch {
    // /tmp unavailable — caching is best-effort
  }
}

const JSON_HEADERS = {
  'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');
  const city = searchParams.get('city') || '';
  const lat = Number.parseFloat(searchParams.get('lat'));
  const lng = Number.parseFloat(searchParams.get('lng'));
  const w = Math.min(1600, Math.max(200, Number.parseInt(searchParams.get('w'), 10) || 800));

  if (!name) {
    return Response.json({ url: null, error: 'name is required' }, { status: 400 });
  }
  if (!process.env.GOOGLE_PLACES_API_KEY) {
    return Response.json({ url: null }, { headers: JSON_HEADERS });
  }

  const cacheKey = `${city.toLowerCase()}|${name.toLowerCase()}|${w}`;
  const cache = readCache();
  const hit = cache[cacheKey];
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return Response.json({ url: hit.url, attribution: hit.attribution || null }, { headers: JSON_HEADERS });
  }

  try {
    const resolved = await resolveSpotPhoto({
      name,
      cityName: city,
      lat: Number.isFinite(lat) ? lat : null,
      lng: Number.isFinite(lng) ? lng : null,
      maxWidthPx: w,
    });
    cache[cacheKey] = {
      url: resolved?.url || null,
      attribution: resolved?.attribution || null,
      at: Date.now(),
    };
    writeCache(cache);
    return Response.json(
      { url: resolved?.url || null, attribution: resolved?.attribution || null },
      { headers: JSON_HEADERS },
    );
  } catch (err) {
    console.error('[photo-spot] lookup failed:', err.message);
    return Response.json({ url: null }, { headers: JSON_HEADERS });
  }
}
