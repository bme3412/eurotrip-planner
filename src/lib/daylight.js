/**
 * Approximate daylight hours for a European city in a given month.
 *
 * This is a coarse latitude-band estimate (not an ephemeris), so it is rounded
 * to whole hours to avoid implying false precision. Used by the results list row
 * and the "Most daylight" sort so both agree.
 */

import { getLocalMonthIndex } from '@/lib/utils/dates';

// Daylight hours by month for mid-European latitudes (~48°N), 0-indexed.
const BASE_DAYLIGHT = [8.5, 10, 12, 14, 15.5, 16.5, 16, 14.5, 12.5, 10.5, 9, 8];

// Rough latitude offset by country (hours added in summer, removed in winter).
const LATITUDE_ADJUST = {
  Norway: 2, Sweden: 1.5, Finland: 2, Iceland: 2.5,
  Denmark: 0.5, UK: 0.3, Ireland: 0.3, Estonia: 1,
  Latvia: 0.8, Lithuania: 0.5, Poland: 0.2,
  Spain: -0.5, Portugal: -0.5, Italy: -0.3, Greece: -0.5,
  Malta: -0.7, Cyprus: -0.7,
};

/**
 * @param {number|string|Date} monthOrDate - month index (0-11) or a date.
 * @param {string} [country]
 * @returns {number} whole daylight hours
 */
export function getDaylightHours(monthOrDate, country) {
  const month = typeof monthOrDate === 'number'
    ? monthOrDate
    : getLocalMonthIndex(monthOrDate);
  if (month == null || month < 0 || month > 11) return null;

  const base = BASE_DAYLIGHT[month];
  const adjust = LATITUDE_ADJUST[country] || 0;
  const isSummer = month >= 4 && month <= 8;
  const adjusted = isSummer ? base + adjust : base - adjust * 0.5;

  return Math.round(adjusted);
}

/**
 * Real daylight hours for a latitude on a given date, from the standard
 * sunrise-equation (solar declination + hour angle). Daylight *duration*
 * depends only on latitude and day-of-year (longitude shifts the clock time,
 * not the length), so coordinates alone give a per-city, per-date value — far
 * better than the country-band estimate, which was identical for every city in
 * a latitude band. Returns whole hours; 24/0 at the poles in summer/winter.
 *
 * @param {number} lat - latitude in degrees
 * @param {string|Date} date
 * @returns {number|null} whole daylight hours
 */
export function getDaylightHoursAt(lat, date) {
  if (typeof lat !== 'number' || Number.isNaN(lat)) return null;
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;

  // Day of year (1-based), using local fields to match the displayed month.
  const startOfYear = new Date(d.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((d - startOfYear) / 86400000);

  // Solar declination (radians). 0.40928 rad ≈ Earth's 23.44° axial tilt.
  const decl = 0.40928 * Math.sin((2 * Math.PI / 365) * (dayOfYear - 81));
  const latRad = (lat * Math.PI) / 180;

  const cosH = -Math.tan(latRad) * Math.tan(decl);
  if (cosH >= 1) return 0;   // polar night
  if (cosH <= -1) return 24; // midnight sun
  const hourAngleDeg = (Math.acos(cosH) * 180) / Math.PI;
  return Math.round((2 * hourAngleDeg) / 15);
}

/**
 * Daylight hours for a city: uses real coordinates when present, otherwise
 * falls back to the coarse country-band estimate.
 *
 * @param {{ coordinates?: { lat?: number }, country?: string }} city
 * @param {string|Date} [dateOrMonth]
 * @returns {number|null} whole daylight hours
 */
export function getCityDaylightHours(city, dateOrMonth) {
  const lat = city?.coordinates?.lat;
  const when = dateOrMonth || new Date();
  if (typeof lat === 'number') {
    const h = getDaylightHoursAt(lat, when);
    if (h != null) return h;
  }
  return getDaylightHours(when, city?.country);
}
