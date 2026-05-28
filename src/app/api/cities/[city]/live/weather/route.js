/**
 * GET /api/cities/[city]/live/weather
 *
 * Live weather overlay backed by Open-Meteo (free, no API key required).
 * Returns the uniform live envelope expected by `getCityLive`.
 *
 * Cache strategy:
 *   - Node runtime, ISR-style revalidate every 30 minutes.
 *   - `Cache-Control` advertises a matching s-maxage so the CDN coalesces
 *     repeat hits.
 *   - On upstream failure we return `{ unavailable: true }` so the UI can
 *     fall back to the static monthly climatology in /data/.../monthly/*.json.
 */
import { NextResponse } from 'next/server';
import { cityById } from '@/generated/cityIndex';

export const runtime = 'nodejs';
export const revalidate = 1800; // 30 min

const TTL_SECONDS = 1800;
const SOURCE = 'open-meteo';
const ENDPOINT = 'https://api.open-meteo.com/v1/forecast';

function buildUpstreamUrl(latitude, longitude) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: [
      'temperature_2m',
      'apparent_temperature',
      'relative_humidity_2m',
      'precipitation',
      'weather_code',
      'wind_speed_10m',
      'is_day',
    ].join(','),
    daily: ['temperature_2m_max', 'temperature_2m_min', 'precipitation_sum', 'weather_code'].join(','),
    forecast_days: '5',
    timezone: 'auto',
  });
  return `${ENDPOINT}?${params.toString()}`;
}

function envelope(data, extra = {}) {
  return {
    source: SOURCE,
    fetchedAt: new Date().toISOString(),
    ttl: TTL_SECONDS,
    data,
    ...extra,
  };
}

export async function GET(_request, { params }) {
  const { city: slug } = await params;
  const city = cityById[slug];

  if (!city || typeof city.latitude !== 'number' || typeof city.longitude !== 'number') {
    return NextResponse.json(
      envelope(null, { unavailable: true, error: 'unknown_city_or_missing_coords' }),
      { status: 404 }
    );
  }

  const url = buildUpstreamUrl(city.latitude, city.longitude);

  try {
    // Next 15 fetch-level cache. The route-level `revalidate` covers RSC
    // consumers; this `next.revalidate` covers direct API hits.
    const res = await fetch(url, { next: { revalidate: TTL_SECONDS } });
    if (!res.ok) {
      return NextResponse.json(
        envelope(null, { unavailable: true, error: `upstream_${res.status}` }),
        {
          status: 200,
          headers: { 'Cache-Control': 'no-store' },
        }
      );
    }
    const raw = await res.json();
    return NextResponse.json(
      envelope({
        coords: { latitude: city.latitude, longitude: city.longitude },
        timezone: raw.timezone,
        current: raw.current,
        daily: raw.daily,
      }),
      {
        status: 200,
        headers: {
          'Cache-Control': `public, s-maxage=${TTL_SECONDS}, stale-while-revalidate=86400`,
        },
      }
    );
  } catch (err) {
    return NextResponse.json(
      envelope(null, { unavailable: true, error: err.message }),
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
