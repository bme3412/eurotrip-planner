/**
 * Crowds Factor for V3 Scoring
 *
 * Calculates crowd impact based on:
 * - Crowd level data from visit calendar
 * - Tourist season patterns
 * - Traveler preference for avoiding crowds
 */

import { BaseFactor } from '../core/BaseFactor.js';
import { normalizeCrowdLevel, getCrowdLevelIndex } from '../utils/normalizers.js';
import { parseDate } from '../utils/parsers.js';

export class CrowdsFactor extends BaseFactor {
  /**
   * Check if we have crowd data.
   */
  hasRequiredData(input) {
    const { enrichmentData, cityData } = input;
    return !!(
      enrichmentData?.crowdLevel ||
      enrichmentData?.crowds ||
      cityData?.visitCalendar?.months ||
      cityData?.seasonality
    );
  }

  /**
   * Calculate crowds score.
   * Higher score = fewer crowds (better for most travelers).
   */
  calculate(input) {
    const { enrichmentData, cityData, startDate, travelerProfile } = input;

    // Try real-time crowd data first
    const crowdData = enrichmentData?.crowdLevel || enrichmentData?.crowds;
    if (crowdData) {
      return this.calculateFromCrowdData(crowdData, travelerProfile);
    }

    // Fall back to calendar-based estimation
    return this.calculateFromCalendar(cityData, startDate, travelerProfile);
  }

  /**
   * Calculate from real crowd data.
   */
  calculateFromCrowdData(crowdData, travelerProfile) {
    // Normalize the crowd level
    const level = typeof crowdData === 'string'
      ? crowdData
      : crowdData.level || crowdData.crowdLevel;

    const normalizedLevel = normalizeCrowdLevel(level);
    const levelIndex = getCrowdLevelIndex(normalizedLevel);

    // Convert to score (inverse - fewer crowds = higher score)
    // levelIndex: 0 (very low) to 4 (very high)
    const baseScore = 100 - (levelIndex * 20);

    // Adjust for traveler preference
    const crowdSensitivity = this.getProfileValue(travelerProfile, 'crowdSensitivity', 'medium');
    const adjustedScore = this.adjustForSensitivity(baseScore, crowdSensitivity);

    return this.buildResult(
      adjustedScore,
      0.85,
      this.getCrowdReason(normalizedLevel),
      'api',
      {
        level: normalizedLevel,
        levelIndex,
        rawLevel: level,
      }
    );
  }

  /**
   * Calculate from visit calendar data.
   */
  calculateFromCalendar(cityData, startDate, travelerProfile) {
    const start = parseDate(startDate) || new Date();
    const month = start.getMonth();
    const monthNames = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'
    ];
    const monthName = monthNames[month];

    // Try to get month-specific crowd data
    const monthData = cityData?.visitCalendar?.months?.find(
      m => m.name?.toLowerCase() === monthName || m.month?.toLowerCase() === monthName
    );

    if (monthData?.crowdLevel || monthData?.crowds) {
      const level = monthData.crowdLevel || monthData.crowds;
      const normalizedLevel = normalizeCrowdLevel(level);
      const levelIndex = getCrowdLevelIndex(normalizedLevel);
      const baseScore = 100 - (levelIndex * 20);

      const crowdSensitivity = this.getProfileValue(travelerProfile, 'crowdSensitivity', 'medium');
      const adjustedScore = this.adjustForSensitivity(baseScore, crowdSensitivity);

      return this.buildResult(
        adjustedScore,
        0.65, // Lower confidence for calendar data
        this.getCrowdReason(normalizedLevel),
        'static',
        {
          level: normalizedLevel,
          monthAnalyzed: monthName,
        }
      );
    }

    // Try seasonality field
    if (cityData?.seasonality?.[monthName]) {
      const seasonData = cityData.seasonality[monthName];
      if (seasonData.crowdLevel || seasonData.touristLevel) {
        const level = seasonData.crowdLevel || seasonData.touristLevel;
        const normalizedLevel = normalizeCrowdLevel(level);
        const levelIndex = getCrowdLevelIndex(normalizedLevel);
        const baseScore = 100 - (levelIndex * 20);

        return this.buildResult(
          baseScore,
          0.6,
          this.getCrowdReason(normalizedLevel),
          'static',
          { level: normalizedLevel, monthAnalyzed: monthName }
        );
      }
    }

    // Try to infer from season patterns
    const inferredScore = this.inferFromSeason(month, cityData);
    if (inferredScore !== null) {
      return this.buildResult(
        inferredScore.score,
        0.5,
        inferredScore.reason,
        'static',
        { inferred: true, monthAnalyzed: monthName }
      );
    }

    // No data - return neutral fallback
    return this.getFallbackResult('No crowd data available');
  }

  /**
   * Infer crowd levels from general European tourism patterns.
   */
  inferFromSeason(month, cityData) {
    // General European tourism patterns
    // Peak: June, July, August, December (Christmas)
    // Shoulder: April, May, September, October
    // Low: January, February, March, November

    const peakMonths = [5, 6, 7, 11]; // June, July, August, December (0-indexed)
    const shoulderMonths = [3, 4, 8, 9]; // April, May, September, October

    // Check if city is a beach destination (different pattern)
    const isBeachCity = this.hasCityTrait(cityData?.cityId, 'beachDestination');

    if (isBeachCity) {
      // Beach destinations: very crowded in summer
      if (month >= 5 && month <= 7) {
        return { score: 30, reason: 'Peak beach season - expect crowds' };
      }
      if (month >= 3 && month <= 4 || month >= 8 && month <= 9) {
        return { score: 55, reason: 'Shoulder season' };
      }
      return { score: 80, reason: 'Off-season - fewer crowds' };
    }

    // Standard city patterns
    if (peakMonths.includes(month)) {
      return { score: 35, reason: 'Peak tourist season' };
    }
    if (shoulderMonths.includes(month)) {
      return { score: 60, reason: 'Shoulder season - moderate crowds' };
    }
    return { score: 80, reason: 'Low season - fewer tourists' };
  }

  /**
   * Adjust score based on traveler's crowd sensitivity.
   */
  adjustForSensitivity(baseScore, sensitivity) {
    // sensitivity: 'low' (doesn't mind), 'medium', 'high' (really dislikes)
    switch (sensitivity) {
      case 'low':
        // Crowds don't bother them - compress score toward 70
        return Math.round(70 + (baseScore - 70) * 0.5);
      case 'high':
        // Really sensitive - amplify the penalty
        if (baseScore < 50) {
          return Math.round(baseScore * 0.8);
        }
        return baseScore;
      default: // medium
        return baseScore;
    }
  }

  /**
   * Get human-readable reason from crowd level.
   */
  getCrowdReason(level) {
    const reasons = {
      'very low': 'Very few tourists',
      'low': 'Fewer crowds',
      'moderate': 'Moderate crowds',
      'high': 'Busy with tourists',
      'very high': 'Peak season - expect crowds',
    };
    return reasons[level] || 'Unknown crowd levels';
  }
}
