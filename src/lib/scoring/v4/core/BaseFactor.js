/**
 * Base Factor Class for V4 Scoring
 *
 * Abstract base class for the simplified 6-factor scoring system.
 * All scores output on 0-10 scale.
 */

import config from '../config/scoringConfig.json' with { type: 'json' };
import { clamp } from '../utils/index.js';

/**
 * @typedef {Object} FactorResult
 * @property {number} score - Score on 0-10 scale
 * @property {number} confidence - Confidence in this score (0-1)
 * @property {string} reason - Human-readable explanation
 * @property {Object} [details] - Factor-specific details
 */

export class BaseFactor {
  constructor(factorConfig) {
    this.config = config;
    this.factorConfig = factorConfig;
    this.name = this.constructor.name.replace('Factor', '').toLowerCase();
  }

  /**
   * Calculate factor score. Must be implemented by subclasses.
   * @param {Object} input - Scoring input data
   * @returns {FactorResult}
   */
  calculate(input) {
    throw new Error(`${this.constructor.name}.calculate() must be implemented`);
  }

  /**
   * Check if this factor has sufficient data to calculate.
   * @param {Object} input - Scoring input data
   * @returns {boolean}
   */
  hasRequiredData(input) {
    return true;
  }

  /**
   * Get fallback result when data is missing.
   * @param {string} reason - Why fallback is being used
   * @returns {FactorResult}
   */
  getFallbackResult(reason) {
    return {
      score: this.factorConfig.fallbackScore ?? 5,
      confidence: 0.3,
      reason: reason || 'Data unavailable',
    };
  }

  /**
   * Build a successful result.
   * @param {number} score - Score on 0-10 scale
   * @param {number} confidence - Confidence (0-1)
   * @param {string} reason - Human-readable reason
   * @param {Object} [details] - Additional details
   * @returns {FactorResult}
   */
  buildResult(score, confidence, reason, details = null) {
    return {
      score: clamp(Math.round(score * 10) / 10, 0, 10),
      confidence: clamp(confidence, 0, 1),
      reason,
      ...(details && { details }),
    };
  }

  /**
   * Get month data from visit calendar.
   * Handles both array format and object format.
   * @param {Object} cityData
   * @param {string} monthName - lowercase month name
   * @returns {Object|null}
   */
  getMonthData(cityData, monthName) {
    if (!cityData?.visitCalendar?.months || !monthName) return null;

    const months = cityData.visitCalendar.months;

    // Object format: { january: {...}, february: {...} }
    if (!Array.isArray(months)) {
      return months[monthName] || null;
    }

    // Array format: [ { name: 'January', ... }, ... ]
    return months.find(m =>
      m.name?.toLowerCase() === monthName ||
      m.month?.toLowerCase() === monthName
    );
  }

  /**
   * Check if city has a specific tourism category.
   * @param {Object} cityData
   * @param {string[]} categories - categories to check
   * @returns {boolean}
   */
  hasTourismCategory(cityData, categories) {
    const cityCategories = cityData?.tourismCategories || [];
    return categories.some(cat =>
      cityCategories.some(c =>
        c.toLowerCase().includes(cat.toLowerCase())
      )
    );
  }

  /**
   * Get the range data for a specific date from visitCalendar.
   * Handles the ranges-based structure: months.june.ranges[{days: [1,2,3], score, crowdLevel, ...}]
   * @param {Object} cityData
   * @param {Date|string} date
   * @returns {Object|null} - The range object containing the date
   */
  getRangeForDate(cityData, date) {
    if (!date) return null;

    const d = typeof date === 'string' ? new Date(date) : date;
    const monthNames = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'
    ];
    const monthName = monthNames[d.getMonth()];
    const dayOfMonth = d.getDate();

    const monthData = this.getMonthData(cityData, monthName);
    if (!monthData?.ranges || !Array.isArray(monthData.ranges)) return null;

    // Find the range containing this day
    for (const range of monthData.ranges) {
      if (range.days && Array.isArray(range.days) && range.days.includes(dayOfMonth)) {
        return { ...range, monthData, monthName };
      }
    }

    // If no specific range found, return first range as fallback
    return monthData.ranges[0] ? { ...monthData.ranges[0], monthData, monthName } : null;
  }

  /**
   * Get the best transport option from connections for a given origin city.
   * Handles nested structure: directWithinCountryTrain, intraEuropeTrain, intraEuropeFlight
   * @param {Object} connections - city connections data
   * @param {string} originCity - origin city name
   * @returns {Object|null} - Best transport option with duration, mode, frequency
   */
  getBestTransport(connections, originCity) {
    if (!connections?.destinations || !originCity) return null;

    const originLower = originCity.toLowerCase();

    // Find the destination matching origin
    const dest = connections.destinations.find(d => {
      const city = (d.city || '').toLowerCase();
      return city.includes(originLower) || originLower.includes(city);
    });

    if (!dest) return null;

    // Priority order: train within country > intra-Europe train > flight > bus
    const transportOptions = [
      { key: 'directWithinCountryTrain', mode: 'train', priority: 1 },
      { key: 'intraEuropeTrain', mode: 'train', priority: 2 },
      { key: 'intraEuropeFlight', mode: 'flight', priority: 3 },
      { key: 'bus', mode: 'bus', priority: 4 },
      { key: 'ferry', mode: 'ferry', priority: 5 },
    ];

    for (const opt of transportOptions) {
      const transport = dest[opt.key];
      if (transport && (transport.journeyTime || transport.approxFlightTime)) {
        return {
          mode: opt.mode,
          duration: transport.journeyTime || transport.approxFlightTime,
          frequency: transport.frequency,
          station: transport.stationInOrigin || transport.stationInBarcelona,
          priceRange: transport.priceRange,
          fromCity: originCity,
          toCity: dest.city,
        };
      }
    }

    return null;
  }

  /**
   * Parse journey time string to minutes.
   * @param {string} timeStr - e.g., "2h 30m", "45m", "3h"
   * @returns {number|null}
   */
  parseJourneyMinutes(timeStr) {
    if (!timeStr || timeStr === 'N/A') return null;
    const str = timeStr.toLowerCase().trim();

    const hoursMatch = str.match(/(\d+(?:\.\d+)?)\s*h/);
    const minutesMatch = str.match(/(\d+)\s*m(?:in)?/);

    let total = 0;
    if (hoursMatch) total += parseFloat(hoursMatch[1]) * 60;
    if (minutesMatch) total += parseInt(minutesMatch[1], 10);

    return total > 0 ? total : null;
  }
}
