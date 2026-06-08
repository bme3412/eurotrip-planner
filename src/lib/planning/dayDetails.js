/**
 * Helpers for surfacing a generated itinerary's per-day detail in the planner
 * day strip. The generated itinerary (from buildMultiCityItinerary) is a flat
 * `days` array: city days carry `timeBlocks` + `accommodation`, and an inter-city
 * travel day (carrying a `transfer`) is inserted immediately after the last day
 * of each city. These keep the day modal's lookups pure and testable.
 */

/**
 * Index the itinerary's days by their ISO date ('yyyy-MM-dd') so a strip day can
 * find its matching generated day in O(1).
 * @param {object} itinerary
 * @returns {Map<string, object>}
 */
export function buildDayDetailsByDate(itinerary) {
  const map = new Map();
  for (const day of itinerary?.days || []) {
    if (day?.date) map.set(day.date, day);
  }
  return map;
}

/**
 * The transfer for `cur` when it's the last day in its city — i.e. the very next
 * day is the inter-city travel day the builder inserts. Null otherwise.
 */
function departureTransfer(cur, next) {
  if (!cur || cur.isTravelDay) return null;
  if (!next?.isTravelDay || !next.transfer) return null;
  // Confirm the travel day departs from this city (when both expose a slug).
  const fromCity = next.transfer.from?.city;
  if (fromCity && cur.city && fromCity !== cur.city) return null;
  return next.transfer;
}

/**
 * The inter-city transfer a traveler takes leaving the city of `isoDate`, but
 * ONLY when that date is the last day in the city. Returns null on travel days,
 * mid-stay days, or the final city.
 * @param {object} itinerary
 * @param {string} isoDate  'yyyy-MM-dd'
 * @returns {object|null} the travel day's `transfer`
 */
export function nextTransferForDate(itinerary, isoDate) {
  const days = itinerary?.days || [];
  if (!days.length || !isoDate) return null;
  const idx = days.findIndex((d) => d.date === isoDate);
  if (idx === -1) return null;
  return departureTransfer(days[idx], days[idx + 1]);
}

/**
 * Index every departing transfer by the ISO date it leaves on, in a single pass.
 * Lets the day strip look up a day's onward transfer in O(1) instead of
 * re-scanning the itinerary per card.
 * @param {object} itinerary
 * @returns {Map<string, object>}
 */
export function buildNextTransferByDate(itinerary) {
  const map = new Map();
  const days = itinerary?.days || [];
  for (let i = 0; i < days.length; i += 1) {
    const cur = days[i];
    if (!cur?.date) continue;
    const transfer = departureTransfer(cur, days[i + 1]);
    if (transfer) map.set(cur.date, transfer);
  }
  return map;
}
