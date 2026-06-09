import { NextResponse } from 'next/server';
import { generateConciergeDay } from '@/lib/concierge/generateBrief';
import { requireTripReadAccess } from '@/lib/trips/requireTripAccess';
import { enforceRateLimit, RATE_LIMITS } from '@/lib/rateLimit';

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

  const limited = await enforceRateLimit(request, {
    route: 'concierge-brief',
    ...RATE_LIMITS.conciergeBrief,
  });
  if (limited) return limited;

  const { trip, response } = await requireTripReadAccess(request, tripId);
  if (response) return response;

  let body = {};
  try { body = await request.json(); } catch { /* optional */ }
  const dayNumber = Number.isFinite(body?.dayNumber) ? body.dayNumber : null;

  const payload = await generateConciergeDay(trip, dayNumber);
  return NextResponse.json(payload);
}
