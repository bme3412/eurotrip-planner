/**
 * Baseline Factor for V3 Scoring
 *
 * Calculates static city quality score based on:
 * - Visit calendar ratings (best months)
 * - Attraction count and quality
 * - City traits alignment
 * - Data completeness
 */

import { BaseFactor } from '../core/BaseFactor.js';
import { parseDate, getDayCount } from '../utils/parsers.js';

export class BaselineFactor extends BaseFactor {
  /**
   * Check if we have minimum data for baseline scoring.
   */
  hasRequiredData(input) {
    return input.cityId != null;
  }

  /**
   * Calculate baseline score from static city data.
   */
  calculate(input) {
    const { cityId, startDate, endDate, cityData, enrichmentData } = input;

    // Get visit calendar data
    const calendar = this.getVisitCalendar(cityData, enrichmentData);
    const seasonalityScore = this.calculateSeasonalityScore(calendar, startDate, endDate);

    // Get attraction quality score
    const attractionScore = this.calculateAttractionScore(cityData);

    // Get data completeness score
    const completenessScore = this.calculateCompletenessScore(cityData);

    // Weight the components
    const rawScore = Math.round(
      seasonalityScore * 0.5 +      // Seasonality is primary for baseline
      attractionScore * 0.3 +       // Attractions matter
      completenessScore * 0.2       // Penalize incomplete data slightly
    );

    // Confidence based on data availability
    const confidence = this.calculateConfidence(calendar, cityData);

    // Build reason string
    const reasons = [];
    if (seasonalityScore >= 70) reasons.push('good season');
    else if (seasonalityScore < 40) reasons.push('off-season');
    if (attractionScore >= 70) reasons.push('rich attractions');
    if (completenessScore < 50) reasons.push('limited data');

    const reason = reasons.length > 0
      ? `Baseline: ${reasons.join(', ')}`
      : 'Average baseline score';

    return this.buildResult(
      rawScore,
      confidence,
      reason,
      calendar ? 'static' : 'fallback',
      {
        seasonalityScore,
        attractionScore,
        completenessScore,
        monthsAnalyzed: calendar?.months?.length || 0,
      }
    );
  }

  /**
   * Get visit calendar from city data or enrichment.
   */
  getVisitCalendar(cityData, enrichmentData) {
    // Try city data first
    if (cityData?.visitCalendar) {
      return cityData.visitCalendar;
    }

    // Try enrichment data
    if (enrichmentData?.calendar) {
      return enrichmentData.calendar;
    }

    return null;
  }

  /**
   * Calculate seasonality score based on visit calendar and trip dates.
   */
  calculateSeasonalityScore(calendar, startDate, endDate) {
    if (!calendar?.months || !startDate) {
      return this.factorConfig.fallbackScore ?? 50;
    }

    const start = parseDate(startDate);
    const end = endDate ? parseDate(endDate) : start;
    if (!start) return 50;

    // Get months covered by trip
    const startMonth = start.getMonth(); // 0-11
    const endMonth = end.getMonth();

    // For single-month trips or same-month
    if (startMonth === endMonth) {
      return this.getMonthScore(calendar, startMonth);
    }

    // Multi-month trip: average the months
    let totalScore = 0;
    let monthCount = 0;

    for (let m = startMonth; m <= endMonth; m++) {
      totalScore += this.getMonthScore(calendar, m);
      monthCount++;
    }

    return Math.round(totalScore / monthCount);
  }

  /**
   * Get score for a specific month from calendar.
   */
  getMonthScore(calendar, monthIndex) {
    const monthNames = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'
    ];
    const monthName = monthNames[monthIndex];

    // Try to find month data
    const monthData = calendar.months?.find(m =>
      m.name?.toLowerCase() === monthName ||
      m.month?.toLowerCase() === monthName
    );

    if (monthData) {
      // Convert various rating formats to 0-100
      if (typeof monthData.rating === 'number') {
        // If 0-5 scale
        if (monthData.rating <= 5) {
          return this.fromLegacyScale(monthData.rating);
        }
        // If already 0-100
        return monthData.rating;
      }

      // Handle string ratings
      if (monthData.rating === 'peak' || monthData.rating === 'best') return 90;
      if (monthData.rating === 'good' || monthData.rating === 'shoulder') return 70;
      if (monthData.rating === 'fair' || monthData.rating === 'average') return 50;
      if (monthData.rating === 'poor' || monthData.rating === 'off') return 30;
    }

    // Check bestMonths array
    if (calendar.bestMonths?.includes(monthName)) {
      return 85;
    }

    // Check worstMonths array
    if (calendar.worstMonths?.includes(monthName)) {
      return 25;
    }

    // Default to neutral
    return 50;
  }

  /**
   * Calculate attraction quality score.
   */
  calculateAttractionScore(cityData) {
    if (!cityData) return 50;

    const attractions = cityData.attractions || [];
    const count = attractions.length;

    // No attractions = poor score
    if (count === 0) return 20;

    // Base score on count (diminishing returns)
    let score = Math.min(40, count * 4); // Max 40 from count

    // Add quality bonus for highly rated attractions
    const highRated = attractions.filter(a =>
      (a.rating && a.rating >= 4.5) ||
      (a.mustSee === true) ||
      (a.category === 'UNESCO')
    ).length;

    score += Math.min(40, highRated * 10); // Max 40 from quality

    // Diversity bonus (different categories)
    const categories = new Set(attractions.map(a => a.category).filter(Boolean));
    score += Math.min(20, categories.size * 4); // Max 20 from diversity

    return Math.min(100, score);
  }

  /**
   * Calculate data completeness score.
   */
  calculateCompletenessScore(cityData) {
    if (!cityData) return 30;

    let score = 0;
    const checks = [
      { field: 'attractions', weight: 25 },
      { field: 'visitCalendar', weight: 20 },
      { field: 'neighborhoods', weight: 15 },
      { field: 'connections', weight: 15 },
      { field: 'coordinates', weight: 10 },
      { field: 'country', weight: 5 },
      { field: 'description', weight: 5 },
      { field: 'tourismCategories', weight: 5 },
    ];

    for (const check of checks) {
      const value = cityData[check.field];
      if (value != null && (Array.isArray(value) ? value.length > 0 : true)) {
        score += check.weight;
      }
    }

    return score;
  }

  /**
   * Calculate confidence based on data availability.
   */
  calculateConfidence(calendar, cityData) {
    let confidence = 0.5; // Base confidence

    if (calendar?.months?.length >= 12) {
      confidence += 0.25; // Full calendar
    } else if (calendar?.months?.length > 0) {
      confidence += 0.15; // Partial calendar
    }

    if (cityData?.attractions?.length >= 5) {
      confidence += 0.15; // Good attraction data
    }

    if (cityData?._meta?.source === 'google_places') {
      confidence += 0.1; // Verified source
    }

    return Math.min(1, confidence);
  }
}
