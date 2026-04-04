/**
 * Consolidated Parsing Utilities for V3 Scoring
 *
 * Replaces duplicate parsing logic from:
 * - easeScoreCalculator.js (parseJourneyTime, parseFrequency, parsePrice)
 * - rankDestinations.js (parseTimeToHours, parsePriceToEur)
 */

import config from '../config/scoringConfig.json';

const { currencyRates } = config;

/**
 * Parse journey time string to minutes.
 * Handles formats: "2h 30m", "2h30m", "150m", "2.5h", "2 hours 15 minutes"
 *
 * @param {string} timeStr - Journey time string
 * @returns {number} Minutes, or Infinity if unparseable
 */
export function parseJourneyTimeMinutes(timeStr) {
  if (!timeStr || timeStr === 'N/A') return Infinity;

  const str = timeStr.toLowerCase().trim();

  // Pattern: "Xh Ym" or "XhYm" format
  const hoursMatch = str.match(/(\d+(?:\.\d+)?)\s*h/);
  const minutesMatch = str.match(/(\d+)\s*m(?:in)?/);

  let totalMinutes = 0;
  if (hoursMatch) totalMinutes += parseFloat(hoursMatch[1]) * 60;
  if (minutesMatch) totalMinutes += parseInt(minutesMatch[1], 10);

  // Pattern: "X hours Y minutes" verbose format
  if (totalMinutes === 0) {
    const verboseHours = str.match(/(\d+)\s*hours?/);
    const verboseMinutes = str.match(/(\d+)\s*minutes?/);
    if (verboseHours) totalMinutes += parseInt(verboseHours[1], 10) * 60;
    if (verboseMinutes) totalMinutes += parseInt(verboseMinutes[1], 10);
  }

  return totalMinutes > 0 ? totalMinutes : Infinity;
}

/**
 * Parse journey time string to hours (for display purposes).
 *
 * @param {string} timeStr - Journey time string
 * @returns {number} Hours as decimal, or 99 if unparseable
 */
export function parseJourneyTimeHours(timeStr) {
  const minutes = parseJourneyTimeMinutes(timeStr);
  if (minutes === Infinity) return 99;
  return Math.round((minutes / 60) * 100) / 100;
}

/**
 * Format minutes to display string.
 *
 * @param {number} totalMinutes - Total minutes
 * @returns {string} Formatted string like "2h 30m"
 */
export function formatMinutesToDisplay(totalMinutes) {
  if (totalMinutes >= Infinity || totalMinutes === 999) return 'N/A';

  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);

  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Parse price string to EUR cents.
 * Handles formats: "€50", "$60", "£40", "50-100", "~75", "€30 - €50"
 *
 * @param {string} priceStr - Price string
 * @returns {number|null} Price in EUR cents, or null if unparseable
 */
export function parsePriceCents(priceStr) {
  if (!priceStr || priceStr === 'N/A') return null;

  const str = priceStr.trim();

  // Detect currency and get rate
  let rate = 1;
  for (const [symbol, r] of Object.entries(currencyRates)) {
    const symbolVariants = {
      EUR: '€',
      GBP: '£',
      USD: '$',
      CHF: 'CHF',
    };
    if (str.includes(symbolVariants[symbol] || symbol)) {
      rate = r;
      break;
    }
  }

  // Handle range "X-Y" or "X – Y" format (take average)
  const range = str.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (range) {
    const avg = (parseInt(range[1], 10) + parseInt(range[2], 10)) / 2;
    return Math.round(avg * rate * 100);
  }

  // Handle single value
  const single = str.match(/(\d+(?:\.\d+)?)/);
  if (single) {
    return Math.round(parseFloat(single[1]) * rate * 100);
  }

  return null;
}

/**
 * Parse price string to EUR (whole euros, for display).
 *
 * @param {string} priceStr - Price string
 * @returns {number} Price in EUR, or 100 as fallback
 */
export function parsePriceEur(priceStr) {
  const cents = parsePriceCents(priceStr);
  if (cents === null) return 100; // Fallback
  return Math.round(cents / 100);
}

/**
 * Parse frequency string to departures per day.
 * Handles: "Every 30 minutes", "Hourly", "4 times daily", "2x per day"
 *
 * @param {string} freqStr - Frequency string
 * @returns {number} Estimated departures per day
 */
export function parseFrequencyPerDay(freqStr) {
  if (!freqStr || freqStr === 'N/A') return 1;

  const lower = freqStr.toLowerCase();
  const operatingHours = 16; // Assume 16 hours of operation

  // "Every X minutes" format
  if (lower.includes('every') && lower.includes('minute')) {
    const match = lower.match(/(\d+)\s*minute/);
    if (match) {
      const minutesPerDeparture = parseInt(match[1], 10);
      return Math.floor((operatingHours * 60) / minutesPerDeparture);
    }
  }

  // "Hourly" format
  if (lower.includes('hourly')) return operatingHours;

  // "Every X hours" format
  if (lower.includes('every') && lower.includes('hour')) {
    const match = lower.match(/(\d+)\s*hour/);
    if (match) {
      return Math.floor(operatingHours / parseInt(match[1], 10));
    }
  }

  // "X times daily" or "X times a day" or "Xx daily"
  const timesMatch = lower.match(/(\d+)\s*(?:times?|x)/);
  if (timesMatch) return parseInt(timesMatch[1], 10);

  // "Daily" or "per day" without number
  if (lower.includes('daily') || lower.includes('day')) return 4;

  // "Multiple" suggests several
  if (lower.includes('multiple')) return 6;

  return 4; // Default fallback
}

/**
 * Parse a date string or Date object to a Date.
 *
 * @param {string|Date} dateInput - Date string (YYYY-MM-DD) or Date object
 * @returns {Date} Parsed Date object
 */
export function parseDate(dateInput) {
  if (dateInput instanceof Date) return dateInput;
  return new Date(dateInput);
}

/**
 * Get the number of days between two dates (inclusive).
 *
 * @param {string|Date} startDate
 * @param {string|Date} endDate
 * @returns {number} Number of days
 */
export function getDayCount(startDate, endDate) {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const diffTime = Math.abs(end - start);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}
