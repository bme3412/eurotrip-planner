/**
 * Stable color assignment for cities in a trip route. Shared by the planner
 * top-bar Day Strip, the RouteTimeline in TripScheduleHeader, and any other
 * surface that needs consistent color-dot identity per city.
 */

export const CITY_PALETTE = [
  '#d97706',
  '#0d9488',
  '#7c3aed',
  '#db2777',
  '#0369a1',
  '#16a34a',
  '#b45309',
  '#4338ca',
];

export function cityKey(city) {
  return city?.id || city?.name?.toLowerCase?.() || null;
}

export function buildCityColors(cities) {
  const out = {};
  (cities || []).forEach((c, i) => {
    const id = cityKey(c);
    if (!id) return;
    out[id] = CITY_PALETTE[i % CITY_PALETTE.length];
  });
  return out;
}
