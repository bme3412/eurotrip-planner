/**
 * Logistics Factor for V4 Scoring
 *
 * Calculates ease of getting to a city based on:
 * - Connection quality from origin city (using nested transport structure)
 * - Number of destinations/connections
 * - Airport availability
 */

import { BaseFactor } from '../core/BaseFactor.js';

export class LogisticsFactor extends BaseFactor {
  hasRequiredData(input) {
    const { cityData } = input;
    return !!(cityData?.connections?.destinations);
  }

  calculate(input) {
    const { cityData, originCity } = input;

    if (!cityData?.connections) {
      return this.getFallbackResult('No connection data available');
    }

    // If we have an origin city, find specific connection
    if (originCity) {
      const transport = this.getBestTransport(cityData.connections, originCity);
      if (transport) {
        return this.scoreTransport(transport);
      }
    }

    // Otherwise, score based on general connectivity
    return this.scoreGeneralConnectivity(cityData);
  }

  /**
   * Score a specific transport connection
   */
  scoreTransport(transport) {
    const duration = this.parseJourneyMinutes(transport.duration);
    const mode = transport.mode;

    let score = 5;

    // Duration scoring
    if (duration !== null) {
      if (duration <= 60) score = 10;
      else if (duration <= 120) score = 9;
      else if (duration <= 180) score = 8;
      else if (duration <= 240) score = 7;
      else if (duration <= 360) score = 5;
      else if (duration <= 480) score = 3;
      else score = 2;
    }

    // Mode bonus
    if (mode === 'train') score = Math.min(10, score + 0.5);

    // Frequency bonus
    if (transport.frequency) {
      const freq = transport.frequency.toLowerCase();
      if (freq.includes('every 30') || freq.includes('hourly')) {
        score = Math.min(10, score + 0.5);
      }
    }

    const durationStr = this.formatDuration(duration);
    const reason = duration
      ? `${durationStr} by ${mode} from ${transport.fromCity}`
      : `connected to ${transport.fromCity}`;

    return this.buildResult(score, 0.85, reason, {
      durationMinutes: duration,
      mode,
      fromCity: transport.fromCity,
      toCity: transport.toCity,
      frequency: transport.frequency,
    });
  }

  /**
   * Score based on general connectivity (no specific origin)
   */
  scoreGeneralConnectivity(cityData) {
    const connections = cityData.connections;
    let score = 5;
    const reasons = [];

    // Score based on number of destinations
    if (connections.destinations && Array.isArray(connections.destinations)) {
      const destCount = connections.destinations.length;
      if (destCount >= 15) {
        score += 2.5;
        reasons.push('excellent connectivity');
      } else if (destCount >= 10) {
        score += 2;
        reasons.push('well connected');
      } else if (destCount >= 5) {
        score += 1;
        reasons.push('good connections');
      } else if (destCount < 3) {
        score -= 1;
        reasons.push('limited connections');
      }

      // Check for high-speed rail
      const hasHighSpeed = connections.destinations.some(d =>
        d.directWithinCountryTrain?.trainType?.toLowerCase().includes('tgv') ||
        d.directWithinCountryTrain?.trainType?.toLowerCase().includes('ice') ||
        d.intraEuropeTrain?.trainType?.toLowerCase().includes('eurostar')
      );
      if (hasHighSpeed) {
        score += 1;
        reasons.push('high-speed rail');
      }

      // Check for major international connections
      const countries = new Set(connections.destinations.map(d => d.country).filter(Boolean));
      if (countries.size >= 5) {
        score += 1;
        reasons.push('international hub');
      }
    }

    // Nearby airports bonus (from city overview)
    if (cityData.overview?.practical_info?.transport?.airport_options) {
      const airports = cityData.overview.practical_info.transport.airport_options;
      if (airports.length > 0) {
        const hasInternational = airports.some(a =>
          a.name?.toLowerCase().includes('international')
        );
        if (hasInternational) {
          score += 1;
          reasons.push('international airport');
        }
      }
    }

    score = Math.min(10, Math.max(1, score));
    const reason = reasons.length > 0 ? reasons.slice(0, 2).join(', ') : 'average connectivity';

    return this.buildResult(score, 0.7, reason, {
      destinationCount: connections.destinations?.length || 0,
    });
  }

  formatDuration(minutes) {
    if (minutes === null) return 'unknown';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }
}
