import { NextResponse } from 'next/server';
import { getRankedSuggestions } from '@/lib/discovery/getRankedSuggestions';

export const runtime = 'nodejs';

/**
 * GET /api/suggestions?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&limit=20
 * POST /api/suggestions  { dates: { start, end }, interests?, weights? }
 *
 * Query params:
 * - v=2|4: Scoring version (default: 2)
 * - travelerType: couples, families, solo, budget, luxury, culture, foodie, adventure
 * - budget: budget, moderate, luxury (for pricing preference)
 * - originCity: For ease-of-travel scoring (V4)
 * - debug=true: Include debug breakdown (V4 only)
 *
 * V4: Simplified 6-factor scoring (culture, beach, timing, crowds, value, logistics).
 * The ranking itself lives in @/lib/discovery/getRankedSuggestions so it can be
 * reused by React Server Components (e.g. the /results page) with no HTTP hop.
 */

function toResponse(result) {
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data, { status: result.status, headers: result.headers });
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const travelerType = searchParams.get('travelerType');
  const budget = searchParams.get('budget');
  const originCity = searchParams.get('originCity');
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const debug = searchParams.get('debug') === 'true';
  const flat = searchParams.get('flat') === 'true';
  const useLLM = searchParams.get('llm') !== 'false';

  const version = searchParams.get('v') === '4' ? 4 : 2;

  const result = await getRankedSuggestions({
    startDate,
    endDate,
    preferences: { travelerType, budget, originCity },
    limit,
    version,
    debug,
    flat,
    useLLM,
  });
  return toResponse(result);
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { dates, travelerType, budget, originCity, v, debug, flat, llm } = body;

  const vNum = typeof v === 'string' ? parseInt(v, 10) : v;
  const version = vNum === 4 ? 4 : 2;

  const result = await getRankedSuggestions({
    startDate: dates?.start,
    endDate: dates?.end,
    preferences: { travelerType, budget, originCity },
    limit: body.limit || 20,
    version,
    debug,
    flat: flat || false,
    useLLM: llm !== false,
  });
  return toResponse(result);
}
