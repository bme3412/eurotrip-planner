import { NextResponse } from 'next/server';
import { getRequesterFromAuthHeader } from '@/lib/supabase/requestAuth';
import { listTripsForUser } from '@/lib/trips/tripsRepository';
import { sendConciergeBrief } from '@/lib/concierge/notify';

export const runtime = 'nodejs';
export const maxDuration = 60; // generates a brief

/**
 * POST /api/concierge/send-now   body: { tripId?: string, dayNumber?: number }
 *
 * The "send tonight's brief now" button. Generates and delivers a concierge
 * notification for the signed-in user. If no tripId is given, picks their active
 * trip (or most recent). Only ever sends for a trip the requester owns.
 */
export async function POST(request) {
  const { requester, response } = await getRequesterFromAuthHeader(request);
  if (response) return response;

  let body = {};
  try { body = await request.json(); } catch { /* optional */ }
  const dayNumber = Number.isFinite(body?.dayNumber) ? body.dayNumber : null;

  const trips = await listTripsForUser({ userId: requester.userId, userEmail: requester.userEmail });
  if (!trips.length) {
    return NextResponse.json({ error: 'No trips to brief yet.' }, { status: 404 });
  }

  // Resolve the target trip — must belong to the requester.
  let trip;
  if (body?.tripId) {
    trip = trips.find((t) => t.id === body.tripId);
    if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
  } else {
    const today = new Date().toISOString().slice(0, 10);
    trip =
      trips.find((t) => t.status === 'active' && (!t.start_date || t.start_date <= today) && (!t.end_date || t.end_date >= today)) ||
      trips[0];
  }

  const result = await sendConciergeBrief({ tripId: trip.id, dayNumber, type: 'evening_brief' });
  if (!result.ok) {
    return NextResponse.json({ error: 'Could not send brief', reason: result.reason }, { status: 502 });
  }
  return NextResponse.json({ ok: true, tripId: trip.id, notificationId: result.notification?.id });
}
