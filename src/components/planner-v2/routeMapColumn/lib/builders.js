import { buildDayAssignments, parseIsoDate } from '@/lib/conversation/dayAssignments';
import { resolveCity } from './cityResolution.js';

// Pin colours used for confirmed route stops (cycled by stop index).
export const MAP_CITY_PALETTE = [
  '#d97706',
  '#0d9488',
  '#7c3aed',
  '#db2777',
  '#0369a1',
  '#16a34a',
  '#b45309',
  '#4338ca',
];

// Format an ISO date as "Mar 14"; returns null when the date is missing/invalid.
export function formatDayDate(value) {
  const parsed = parseIsoDate(value);
  if (!parsed) return null;
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Build the confirmed route — resolved + sorted by order + decorated with a
// palette colour and shorthand lat/lng accessors for Mapbox.
export function buildRoutePoints(tripState) {
  const cities = [...(tripState?.route?.cities || [])]
    .map(resolveCity)
    .filter((city) => city.id && city.name)
    .sort((a, b) => {
      const ao = Number.isFinite(a.order) ? a.order : 999;
      const bo = Number.isFinite(b.order) ? b.order : 999;
      return ao - bo;
    });

  return cities
    .map((city, index) => ({
      ...city,
      index,
      color: MAP_CITY_PALETTE[index % MAP_CITY_PALETTE.length],
      lng: city.longitude,
      lat: city.latitude,
    }))
    .filter((city) => Number.isFinite(city.lng) && Number.isFinite(city.lat));
}

// Preview cities from the current interaction that haven't been confirmed yet.
export function buildPreviewPoints(interaction, routePoints) {
  const confirmedIds = new Set(routePoints.map((point) => point.id));
  return (interaction?.previewSuggestions || [])
    .map(resolveCity)
    .filter((city) => city.id && city.name && !confirmedIds.has(city.id))
    .map((city, index) => ({
      ...city,
      index,
      color: '#c9a227',
      lng: city.longitude,
      lat: city.latitude,
    }))
    .filter((city) => Number.isFinite(city.lng) && Number.isFinite(city.lat));
}

// Per-day records used by the bottom carousel. Falls back to {nights} when
// the trip hasn't been hardened into a day-assignment list yet.
export function buildDayTabs(tripState, routePoints) {
  const days = buildDayAssignments(tripState);
  if (days.length > 0) {
    return days.map((day) => {
      const point = routePoints.find((city) => city.id === day.cityId);
      return {
        ...day,
        point,
        label: `Day ${day.dayIndex + 1}`,
        dateLabel: formatDayDate(day.date),
      };
    });
  }

  return routePoints.flatMap((point) => {
    const nights = Number.isFinite(point.nights) && point.nights > 0 ? point.nights : 1;
    return Array.from({ length: nights }, (_, offset) => ({
      dayIndex: point.index + offset,
      cityId: point.id,
      cityName: point.name,
      date: null,
      point,
      label: `Day ${point.index + offset + 1}`,
      dateLabel: null,
    }));
  });
}
