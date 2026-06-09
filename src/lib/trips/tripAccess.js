/**
 * Shared trip access rules for API routes and SSR pages.
 *
 * @typedef {{ userId: string, userEmail: string|null }} TripRequester
 */

/**
 * @param {object|null} trip
 * @param {TripRequester|null} requester
 * @param {{ write?: boolean, shareToken?: string|null }} [options]
 */
export function canAccessTrip(trip, requester, { write = false, shareToken = null } = {}) {
  if (!trip) return false;

  if (!write) {
    if (trip.is_public === true) return true;
    if (shareToken && trip.share_token && shareToken === trip.share_token) return true;
  }

  const ownerId = trip.user_id || null;
  const ownerEmail = trip.user_email || null;
  const hasOwner = Boolean(ownerId || ownerEmail);
  if (!hasOwner || !requester) return false;
  if (ownerId && requester.userId === ownerId) return true;
  if (ownerEmail && requester.userEmail && ownerEmail === requester.userEmail) return true;
  return false;
}

/** @param {object|null} trip @param {TripRequester|null} requester */
export function canWriteTrip(trip, requester) {
  return canAccessTrip(trip, requester, { write: true });
}

/** Readable without signing in (public trip or valid share link). */
export function isTripPubliclyReadable(trip, shareToken = null) {
  return canAccessTrip(trip, null, { shareToken });
}
