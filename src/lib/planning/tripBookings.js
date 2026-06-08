/**
 * Pure helpers for folding a trip's captured flights + lodging into generation.
 *
 * The planner stores flights in `tripState.transport.bookings[]` and lodging in
 * `tripState.route.cities[].accommodation`, but the generate routes never passed
 * them to the builder. These helpers extract a flight-derived trip window, the
 * per-city accommodation map, and the inbound/outbound/leg flights so the
 * generated itinerary can frame arrival/checkout days and show real bookings.
 *
 * Everything is total + side-effect-free, and degrades to empty/null when the
 * fields aren't present, so callers keep today's behavior for flightless trips.
 */

const firstWord = (s) => (s || '').toLowerCase().trim().split(/[\s,]+/)[0] || '';

/** Flights/trains captured on the trip. */
export function getBookings(tripState) {
  const b = tripState?.transport?.bookings;
  return Array.isArray(b) ? b.filter(Boolean) : [];
}

/** The flight that brings the traveler INTO the trip (first arrival). */
export function pickInbound(bookings) {
  const withArr = (bookings || []).filter((b) => b.arrivalDate);
  if (!withArr.length) return null;
  const inbound = withArr.filter((b) => b.direction === 'inbound');
  const pool = inbound.length ? inbound : withArr;
  // Earliest arrival = the moment you land for the trip.
  return [...pool].sort((a, b) => (a.arrivalDate < b.arrivalDate ? -1 : 1))[0] || null;
}

/** The flight that takes the traveler OUT (leaves the last city). */
export function pickOutbound(bookings) {
  const withDep = (bookings || []).filter((b) => b.departureDate);
  if (!withDep.length) return null;
  const outbound = withDep.filter((b) => b.direction === 'outbound');
  if (outbound.length) {
    // Earliest outbound leg = when you leave your last city.
    return [...outbound].sort((a, b) => (a.departureDate < b.departureDate ? -1 : 1))[0];
  }
  // No direction info — latest departure ≈ heading home.
  return [...withDep].sort((a, b) => (a.departureDate > b.departureDate ? -1 : 1))[0] || null;
}

/**
 * Trip window derived from the booked flights: start = inbound arrival,
 * end = outbound departure. Returns null when flights can't bound the trip
 * (caller falls back to the tripState dates).
 */
export function deriveTripWindow(tripState) {
  const bookings = getBookings(tripState);
  const inbound = pickInbound(bookings);
  const outbound = pickOutbound(bookings);
  const startDate = inbound?.arrivalDate || null;
  const endDate = outbound?.departureDate || null;
  if (startDate && endDate && startDate <= endDate) {
    return { startDate, endDate };
  }
  return null;
}

/** Per-city accommodation map, keyed by city id; only cities with real data. */
export function accommodationsByCity(tripState) {
  const out = {};
  for (const c of tripState?.route?.cities || []) {
    const a = c?.accommodation;
    if (c?.id && a && typeof a === 'object' && Object.values(a).some((v) => v != null && v !== '')) {
      out[c.id] = a;
    }
  }
  return out;
}

/**
 * The booked flight for a city-to-city leg, matched loosely by city name
 * (so "Nice" matches a fromCity of "Nice, FR"). Null when none booked.
 */
export function matchFlight(bookings, fromName, toName) {
  if (!Array.isArray(bookings)) return null;
  const f = firstWord(fromName);
  const t = firstWord(toName);
  if (!f || !t) return null;
  return (
    bookings.find(
      (b) => b.type === 'flight' && firstWord(b.fromCity) === f && firstWord(b.toCity) === t,
    ) || null
  );
}
