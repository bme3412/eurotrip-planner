/**
 * GET /api/cities/[city]/live/events
 *
 * Placeholder route returning `{ unavailable: true }`. The shape mirrors
 * what `getCityLive('events')` expects so client code can be written today
 * and a real provider (Ticketmaster, Eventbrite, Songkick, ...) can be
 * plugged in later without UI changes.
 */
import { NextResponse } from 'next/server';
import { cityById } from '@/generated/cityIndex';

export const runtime = 'nodejs';
export const revalidate = 21600; // 6 h

const SOURCE = 'unconfigured';
const TTL_SECONDS = 21600;

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
