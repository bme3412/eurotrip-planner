/**
 * Base Factor Class for V3 Scoring
 *
 * Abstract base class that all scoring factors extend.
 * Provides common utilities and enforces consistent interface.
 */

import config from '../config/scoringConfig.json';
import { clamp, from5To100 } from '../utils/scaleConverters.js';

/**
 * @typedef {Object} FactorResult
 * @property {number} rawScore - Raw score on 0-100 scale
 * @property {number} weight - Applied weight from config
 * @property {number} weightedScore - rawScore * weight
 * @property {number} confidence - Confidence in this score (0-1)
 * @property {string} reason - Human-readable explanation
 * @property {'api'|'mock'|'static'|'fallback'} source - Data source type
 * @property {Object} [details] - Factor-specific details
 */

/**
 * @typedef {Object} ScoringInput
 * @property {string} cityId - City identifier (slug)
 * @property {string|Date} startDate - Trip start date
 * @property {string|Date} endDate - Trip end date
 * @property {Object} [travelerProfile] - User preferences
 * @property {string} [originCity] - For ease scoring
 * @property {Object} [enrichmentData] - Pre-fetched data
 * @property {Object} [cityData] - Static city data
 */

export class BaseFactor {
  /**
   * @param {Object} factorConfig - Factor-specific config from scoringConfig.json
   * @param {Object} [cityTraits] - Data-driven city traits
   */
  constructor(factorConfig, cityTraits = null) {
    this.config = config;
    this.factorConfig = factorConfig;
    this.cityTraits = cityTraits;
    this.name = this.constructor.name.replace('Factor', '').toLowerCase();
  }

  /**
   * Calculate factor score. Must be implemented by subclasses.
   *
   * @param {ScoringInput} input - Scoring input data
   * @returns {FactorResult}
   */
  calculate(input) {
    throw new Error(`${this.constructor.name}.calculate() must be implemented`);
  }

  /**
   * Check if this factor has sufficient data to calculate.
   *
   * @param {ScoringInput} input - Scoring input data
   * @returns {boolean}
   */
  hasRequiredData(input) {
    return true;
  }

  /**
   * Get fallback result when data is missing.
   *
   * @param {string} reason - Why fallback is being used
   * @returns {FactorResult}
   */
  getFallbackResult(reason) {
    const fallbackScore = this.factorConfig.fallbackScore ?? 50;
    return {
      rawScore: fallbackScore,
      weight: this.factorConfig.weight,
      weightedScore: fallbackScore * this.factorConfig.weight,
      confidence: 0.3,
      reason: reason || 'Data unavailable',
      source: 'fallback',
    };
  }

  /**
   * Build a successful result.
   *
   * @param {number} score - Raw score (0-100)
   * @param {number} confidence - Confidence (0-1)
   * @param {string} reason - Human-readable reason
   * @param {'api'|'mock'|'static'} source - Data source
   * @param {Object} [details] - Additional details
   * @returns {FactorResult}
   */
  buildResult(score, confidence, reason, source, details = null) {
    const rawScore = clamp(score, 0, 100);
    return {
      rawScore,
      weight: this.factorConfig.weight,
      weightedScore: rawScore * this.factorConfig.weight,
      confidence: clamp(confidence, 0, 1),
      reason,
      source,
      ...(details && { details }),
    };
  }

  /**
   * Convert legacy 0-5 score to 0-100.
   *
   * @param {number} legacyScore - Score on 0-5 scale
   * @returns {number} Score on 0-100 scale
   */
  fromLegacyScale(legacyScore) {
    return from5To100(legacyScore);
  }

  /**
   * Get a traveler profile value with fallback.
   *
   * @param {Object} travelerProfile
   * @param {string} key
   * @param {*} defaultValue
   * @returns {*}
   */
  getProfileValue(travelerProfile, key, defaultValue) {
    if (!travelerProfile) return defaultValue;

    // Check direct property
    if (travelerProfile[key] !== undefined) return travelerProfile[key];

    // Check in preferences sub-object
    if (travelerProfile.preferences?.[key] !== undefined) {
      return travelerProfile.preferences[key];
    }

    // Check in config-defined profile
    const profileType = travelerProfile.type || 'everyone';
    const configProfile = this.config.travelerProfiles[profileType];
    if (configProfile?.[key] !== undefined) return configProfile[key];

    return defaultValue;
  }

  /**
   * Check if a city has a specific trait.
   *
   * @param {string} cityId - City slug
   * @param {string} traitName - Trait name (e.g., 'romantic', 'familyFriendly')
   * @returns {boolean}
   */
  hasCityTrait(cityId, traitName) {
    if (!this.cityTraits?.traits?.[traitName]) return false;
    return this.cityTraits.traits[traitName].cities?.includes(cityId) ?? false;
  }

  /**
   * Get all traits for a city.
   *
   * @param {string} cityId - City slug
   * @returns {string[]} Array of trait names
   */
  getCityTraits(cityId) {
    if (!this.cityTraits?.traits) return [];

    const traits = [];
    for (const [traitName, traitData] of Object.entries(this.cityTraits.traits)) {
      if (traitData.cities?.includes(cityId)) {
        traits.push(traitName);
      }
    }
    return traits;
  }

  /**
   * Log debug information (only in development).
   *
   * @param {string} message
   * @param {Object} data
   */
  debug(message, data = {}) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${this.constructor.name}] ${message}`, data);
    }
  }
}
