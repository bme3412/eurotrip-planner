import { NextResponse } from 'next/server';
import { getTripWithDetails } from '@/lib/trips/tripsRepository';
import { generateICS } from '@/lib/trips/calendarExport';
import { forbiddenResponse, getRequesterFromAuthHeader } from '@/lib/supabase/requestAuth';

export const runtime = 'nodejs';

function canReadTrip(trip, requester) {
  if (!trip) return false;
  if (trip.is_public === true) return true;

  const ownerId = trip.user_id || null;
  const ownerEmail = trip.user_email || null;
  if (!ownerId && !ownerEmail) return false;
  if (ownerId && requester?.userId === ownerId) return true;
  if (ownerEmail && requester?.userEmail === ownerEmail) return true;
  return false;
}

export async function GET(request, { params }) {
  const { id } = await params;

  try {
    const trip = await getTripWithDetails(id);
    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }
    if (!canReadTrip(trip, null)) {
      const { requester, response } = await getRequesterFromAuthHeader(request);
      if (response) return response;
      if (!canReadTrip(trip, requester)) {
        return forbiddenResponse('You do not have access to this trip calendar.');
      }
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
