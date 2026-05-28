/**
 * GET /api/cities/[city]/live/prices
 *
 * Placeholder route returning `{ unavailable: true }`. Hooks into the same
 * envelope contract as weather/events so the client surface is uniform.
 * Real backend candidates: internal price index, Numbeo, Kiwi/Skyscanner.
 */
import { NextResponse } from 'next/server';
import { cityById } from '@/generated/cityIndex';

export const runtime = 'nodejs';
export const revalidate = 86400; // 24 h

const SOURCE = 'unconfigured';
const TTL_SECONDS = 86400;

export async function GET(_request, { params }) {
  const { city: slug } = await params;
  const city = cityById[slug];
  const fetchedAt = new Date().toISOString();

  if (!city) {
    return NextResponse.json(
      { source: SOURCE, fetchedAt, ttl: 0, data: null, unavailable: true, error: 'unknown_city' },
      { status: 404 }
    );
  }

  return NextResponse.json(
    {
      source: SOURCE,
      fetchedAt,
      ttl: TTL_SECONDS,
      data: null,
      unavailable: true,
      error: 'provider_not_configured',
    },
    { status: 200, headers: { 'Cache-Control': 'no-store' } }
  );
}
