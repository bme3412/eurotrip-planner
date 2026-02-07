import { NextResponse } from 'next/server';
import { scoreCitiesForDates } from '@/lib/scoring/cityScorer';

export const runtime = 'nodejs';

/**
 * GET /api/suggestions?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&limit=20
 * POST /api/suggestions  { dates: { start, end }, interests?, weights? }
 *
 * Returns scored city suggestions based on visit calendar data.
 */

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const travelerType = searchParams.get('travelerType');
  const limit = parseInt(searchParams.get('limit') || '20', 10);

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: 'startDate and endDate are required' },
      { status: 400 }
    );
  }

  return scoreAndRespond(startDate, endDate, travelerType, limit);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { dates } = body;

    if (!dates?.start || !dates?.end) {
      return NextResponse.json(
        { error: 'dates.start and dates.end are required' },
        { status: 400 }
      );
    }

    return scoreAndRespond(dates.start, dates.end, null, 20);
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}

async function scoreAndRespond(startDate, endDate, travelerType, limit) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return NextResponse.json(
      { error: 'Invalid date format. Use ISO dates (YYYY-MM-DD).' },
      { status: 400 }
    );
  }

  if (end <= start) {
    return NextResponse.json(
      { error: 'endDate must be after startDate' },
      { status: 400 }
    );
  }

  try {
    const results = await scoreCitiesForDates({
      startDate: start,
      endDate: end,
      travelerType,
      limit,
    });

    // Return in the shape the homepage ResultsGrid / ResultCard expects
    return NextResponse.json({
      items: results,
      meta: {
        startDate,
        endDate,
        travelerType,
        totalScored: results.length,
      },
    });
  } catch (error) {
    console.error('Suggestions API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}
