/**
 * Pure date/allocation resolution for itinerary generation: turn a normalized
 * trip state into the concrete window and per-city night allocation the
 * builder needs. Extracted from the generate route so it's unit-testable.
 */

import { getAnchorCities } from './tripLifecycle';
import { deriveTripWindow } from '@/lib/planning/tripBookings';

/** Whole nights between two YYYY-MM-DD dates (UTC-safe component math). */
export function nightsBetween(start, end) {
  if (!start || !end) return null;
  const s = new Date(`${start}T00:00:00`);
  const e = new Date(`${end}T00:00:00`);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return null;
  return Math.round((e - s) / 86400000);
}

/** Resolve flexible dates ("June, 6 nights") into concrete start/end dates. */
export function deriveConcreteDates(tripState) {
  let startDate = tripState.dates.startDate;
  let endDate = tripState.dates.endDate;

  if (!startDate && tripState.dates.flexibleMonth && tripState.dates.totalNights) {
    const [year, month] = tripState.dates.flexibleMonth.split('-');
    if (year && month) {
      startDate = `${year}-${month}-01`;
    }
  }

  if (startDate && !endDate && tripState.dates.totalNights) {
    const date = new Date(`${startDate}T00:00:00`);
    date.setDate(date.getDate() + tripState.dates.totalNights);
    endDate = date.toISOString().slice(0, 10);
  }

  return { startDate, endDate };
}

/**
 * Resolve everything the itinerary builder needs from a normalized trip state.
 *
 * The flight-derived window wins over planner dates (constrain the trip to the
 * booked flights). If the per-city nights don't fit the resolved window, the
 * explicit allocation is dropped so the builder re-fits the real night count —
 * keeps day-count, dates, and flights in agreement.
 *
 * @returns {{ cities: Array, startDate: string|null, endDate: string|null,
 *             dayAllocation: object|null, errors: string[] }}
 */
export function resolveGenerationWindow(tripState) {
  const cities = getAnchorCities(tripState).map((city) => ({
    id: city.id,
    name: city.name,
    country: city.country,
  }));

  const flightWindow = deriveTripWindow(tripState);
  const concrete = deriveConcreteDates(tripState);
  const startDate = flightWindow?.startDate || concrete.startDate;
  const endDate = flightWindow?.endDate || concrete.endDate;

  const errors = [];
  if (cities.length < 1) errors.push("At least 1 city is required.");
  if (!startDate) errors.push("A start date or flexible month is required.");
  if (!endDate) errors.push("An end date or total night count is required.");

  let dayAllocation = Object.fromEntries(
    tripState.route.cities
      .filter((city) => city.id && city.nights > 0)
      .map((city) => [city.id, city.nights])
  );

  const windowNights = nightsBetween(startDate, endDate);
  const allocatedNights = Object.values(dayAllocation).reduce((a, b) => a + b, 0);
  if (windowNights != null && allocatedNights !== windowNights) {
    dayAllocation = null;
  }

  return { cities, startDate, endDate, dayAllocation, errors };
}
