import { NextResponse, after } from 'next/server';
import { generateConciergeDay, getConciergeDayCached } from '@/lib/concierge/generateBrief';
import { buildConciergeContext } from '@/lib/concierge/buildContext';
import { requireTripReadAccess } from '@/lib/trips/requireTripAccess';
import { enforceRateLimit, RATE_LIMITS } from '@/lib/rateLimit';

export const runtime = 'nodejs';
// The rich brief LLM call runs ~19s; without this Vercel kills the function at
// its default (~10s) and returns 504 FUNCTION_INVOCATION_TIMEOUT. The budget
// also covers the after() stale-while-revalidate regeneration.
export const maxDuration = 60;

/**
 * GET /api/trips/[id]/concierge-brief
 *
 * Scaffold-only fast path: the deterministic bundle (meta, day list,
 * personalization) with no LLM call, so the page can paint immediately for
 * private trips whose facts can't be SSR'd. Not rate-limited (cheap).
 */
export async function GET(request, { params }) {
  const { id: tripId } = await params;
  const { trip, response } = await requireTripReadAccess(request, tripId);
  if (response) return response;

  const ctx = buildConciergeContext(trip);
  return NextResponse.json({
    meta: ctx.meta,
    days: ctx.days,
    personalization: ctx.personalization,
    initialDayNumber: ctx.selectedDay?.dayNumber ?? null,
  });
}

/**
 * POST /api/trips/[id]/concierge-brief   body: { dayNumber?: number }
 *
 * Thin HTTP wrapper over the shared generator (also used by the notification
 * send pipeline). Returns { meta, days[], personalization, day }.
 *
 * Serving order: durable-store hit (free, instant) → stale hit (served
 * immediately, regenerated in the background) → rate-limited generation.
 * Only actual LLM generations consume rate-limit budget — the client prefetches
 * every day of a trip, and cached serves must not lock users out.
 */
export async function POST(request, { params }) {
  const { id: tripId } = await params;

  const { trip, response } = await requireTripReadAccess(request, tripId);
  if (response) return response;

  let body = {};
  try { body = await request.json(); } catch { /* optional */ }
  const dayNumber = Number.isFinite(body?.dayNumber) ? body.dayNumber : null;
  const wantsStream = body?.stream === true;

  const cached = await getConciergeDayCached(trip, dayNumber);
  if (cached && !cached.stale) return NextResponse.json(cached.payload);
  if (cached && cached.stale) {
    // Stale-while-revalidate: the schedule/facts in the payload are already
    // current (recomputed); only the prose lags one edit behind. Serve it now,
    // regenerate after the response flushes.
    after(() =>
      generateConciergeDay(trip, dayNumber, { force: true }).catch((err) =>
        console.error('[concierge] SWR regeneration failed:', err?.message)
      )
    );
    return NextResponse.json({ ...cached.payload, stale: true });
  }

  const limited = await enforceRateLimit(request, {
    route: 'concierge-brief',
    ...RATE_LIMITS.conciergeBrief,
  });
  if (limited) return limited;

  if (!wantsStream) {
    const payload = await generateConciergeDay(trip, dayNumber);
    return NextResponse.json(payload);
  }

  // Streaming generation: NDJSON lines of { type: 'partial', prose } as the
  // model writes the brief, ending with { type: 'done', payload }. The client
  // renders the prose composing itself instead of a pulsing skeleton.
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj) => {
        try { controller.enqueue(encoder.encode(`${JSON.stringify(obj)}\n`)); } catch { /* client gone */ }
      };
      try {
        const payload = await generateConciergeDay(trip, dayNumber, {
          onPartial: (prose) => send({ type: 'partial', prose }),
        });
        send({ type: 'done', payload });
      } catch (err) {
        console.error('[concierge] streaming generation failed:', err?.message);
        send({ type: 'error' });
      } finally {
        try { controller.close(); } catch { /* already closed */ }
      }
    },
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
    },
  });
}
