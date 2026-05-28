/**
 * Derive the legacy `trip` shape consumed by older PlannerColumn children
 * (start/end city, stops, daysPerCity map, dates, totalDays) from the
 * canonical v2 `tripState`.
 *
 * Pure function — no React, safe to unit-test.
 */
export function buildLegacyTrip(tripState) {
  const cities = tripState?.route?.cities || [];
  const dates = tripState?.dates || {};
  return {
    startCity: cities.find((c) => c.role === 'start') || cities[0] || null,
    endCity: cities.find((c) => c.role === 'end') || null,
    stops: cities.filter((c) => c.role === 'stop'),
    daysPerCity: Object.fromEntries(
      cities.filter((c) => c.nights).map((c) => [c.id, c.nights]),
    ),
    dates,
    totalDays: dates.totalNights,
  };
}
