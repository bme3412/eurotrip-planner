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
 * The inter-city transfer a traveler takes leaving the city of `isoDate`, but
 * ONLY when that date is the last day in the city (the builder inserts the
 * travel day immediately after). Returns null on travel days, mid-stay days, or
 * the final city.
 * @param {object} itinerary
 * @param {string} isoDate  'yyyy-MM-dd'
 * @returns {object|null} the travel day's `transfer`
 */
export function nextTransferForDate(itinerary, isoDate) {
  const days = itinerary?.days || [];
  if (!days.length || !isoDate) return null;
  const idx = days.findIndex((d) => d.date === isoDate);
  if (idx === -1) return null;

  const current = days[idx];
  if (current.isTravelDay) return null;

  const next = days[idx + 1];
  if (!next?.isTravelDay || !next.transfer) return null;

  // Confirm the travel day departs from this city (when both expose a slug).
  const fromCity = next.transfer.from?.city;
  if (fromCity && current.city && fromCity !== current.city) return null;
  return next.transfer;
}
