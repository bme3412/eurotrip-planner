/**
 * Beach Factor for V4 Scoring
 *
 * Calculates beach/coastal appeal based on:
 * - Tourism categories (beach, coastal, seaside)
 * - City traits and location
 * - Seasonal suitability for beach activities
 */

import { BaseFactor } from '../core/BaseFactor.js';
import { getMonthName, getMonthIndex, inferCategories } from '../utils/index.js';
import { BEACH_CATEGORIES, BEACH_CITIES } from '../config/beachCities.js';

// Beach season months (good weather for beaches in Europe)
const BEACH_SEASON = [4, 5, 6, 7, 8, 9]; // May through October (0-indexed)

export class BeachFactor extends BaseFactor {
  hasRequiredData(input) {
    return !!input.cityData;
  }

  calculate(input) {
    const { cityData, startDate } = input;
    const cityId = input.cityId || cityData?.cityId || '';

    if (!cityData) {
      return this.getFallbackResult('No city data available');
    }

    // Check if it's a beach city
    const isBeachCity = this.isBeachDestination(cityData, cityId);

    if (!isBeachCity) {
      return this.buildResult(0, 0.9, 'not a beach destination', {
        isBeachCity: false,
      });
    }

    // Calculate beach score based on strength of beach identity
    let baseScore = this.calculateBeachScore(cityData, cityId);

    // Seasonal adjustment
    const seasonalMultiplier = this.getSeasonalMultiplier(startDate, cityData);
    const adjustedScore = baseScore * seasonalMultiplier;

    // Build reason
    let reason = 'beach destination';
    if (seasonalMultiplier >= 0.9) {
      reason = 'great beach weather';
    } else if (seasonalMultiplier < 0.6) {
      reason = 'beach destination, off-season';
    }

    const confidence = 0.85;

    return this.buildResult(adjustedScore, confidence, reason, {
      isBeachCity: true,
      baseScore: Math.round(baseScore * 10) / 10,
      seasonalMultiplier: Math.round(seasonalMultiplier * 100) / 100,
    });
  }

  isBeachDestination(cityData, cityId) {
    const cityLower = cityId.toLowerCase();

    // Check hardcoded list
    if (BEACH_CITIES.some(bc => cityLower.includes(bc) || bc.includes(cityLower))) {
      return true;
    }

    // Check tourism categories (inferred from attractions when absent in data)
    const categories = inferCategories(cityData);
    for (const category of categories) {
      const lower = category.toLowerCase();
      if (BEACH_CATEGORIES.some(bc => lower.includes(bc))) {
        return true;
      }
    }

    // Check for beach-related attractions
    let attractions = cityData.attractions || [];
    if (!Array.isArray(attractions)) {
      attractions = attractions.sites || [];
    }
    const beachAttractions = attractions.filter(a =>
      (a.name || '').toLowerCase().includes('beach') ||
      (a.category || a.type || '').toLowerCase().includes('beach')
    );
    if (beachAttractions.length >= 2) {
      return true;
    }

    return false;
  }

  calculateBeachScore(cityData, cityId) {
    let score = 6; // Base score for beach cities
    const cityLower = cityId.toLowerCase();

    // Premium beach destinations
    const premiumBeaches = ['santorini', 'amalfi', 'dubrovnik', 'nice', 'barcelona', 'palma'];
    if (premiumBeaches.some(pb => cityLower.includes(pb))) {
      score = 9;
    }

    // Check category strength
    const categories = cityData.tourismCategories || [];
    for (const category of categories) {
      const lower = category.toLowerCase();
      if (lower.includes('beach') || lower.includes('coastal')) {
        score += 1;
      }
    }

    // Mediterranean bonus
    if (this.hasTourismCategory(cityData, ['mediterranean'])) {
      score += 0.5;
    }

    return Math.min(10, score);
  }

  getSeasonalMultiplier(startDate, cityData) {
    if (!startDate) return 0.7; // Unknown date, moderate penalty

    const month = getMonthIndex(startDate);

    // Check visit calendar for weather info
    const monthName = getMonthName(startDate);
    const monthData = this.getMonthData(cityData, monthName);

    if (monthData?.weather) {
      const weather = monthData.weather.toLowerCase();
      if (weather.includes('hot') || weather.includes('warm') || weather.includes('sunny')) {
        return 1.0;
      }
      if (weather.includes('mild')) {
        return 0.8;
      }
      if (weather.includes('cold') || weather.includes('rain')) {
        return 0.4;
      }
    }

    // Default seasonal logic
    if (BEACH_SEASON.includes(month)) {
      // Peak summer months
      if (month >= 5 && month <= 7) return 1.0; // June-August
      return 0.85; // May, September, October
    }

    // Off-season
    if (month === 3 || month === 10) return 0.5; // April, November
    return 0.3; // Winter months
  }
}
