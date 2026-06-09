import { getRequesterFromAuthHeader, forbiddenResponse } from '@/lib/supabase/requestAuth';
import { getTripWithDetails } from './tripsRepository';
import { canAccessTrip, canWriteTrip } from './tripAccess';

function notFoundResponse() {
  return Response.json({ error: 'Trip not found.' }, { status: 404 });
}

function tripLoadFailedResponse() {
  return Response.json({ error: 'Could not load trip.' }, { status: 502 });
}

/** Share links pass the token as ?share= on the API request. */
function readShareToken(request) {
  try {
    return new URL(request.url).searchParams.get('share') || null;
  } catch {
    return null;
  }
}

async function loadTrip(tripId, getTrip) {
  try {
    return { trip: await getTrip(tripId), loadError: null };
  } catch (error) {
    console.error('[requireTripAccess] trip load failed:', error?.message);
    return { trip: null, loadError: error };
  }
}

/**
 * The `deps` parameter exists for tests; production callers omit it.
 * @returns {Promise<{ trip: object|null, requester: object|null, response: Response|null }>}
 */
export async function requireTripReadAccess(request, tripId, deps = {}) {
  const { getTrip = getTripWithDetails, getRequester = getRequesterFromAuthHeader } = deps;
  const { trip, loadError } = await loadTrip(tripId, getTrip);
  if (loadError) {
    return { trip: null, requester: null, response: tripLoadFailedResponse() };
  }
  if (!trip) {
    return { trip: null, requester: null, response: notFoundResponse() };
  }
  const shareToken = readShareToken(request);
  if (canAccessTrip(trip, null, { shareToken })) {
    return { trip, requester: null, response: null };
  }
  const { requester, response } = await getRequester(request);
  if (response) return { trip, requester: null, response };
  if (!canAccessTrip(trip, requester)) {
    return { trip, requester, response: forbiddenResponse('You do not have access to this trip.') };
  }
  return { trip, requester, response: null };
}

/**
 * The `deps` parameter exists for tests; production callers omit it.
 * @returns {Promise<{ trip: object|null, requester: object|null, response: Response|null }>}
 */
export async function requireTripWriteAccess(request, tripId, deps = {}) {
  const { getTrip = getTripWithDetails, getRequester = getRequesterFromAuthHeader } = deps;
  const { trip, loadError } = await loadTrip(tripId, getTrip);
  if (loadError) {
    return { trip: null, requester: null, response: tripLoadFailedResponse() };
  }
  if (!trip) {
    return { trip: null, requester: null, response: notFoundResponse() };
  }
  const { requester, response } = await getRequester(request);
  if (response) return { trip, requester: null, response };
  if (!canWriteTrip(trip, requester)) {
    return { trip, requester, response: forbiddenResponse('You do not have access to this trip.') };
  }
  return { trip, requester, response: null };
}
