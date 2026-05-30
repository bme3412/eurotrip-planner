/**
 * Dynamic Weight Calculator for V4 Scoring
 *
 * Calculates context-sensitive factor weights based on:
 * - City type (beach, cultural, inland)
 * - Weather/temperature for the dates
 * - Season and time of year
 *
 * Weights always sum to 1.0 and are rebalanced when factors are reduced.
 */

import { getMonthIndex, inferCategories } from '../utils/index.js';
import { BEACH_CATEGORIES, BEACH_CITIES } from '../config/beachCities.js';

// Cultural hub identifiers
const CULTURAL_CATEGORIES = [
  'museum', 'art', 'historical', 'cultural', 'heritage', 'unesco',
  'architecture', 'gallery', 'opera', 'theater'
];

// Base weights (fallback when config.dynamicWeights.baseWeights is absent).
// Keep in sync with scoringConfig.json -> dynamicWeights.baseWeights.
// `value` is 0 because no city currently carries price data (the factor is
// disabled in config); its weight is redistributed to higher-signal factors.
const BASE_WEIGHTS = {
  culture: 0.25,
  beach: 0.10,
  timing: 0.30,
  crowds: 0.22,
  value: 0.0,
  logistics: 0.13,
};

export class DynamicWeightCalculator {
  constructor(config = {}) {
    this.baseWeights = config.baseWeights || BASE_WEIGHTS;
    this.beachTempThresholds = config.beachTempThresholds || {
      full: 25,    // Full beach weight
      good: 20,    // Good beach weather
      mild: 15,    // Swimmable for some
      cold: 10,    // Coastal charm only
    };
  }

  /**
   * Calculate dynamic weights for a city/date combination.
   *
   * @param {Object} params
   * @param {Object} params.cityData - City data including tourismCategories
   * @param {Date|string} params.startDate - Trip start date
   * @param {Date|string} params.endDate - Trip end date
   * @param {Object} params.weatherData - Weather data with weatherHighC
   * @param {Object} params.rangeData - Visit calendar range data
   * @returns {Object} - { weights, reasoning, adjustments }
   */
  calculate({ cityData, startDate, endDate, weatherData, rangeData }) {
    const cityId = cityData?.cityId || cityData?.city || '';
    const weights = { ...this.baseWeights };
    const reasoning = {};
    const adjustments = [];

    // Get temperature and season info
    const temp = weatherData?.weatherHighC ?? rangeData?.monthData?.weatherHighC;
    const month = startDate ? getMonthIndex(startDate) : new Date().getMonth();
    const season = this.getSeason(month);

    // 1. Beach weight adjustment
    const beachAdjustment = this.calculateBeachWeight(cityData, cityId, temp, season);
    weights.beach = beachAdjustment.weight;
    reasoning.beach = beachAdjustment.reason;

    // Track how much weight we freed up or need to add
    const beachDelta = this.baseWeights.beach - weights.beach;

    // 2. Culture weight adjustment
    const cultureAdjustment = this.calculateCultureWeight(cityData, season, beachDelta);
    weights.culture = cultureAdjustment.weight;
    reasoning.culture = cultureAdjustment.reason;

    // 3. Timing weight adjustment (events boost timing importance)
    const hasEvent = rangeData?.special || rangeData?.event;
    if (hasEvent) {
      weights.timing = 0.30;
      reasoning.timing = `boosted for event: ${rangeData.event || 'special event'}`;
      adjustments.push({ factor: 'timing', change: +0.05, reason: 'event active' });
    }

    // 4. Value weight adjustment (peak season makes value more important)
    if (season === 'summer' || month === 11) { // Summer or December
      weights.value = 0.18;
      reasoning.value = 'peak season pricing';
      adjustments.push({ factor: 'value', change: +0.03, reason: 'peak season' });
    }

    // 5. Rebalance to ensure weights sum to 1.0
    const rebalanced = this.rebalanceWeights(weights);

    return {
      weights: rebalanced,
      reasoning,
      adjustments,
      meta: {
        isBeachCity: beachAdjustment.isBeachCity,
        isCulturalHub: cultureAdjustment.isCulturalHub,
        temperature: temp,
        season,
        month,
      },
    };
  }

