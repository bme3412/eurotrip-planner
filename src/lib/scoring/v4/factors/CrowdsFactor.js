/**
 * Crowds Factor for V4 Scoring
 *
 * Calculates crowd levels from visitCalendar ranges.
 * Higher score = fewer crowds (better for most travelers).
 */

import { BaseFactor } from '../core/BaseFactor.js';

const CROWD_SCORES = {
  'very low': 10,
  'low': 8,
  'moderate': 6,
  'high': 4,
  'very high': 2,
  'extreme': 1
};

export class CrowdsFactor extends BaseFactor {
  hasRequiredData(input) {
    const { cityData, startDate } = input;
    return !!(startDate && cityData?.visitCalendar);
  }

  calculate(input) {
    const { cityData, startDate } = input;

    if (!startDate) {
      return this.getFallbackResult('No dates specified');
    }

    // Get range data for the date
    const rangeData = this.getRangeForDate(cityData, startDate);

    let crowdLevel = null;
    let source = 'inferred';
    let score;
    let confidence;
    let reason;

    if (rangeData?.crowdLevel) {
      // Found crowd level in range data
      crowdLevel = this.normalizeCrowdLevel(rangeData.crowdLevel);
      score = this.getScoreFromLevel(crowdLevel);
      confidence = 0.85;
      source = 'calendar';
      reason = this.getReasonFromLevel(crowdLevel);
    } else if (rangeData?.monthData?.tourismLevel) {
      // Infer from tourism level (1-10, higher = more crowded)
      const tourismLevel = rangeData.monthData.tourismLevel;
      score = Math.max(1, 10 - tourismLevel);
      crowdLevel = this.levelFromScore(score);
      confidence = 0.65;
      source = 'tourismLevel';
      reason = tourismLevel >= 7 ? 'busy tourist season' : 'moderate tourism';
    } else {
      // Infer from month
      const inferred = this.inferFromSeason(rangeData?.monthName, cityData);
      score = inferred.score;
      crowdLevel = inferred.level;
      confidence = 0.5;
      reason = inferred.reason;
    }

    return this.buildResult(score, confidence, reason, {
      crowdLevel,
      month: rangeData?.monthName,
      source,
    });
  }

  normalizeCrowdLevel(raw) {
    if (!raw) return 'moderate';
    const lower = raw.toLowerCase().trim();

    // Direct matches
    if (CROWD_SCORES[lower] !== undefined) return lower;

    // Partial matches
    if (lower.includes('very low') || lower === 'empty' || lower === 'quiet') return 'very low';
    if (lower.includes('very high') || lower === 'packed') return 'very high';
    if (lower.includes('extreme')) return 'extreme';
    if (lower.includes('high') || lower.includes('busy')) return 'high';
    if (lower.includes('low') || lower.includes('sparse')) return 'low';

    return 'moderate';
  }

  getScoreFromLevel(level) {
    return CROWD_SCORES[level] ?? 5;
  }

  levelFromScore(score) {
    if (score >= 9) return 'very low';
    if (score >= 7) return 'low';
    if (score >= 5) return 'moderate';
    if (score >= 3) return 'high';
    if (score >= 2) return 'very high';
    return 'extreme';
  }

  getReasonFromLevel(level) {
    const reasons = {
      'very low': 'nearly empty, great for exploring',
      'low': 'uncrowded, easy access to sights',
      'moderate': 'manageable crowds',
      'high': 'popular time, book ahead',
      'very high': 'very busy, expect queues',
      'extreme': 'peak crowds, advance booking essential'
    };
    return reasons[level] || 'unknown crowd level';
  }

  inferFromSeason(monthName, cityData) {
    const isMajorCity = this.isMajorTouristDestination(cityData);

    const peakMonths = ['june', 'july', 'august', 'december'];
    const shoulderMonths = ['april', 'may', 'september', 'october'];

    if (peakMonths.includes(monthName)) {
      return {
        score: isMajorCity ? 2 : 4,
        level: isMajorCity ? 'very high' : 'high',
        reason: 'peak season'
      };
    }

    if (shoulderMonths.includes(monthName)) {
      return {
        score: isMajorCity ? 5 : 7,
        level: 'moderate',
        reason: 'shoulder season'
      };
    }

    return {
      score: isMajorCity ? 7 : 9,
      level: isMajorCity ? 'moderate' : 'low',
      reason: 'low season'
    };
  }

  isMajorTouristDestination(cityData) {
    const majorCities = [
      'paris', 'london', 'rome', 'barcelona', 'amsterdam', 'prague',
      'vienna', 'berlin', 'madrid', 'lisbon', 'venice', 'florence',
      'dublin', 'munich', 'budapest', 'athens', 'santorini'
    ];
    const cityId = (cityData?.city || cityData?.cityId || '').toLowerCase();
    return majorCities.some(mc => cityId.includes(mc));
  }
}
