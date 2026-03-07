/**
 * Timing Factor for V4 Scoring
 *
 * Calculates how good the specific dates are for visiting based on:
 * - Score from visitCalendar ranges (1-5 scale)
 * - Weather from month-level weatherHighC/weatherLowC
 * - Events from range data
 */

import { BaseFactor } from '../core/BaseFactor.js';

export class TimingFactor extends BaseFactor {
  hasRequiredData(input) {
    const { cityData, startDate } = input;
    return !!(startDate && cityData?.visitCalendar?.months);
  }

  calculate(input) {
    const { cityData, startDate, endDate } = input;

    if (!startDate) {
      return this.getFallbackResult('No dates specified');
    }

    // Get range data for start date
    const rangeData = this.getRangeForDate(cityData, startDate);

    if (!rangeData) {
      return this.getFallbackResult('No calendar data for dates');
    }

    // Calculate component scores
    const seasonalityScore = this.calculateSeasonalityScore(rangeData);
    const weatherScore = this.calculateWeatherScore(rangeData.monthData);
    const eventsScore = this.calculateEventsScore(rangeData);

    // Weighted combination based on config
    const weights = this.factorConfig.components || { weather: 0.4, events: 0.25, seasonality: 0.35 };
    const rawScore =
      seasonalityScore * weights.seasonality +
      weatherScore * weights.weather +
      eventsScore * weights.events;

    // Build confidence
    const confidence = this.calculateConfidence(rangeData);

    // Build specific reason with actual data
    const reason = this.buildSpecificReason(rangeData, seasonalityScore, weatherScore);

    return this.buildResult(rawScore, confidence, reason, {
      seasonality: Math.round(seasonalityScore * 10) / 10,
      weather: Math.round(weatherScore * 10) / 10,
      events: Math.round(eventsScore * 10) / 10,
      month: rangeData.monthName,
      calendarScore: rangeData.score,
      event: rangeData.event || null,
      weatherHighC: rangeData.monthData?.weatherHighC,
      weatherLowC: rangeData.monthData?.weatherLowC,
    });
  }

  /**
   * Calculate seasonality score from range's score field (1-5 → 0-10)
   */
  calculateSeasonalityScore(rangeData) {
    if (rangeData.score !== undefined) {
      // Range score is 1-5, convert to 0-10
      return Math.min(10, rangeData.score * 2);
    }

    // Try tourismLevel from month
    if (rangeData.monthData?.tourismLevel) {
      // tourismLevel can be 1-10, use as-is
      return Math.min(10, rangeData.monthData.tourismLevel);
    }

    return 5; // Default neutral
  }

  /**
   * Calculate weather score from month-level temperature data
   */
  calculateWeatherScore(monthData) {
    if (!monthData) return 5;

    const high = monthData.weatherHighC;
    const low = monthData.weatherLowC;

    if (high === undefined) return 5;

    // Calculate average temperature
    const avg = low !== undefined ? (high + low) / 2 : high;

    // Ideal range: 18-26°C
    if (avg >= 18 && avg <= 26) return 9;
    if (avg >= 15 && avg <= 28) return 8;
    if (avg >= 12 && avg <= 30) return 7;
    if (avg >= 8 && avg <= 32) return 5;
    if (avg < 5 || avg > 35) return 3;

    return 5;
  }

  /**
   * Calculate events score from range data
   */
  calculateEventsScore(rangeData) {
    let score = 5; // Base neutral score

    // Check for special event in range
    if (rangeData.special && rangeData.event) {
      score += 3;

      // Bonus for significant events
      const eventLower = rangeData.event.toLowerCase();
      if (eventLower.includes('festival') || eventLower.includes('carnival')) {
        score += 1;
      }
    }

    // Check notes for event mentions
    if (rangeData.notes) {
      const notesLower = rangeData.notes.toLowerCase();
      const eventKeywords = ['festival', 'celebration', 'parade', 'concert', 'market'];
      if (eventKeywords.some(kw => notesLower.includes(kw))) {
        score += 1;
      }
    }

    return Math.min(10, score);
  }

  calculateConfidence(rangeData) {
    let confidence = 0.5;

    if (rangeData.score !== undefined) confidence += 0.2;
    if (rangeData.monthData?.weatherHighC !== undefined) confidence += 0.15;
    if (rangeData.crowdLevel) confidence += 0.1;
    if (rangeData.notes) confidence += 0.05;

    return Math.min(1, confidence);
  }

  /**
   * Build a specific, compelling reason with actual data
   */
  buildSpecificReason(rangeData, seasonalityScore, weatherScore) {
    const parts = [];
    const high = rangeData.monthData?.weatherHighC;
    const month = rangeData.monthName;

    // Lead with event if present
    if (rangeData.event) {
      return rangeData.event;
    }

    // Weather-based reason with temperature
    if (high !== undefined) {
      if (high >= 25 && high <= 30) {
        parts.push(`${high}°C, perfect for sightseeing`);
      } else if (high >= 20 && high < 25) {
        parts.push(`${high}°C, ideal weather`);
      } else if (high >= 15 && high < 20) {
        parts.push(`${high}°C, mild and pleasant`);
      } else if (high >= 30) {
        parts.push(`${high}°C, warm but great for beaches`);
      } else if (high < 15 && high >= 8) {
        parts.push(`${high}°C, crisp weather`);
      } else if (high < 8) {
        parts.push(`${high}°C, winter atmosphere`);
      }
    }

    // Season-based additions
    if (seasonalityScore >= 8 && !parts.length) {
      parts.push('peak season');
    } else if (seasonalityScore <= 4) {
      parts.push('shoulder season prices');
    }

    if (parts.length === 0) {
      // Fallback based on month
      const monthDescriptions = {
        'january': 'winter escape',
        'february': 'pre-spring quiet',
        'march': 'early spring',
        'april': 'spring blooms',
        'may': 'warm spring days',
        'june': 'early summer',
        'july': 'peak summer',
        'august': 'high summer',
        'september': 'warm autumn',
        'october': 'fall colors',
        'november': 'late autumn',
        'december': 'festive season'
      };
      parts.push(monthDescriptions[month] || 'good timing');
    }

    return parts[0];
  }
}
