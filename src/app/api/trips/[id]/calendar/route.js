import { NextResponse } from 'next/server';
import { getTripWithDetails } from '@/lib/trips/tripsRepository';
import { generateICS } from '@/lib/trips/calendarExport';

export const runtime = 'nodejs';

export async function GET(request, { params }) {
  const { id } = await params;

  try {
    const trip = await getTripWithDetails(id);
    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    const ics = generateICS(trip);
    const cityName = (trip.city || 'trip').replace(/\s+/g, '-');

    return new NextResponse(ics, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${cityName}-trip.ics"`,
      },
    });
  } catch (err) {
    console.error('[calendar export]', err);
    return NextResponse.json({ error: 'Failed to generate calendar' }, { status: 500 });
  }
}
