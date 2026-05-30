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
