/**
 * V3 Unified Scoring System
 *
 * Public API for the V3 scoring system. Provides:
 * - ScoreEngine for full scoring capabilities
 * - All scoring factors (Baseline, Weather, Events, etc.)
 * - Utility functions for parsing, normalization, and scale conversion
 * - Configuration access
 * - Backwards compatibility converters
 */

// Core exports
export { ScoreEngine } from './core/ScoreEngine.js';
export { BaseFactor } from './core/BaseFactor.js';

// Factor exports
export {
  BaselineFactor,
  WeatherFactor,
  EventsFactor,
  CrowdsFactor,
  PricingFactor,
  PersonalizationFactor,
  EaseFactor,
  getFactorClasses,
} from './factors/index.js';

// Configuration
export { default as scoringConfig } from './config/scoringConfig.json';
export { default as cityTraits } from './config/cityTraits.json';

// Utility exports
export {
  parseJourneyTimeMinutes,
  parseJourneyTimeHours,
  formatMinutesToDisplay,
  parsePriceCents,
  parsePriceEur,
  parseFrequencyPerDay,
  parseDate,
  getDayCount,
} from './utils/parsers.js';

export {
  normalizeCrowdLevel,
  getCrowdLevelIndex,
  normalizePriceRange,
  normalizeTemperatureComfort,
  normalizeTravelerType,
} from './utils/normalizers.js';

export {
  from5To100,
  from10To100,
  from100To5,
  from100To10,
  convertScale,
  clamp,
  getScoreLabel,
  getLegacyScoreLabel,
  normalizeWithConfidence,
} from './utils/scaleConverters.js';

/**
 * Convert V3 result to V1-compatible format.
 *
 * @param {Object} result - V3 ScoreResult
 * @returns {Object} V1-compatible object
 */
export function toV1Format(result) {
  const { from100To5 } = require('./utils/scaleConverters.js');

  return {
    id: result.cityId,
    score: from100To5(result.finalScore),
    crowdLevel: result.breakdown.crowds?.details?.level || 'Unknown',
    events: result.breakdown.events?.details?.events || [],
    why: result.summary?.why || '',
    highlights: result.summary?.highlights || [],
  };
}

/**
 * Convert V3 result to V2-compatible format.
 *
 * @param {Object} result - V3 ScoreResult
 * @returns {Object} V2-compatible object
 */
export function toV2Format(result) {
  const { from100To5 } = require('./utils/scaleConverters.js');

  return {
    finalScore: from100To5(result.finalScore),
    confidence: result.confidence,
    breakdown: Object.fromEntries(
      Object.entries(result.breakdown).map(([k, v]) => [
        k,
        {
          value: from100To5(v.rawScore),
          confidence: v.confidence,
          reason: v.reason,
        },
      ])
    ),
    dataFreshness: result.debug?.dataFreshness || {},
  };
}

/**
 * Create a pre-configured ScoreEngine with all factors registered.
 *
 * @param {Object} [customConfig] - Optional config overrides
 * @returns {ScoreEngine} Ready-to-use scoring engine
 */
export function createScoreEngine(customConfig = null) {
  const { ScoreEngine } = require('./core/ScoreEngine.js');
  const cityTraitsData = require('./config/cityTraits.json');
  const { getFactorClasses } = require('./factors/index.js');

  const factorClasses = getFactorClasses();
  return new ScoreEngine(customConfig, cityTraitsData, factorClasses);
}

/**
 * Score a single city with the V3 system.
 *
 * @param {Object} params - Scoring parameters
 * @param {string} params.cityId - City identifier
 * @param {string|Date} params.startDate - Trip start date
 * @param {string|Date} [params.endDate] - Trip end date
 * @param {Object} [params.travelerProfile] - User preferences
 * @param {string} [params.originCity] - For ease scoring
 * @param {Object} [params.enrichmentData] - Pre-fetched data
 * @param {Object} [params.cityData] - Static city data
 * @param {Object} [params.options] - Additional options
 * @returns {Object} Score result with breakdown
 */
export function scoreCity(params) {
  const engine = createScoreEngine();
  return engine.calculateScore(params);
}

/**
 * Score multiple cities with the V3 system.
 *
 * @param {Object} params - Scoring parameters
 * @param {string[]} params.cityIds - Cities to score
 * @param {string|Date} params.startDate - Trip start
 * @param {string|Date} params.endDate - Trip end
 * @param {Object} [params.travelerProfile] - User preferences
 * @param {string} [params.originCity] - For ease scoring
 * @param {Function} [params.getEnrichmentData] - Async function to get enrichment
 * @param {Function} [params.getCityData] - Function to get city data
 * @param {Object} [params.options] - Additional options
 * @returns {Promise<Object[]>} Sorted score results
 */
export async function scoreCities(params) {
  const engine = createScoreEngine();
  return engine.scoreCities(params);
}
