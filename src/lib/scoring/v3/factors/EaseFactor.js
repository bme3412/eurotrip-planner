/**
 * Ease Factor for V3 Scoring
 *
 * Calculates travel accessibility based on:
 * - Transport connections from origin
 * - Journey time
 * - Connection frequency
 * - Price of travel
 */

import { BaseFactor } from '../core/BaseFactor.js';
import {
  parseJourneyTimeMinutes,
  parsePriceCents,
  parseFrequencyPerDay,
} from '../utils/parsers.js';

export class EaseFactor extends BaseFactor {
  /**
   * Check if we have transport data.
   */
  hasRequiredData(input) {
    const { originCity, cityData, enrichmentData } = input;

    // Need origin city to calculate ease
    if (!originCity) {
      return false;
    }

    // Need connection data
    return !!(
      enrichmentData?.connections ||
      cityData?.connections ||
      cityData?.transport
    );
  }

  /**
   * Calculate ease of travel score.
   */
  calculate(input) {
    const { originCity, cityId, cityData, enrichmentData } = input;

    // Get connection data
    const connection = this.findConnection(originCity, cityId, cityData, enrichmentData);

    if (!connection) {
      // No direct connection found
      return this.buildResult(
        40,
        0.4,
        `No direct connection from ${originCity}`,
        'fallback',
        { originCity, hasConnection: false }
      );
    }

    // Calculate component scores
    const durationScore = this.calculateDurationScore(connection);
    const frequencyScore = this.calculateFrequencyScore(connection);
    const priceScore = this.calculatePriceScore(connection);
    const modeBonus = this.getModeBonus(connection);

    // Weighted combination
    const rawScore = Math.round(
      durationScore * 0.45 +
      frequencyScore * 0.25 +
      priceScore * 0.20 +
      modeBonus * 0.10
    );

    // Build reason string
    const durationStr = this.formatDuration(connection);
    const modeStr = connection.mode || connection.type || 'transport';

    let reason;
    if (rawScore >= 80) {
      reason = `Easy access: ${durationStr} by ${modeStr}`;
    } else if (rawScore >= 60) {
      reason = `Accessible: ${durationStr} by ${modeStr}`;
    } else {
      reason = `${durationStr} by ${modeStr}`;
    }

    return this.buildResult(
      rawScore,
      0.8,
      reason,
      'static',
      {
        originCity,
        durationMinutes: parseJourneyTimeMinutes(connection.duration || connection.journeyTime),
        mode: connection.mode || connection.type,
        frequency: connection.frequency,
        price: connection.price,
        durationScore,
        frequencyScore,
        priceScore,
      }
    );
  }

  /**
   * Find connection between origin and destination.
   */
  findConnection(originCity, destCity, cityData, enrichmentData) {
    const originLower = originCity.toLowerCase();

    // Try enrichment connections
    if (enrichmentData?.connections) {
      const conn = this.findInConnections(enrichmentData.connections, originLower);
      if (conn) return conn;
    }

    // Try city data connections
    if (cityData?.connections) {
      const conn = this.findInConnections(cityData.connections, originLower);
      if (conn) return conn;
    }

    // Try transport field
    if (cityData?.transport) {
      const conn = this.findInConnections(cityData.transport, originLower);
      if (conn) return conn;
    }

    return null;
  }

  /**
   * Search connections array/object for origin.
   */
  findInConnections(connections, originLower) {
    if (Array.isArray(connections)) {
      return connections.find(c => {
        const from = (c.from || c.origin || c.city || '').toLowerCase();
        return from.includes(originLower) || originLower.includes(from);
      });
    }

    if (typeof connections === 'object') {
      // Object keyed by city name
      for (const [key, value] of Object.entries(connections)) {
        if (key.toLowerCase().includes(originLower) || originLower.includes(key.toLowerCase())) {
          return { from: key, ...value };
        }
      }
    }

    return null;
  }

  /**
   * Calculate score based on journey duration.
   */
  calculateDurationScore(connection) {
    const minutes = parseJourneyTimeMinutes(connection.duration || connection.journeyTime);

    if (minutes === null || minutes === 0) {
      return 50; // Unknown duration
    }

    // Scoring thresholds
    if (minutes <= 60) return 95;      // Under 1 hour - excellent
    if (minutes <= 120) return 85;     // 1-2 hours - great
    if (minutes <= 180) return 75;     // 2-3 hours - good
    if (minutes <= 240) return 65;     // 3-4 hours - acceptable
    if (minutes <= 360) return 50;     // 4-6 hours - moderate
    if (minutes <= 480) return 40;     // 6-8 hours - challenging
    return 30;                          // Over 8 hours - difficult
  }

  /**
   * Calculate score based on connection frequency.
   */
  calculateFrequencyScore(connection) {
    const perDay = parseFrequencyPerDay(connection.frequency);

    if (perDay === null || perDay === 0) {
      return 50; // Unknown frequency
    }

    // Scoring thresholds
    if (perDay >= 10) return 95;       // Hourly or better
    if (perDay >= 6) return 85;        // Many times a day
    if (perDay >= 4) return 75;        // Several per day
    if (perDay >= 2) return 60;        // A couple per day
    if (perDay >= 1) return 45;        // Daily
    return 30;                          // Less than daily
  }

  /**
   * Calculate score based on price.
   */
  calculatePriceScore(connection) {
    const cents = parsePriceCents(connection.price);

    if (cents === null || cents === 0) {
      return 60; // Unknown price
    }

    const euros = cents / 100;

    // Price thresholds (one-way)
    if (euros <= 20) return 95;        // Very cheap
    if (euros <= 40) return 85;        // Cheap
    if (euros <= 60) return 75;        // Moderate
    if (euros <= 100) return 60;       // Above average
    if (euros <= 150) return 45;       // Expensive
    return 35;                          // Very expensive
  }

  /**
   * Get bonus points for preferred transport modes.
   */
  getModeBonus(connection) {
    const mode = (connection.mode || connection.type || '').toLowerCase();

    // High-speed train is ideal
    if (mode.includes('high-speed') || mode.includes('highspeed') || mode.includes('tgv') ||
        mode.includes('ice') || mode.includes('eurostar') || mode.includes('thalys')) {
      return 100;
    }

    // Regular train is good
    if (mode.includes('train') || mode.includes('rail')) {
      return 85;
    }

    // Bus is acceptable
    if (mode.includes('bus') || mode.includes('coach')) {
      return 60;
    }

    // Flight can be fast but hassle
    if (mode.includes('flight') || mode.includes('plane') || mode.includes('air')) {
      return 70;
    }

    // Ferry is scenic but slow
    if (mode.includes('ferry') || mode.includes('boat')) {
      return 55;
    }

    // Car is flexible
    if (mode.includes('car') || mode.includes('drive')) {
      return 65;
    }

    return 60; // Default
  }

  /**
   * Format duration for display.
   */
  formatDuration(connection) {
    const minutes = parseJourneyTimeMinutes(connection.duration || connection.journeyTime);

    if (minutes === null) {
      return connection.duration || 'unknown duration';
    }

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours === 0) {
      return `${mins}min`;
    }
    if (mins === 0) {
      return `${hours}h`;
    }
    return `${hours}h${mins}min`;
  }
}