  /**
   * Calculate beach factor weight based on city type and temperature.
   */
  calculateBeachWeight(cityData, cityId, temp, season) {
    const isBeachCity = this.isBeachDestination(cityData, cityId);

    if (!isBeachCity) {
      return {
        weight: 0,
        reason: 'inland city',
        isBeachCity: false,
      };
    }

    // Beach city - weight depends on temperature
    let weight;
    let reason;

    if (temp === undefined || temp === null) {
      // No temperature data, use season-based defaults
      if (season === 'summer') {
        weight = 0.22;
        reason = 'beach city, summer season';
      } else if (season === 'spring' || season === 'fall') {
        weight = 0.12;
        reason = 'beach city, shoulder season';
      } else {
        weight = 0.05;
        reason = 'beach city, winter';
      }
    } else if (temp >= this.beachTempThresholds.full) {
      weight = 0.25;
      reason = `beach weather (${temp}°C)`;
    } else if (temp >= this.beachTempThresholds.good) {
      weight = 0.18;
      reason = `good beach weather (${temp}°C)`;
    } else if (temp >= this.beachTempThresholds.mild) {
      weight = 0.10;
      reason = `mild coastal weather (${temp}°C)`;
    } else if (temp >= this.beachTempThresholds.cold) {
      weight = 0.05;
      reason = `coastal charm (${temp}°C)`;
    } else {
      weight = 0.03;
      reason = `winter coastal (${temp}°C)`;
    }

    return { weight, reason, isBeachCity: true };
  }

  /**
   * Calculate culture factor weight.
   */
  calculateCultureWeight(cityData, season, beachDeltaToRedistribute) {
    const isCulturalHub = this.isCulturalDestination(cityData);
    let weight = this.baseWeights.culture;
    let reason = 'standard cultural weight';

    // Cultural hubs get a boost
    if (isCulturalHub) {
      weight += 0.05;
      reason = 'cultural hub';
    }

    // Winter boosts indoor/cultural activities
    if (season === 'winter') {
      weight += 0.05;
      reason = isCulturalHub ? 'cultural hub, winter boost' : 'winter cultural activities';
    }

    // Redistribute some of the beach weight reduction
    if (beachDeltaToRedistribute > 0) {
      const cultureBoost = Math.min(beachDeltaToRedistribute * 0.5, 0.05);
      weight += cultureBoost;
      reason += ` (+${Math.round(cultureBoost * 100)}% from beach)`;
    }

    return {
      weight: Math.min(weight, 0.35), // Cap at 35%
      reason,
      isCulturalHub,
    };
  }

  /**
   * Check if city is a beach destination.
   */
  isBeachDestination(cityData, cityId) {
    const cityLower = (cityId || '').toLowerCase();

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
    let attractions = cityData?.attractions || [];
    if (!Array.isArray(attractions)) {
      attractions = attractions.sites || [];
    }
    const beachAttractions = attractions.filter(a =>
      (a.name || '').toLowerCase().includes('beach') ||
      (a.category || a.type || '').toLowerCase().includes('beach')
    );

    return beachAttractions.length >= 2;
  }

  /**
   * Check if city is a cultural hub.
   */
  isCulturalDestination(cityData) {
    const categories = inferCategories(cityData);

    // Check for cultural categories
    for (const category of categories) {
      const lower = category.toLowerCase();
      if (CULTURAL_CATEGORIES.some(cc => lower.includes(cc))) {
        return true;
      }
    }

    // Check attraction count for museums/galleries
    let attractions = cityData?.attractions || [];
    if (!Array.isArray(attractions)) {
      attractions = attractions.sites || [];
    }

    const culturalAttractions = attractions.filter(a => {
      const type = (a.type || a.category || '').toLowerCase();
      return type.includes('museum') || type.includes('gallery') ||
             type.includes('palace') || type.includes('castle') ||
             type.includes('cathedral');
    });

    return culturalAttractions.length >= 5;
  }

  /**
   * Get season from month (0-indexed).
   */
  getSeason(month) {
    if (month >= 2 && month <= 4) return 'spring';    // Mar-May
    if (month >= 5 && month <= 7) return 'summer';    // Jun-Aug
    if (month >= 8 && month <= 10) return 'fall';     // Sep-Nov
    return 'winter';                                   // Dec-Feb
  }

  /**
   * Rebalance weights to sum to 1.0.
   */
  rebalanceWeights(weights) {
    const total = Object.values(weights).reduce((sum, w) => sum + w, 0);

    if (Math.abs(total - 1.0) < 0.001) {
      return weights; // Already balanced
    }

    // Scale all weights proportionally
    const scale = 1.0 / total;
    const rebalanced = {};

    for (const [key, value] of Object.entries(weights)) {
      rebalanced[key] = Math.round(value * scale * 1000) / 1000;
    }

    // Fix any rounding errors by adjusting timing (largest factor)
    const newTotal = Object.values(rebalanced).reduce((sum, w) => sum + w, 0);
    if (Math.abs(newTotal - 1.0) > 0.001) {
      rebalanced.timing += (1.0 - newTotal);
      rebalanced.timing = Math.round(rebalanced.timing * 1000) / 1000;
    }

    return rebalanced;
  }
}

/**
 * Create a default DynamicWeightCalculator instance.
 */
export function createWeightCalculator(config = {}) {
  return new DynamicWeightCalculator(config);
}
