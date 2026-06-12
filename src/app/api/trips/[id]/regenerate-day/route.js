import { NextResponse } from 'next/server';
import { requireTripWriteAccess } from '@/lib/trips/requireTripAccess';
import { enforceRateLimit } from '@/lib/rateLimit';
import { regenerateDayPlan, applyRegeneratedDay } from '@/lib/planning/regenerateDay';

export const runtime = 'nodejs';
// The curator call runs up to 30s; give the route room.
export const maxDuration = 60;

/**
 * POST /api/trips/[id]/regenerate-day
 *
 * Two-phase "redo this day" with free-text steering:
 *   { dayNumber, direction? }            → preview: { plan } (no writes)
 *   { dayNumber, apply: true, plan }     → replace the day's activities with
 *     the previewed plan, set the theme, bump trips.updated_at.
 *
 * Owner-only (write access). The preview is grounded in the city's candidate
 * pool server-side; apply sanitizes the echoed plan field-by-field. The
 * itinerary is untouched unless apply succeeds.
 */
export async function POST(request, { params }) {
  const { id: tripId } = await params;

  const limited = await enforceRateLimit(request, { route: 'regenerate-day', limit: 20, windowSec: 3600 });
  if (limited) return limited;

  const { trip, response } = await requireTripWriteAccess(request, tripId);
  if (response) return response;

  let body = {};
  try { body = await request.json(); } catch { /* */ }
  const dayNumber = Number(body?.dayNumber);
  if (!Number.isFinite(dayNumber)) {
    return NextResponse.json({ error: 'dayNumber is required.' }, { status: 400 });
  }

  if (body?.apply === true) {
    const result = await applyRegeneratedDay(trip, dayNumber, body.plan);
    if (result.error) return NextResponse.json({ error: result.error }, { status: 422 });
    return NextResponse.json({ ok: true, summary: result.summary });
  }

  const direction = typeof body?.direction === 'string' ? body.direction.trim().slice(0, 500) : null;
  const result = await regenerateDayPlan(trip, dayNumber, { direction });
  if (result.error) return NextResponse.json({ error: result.error }, { status: 422 });
  return NextResponse.json({ plan: result.plan });
}
