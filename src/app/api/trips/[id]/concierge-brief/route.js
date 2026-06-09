import { NextResponse } from 'next/server';
import { getTripWithDetails } from '@/lib/trips/tripsRepository';
import { generateConciergeDay } from '@/lib/concierge/generateBrief';

export const runtime = 'nodejs';
// The rich brief LLM call runs ~19s; without this Vercel kills the function at
// its default (~10s) and returns 504 FUNCTION_INVOCATION_TIMEOUT.
export const maxDuration = 60;

/**
 * POST /api/trips/[id]/concierge-brief   body: { dayNumber?: number }
 *
 * Thin HTTP wrapper over generateConciergeDay (the shared generator, also used by
 * the notification send pipeline). Returns { meta, days[], personalization, day }.
 */
export async function POST(request, { params }) {
  const { id: tripId } = await params;

  let body = {};
  try { body = await request.json(); } catch { /* optional */ }
  const dayNumber = Number.isFinite(body?.dayNumber) ? body.dayNumber : null;

  let trip;
  try {
    trip = await getTripWithDetails(tripId);
  } catch (err) {
    console.error('[concierge-brief] trip load failed:', err?.message);
    return NextResponse.json({ error: 'Could not load trip' }, { status: 502 });
  }
  if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });

  const payload = await generateConciergeDay(trip, dayNumber);
  return NextResponse.json(payload);
}
