/**
 * Score Engine for V3 Scoring
 *
 * Main orchestrator that calculates unified scores across all factors.
 * Handles factor initialization, weighted averaging, and result aggregation.
 */

import config from '../config/scoringConfig.json';
import { clamp, getScoreLabel } from '../utils/scaleConverters.js';

/**
 * @typedef {Object} ScoreResult
 * @property {number} finalScore - Final score on 0-100 scale
 * @property {number} confidence - Overall confidence (0-1)
 * @property {string} cityId - City identifier
 * @property {Object} breakdown - Score breakdown by factor
 * @property {Object} summary - Human-readable summary
 * @property {Object} [debug] - Debug information
 */

export class ScoreEngine {
  /**
   * @param {Object} [customConfig] - Override default config
   * @param {Object} [cityTraits] - Data-driven city traits
   * @param {Object} [factorClasses] - Map of factor name to class
   */
  constructor(customConfig = null, cityTraits = null, factorClasses = {}) {
    this.config = customConfig || config;
    this.cityTraits = cityTraits;
    this.factorClasses = factorClasses;
    this.factors = {};

    // Initialize factors if classes provided
    if (Object.keys(factorClasses).length > 0) {
      this.initializeFactors();
    }
  }

  /**
   * Register a factor class.
   *
   * @param {string} name - Factor name (e.g., 'baseline', 'weather')
   * @param {Function} FactorClass - Factor class constructor
   */
  registerFactor(name, FactorClass) {
    this.factorClasses[name] = FactorClass;

    const factorConfig = this.config.factors[name];
    if (factorConfig?.enabled) {
      this.factors[name] = new FactorClass(factorConfig, this.cityTraits);
    }
  }

  /**
   * Initialize all registered factors.
   */
  initializeFactors() {
    this.factors = {};

    for (const [name, FactorClass] of Object.entries(this.factorClasses)) {
      const factorConfig = this.config.factors[name];
      if (factorConfig?.enabled) {
        this.factors[name] = new FactorClass(factorConfig, this.cityTraits);
      }
    }
  }

  /**
   * Calculate unified score for a city.
   *
   * @param {Object} input - Scoring input
   * @param {string} input.cityId - City identifier
   * @param {string|Date} input.startDate - Trip start
   * @param {string|Date} input.endDate - Trip end
   * @param {Object} [input.travelerProfile] - User preferences
   * @param {string} [input.originCity] - For ease scoring
   * @param {Object} [input.enrichmentData] - Pre-fetched data
   * @param {Object} [input.cityData] - Static city data
   * @param {Object} [input.options] - Calculation options
   * @returns {ScoreResult}
   */
  calculateScore(input) {
    const startTime = Date.now();
    const { options = {} } = input;
    const { includeDebug = false, factorsToInclude = null } = options;

    const breakdown = {};
    const factorsUsed = [];
    const factorsMissing = [];

    let weightedSum = 0;
    let totalWeight = 0;
    let confidenceSum = 0;

    // Calculate each factor
    for (const [name, factor] of Object.entries(this.factors)) {
      // Skip if not in requested subset
      if (factorsToInclude && !factorsToInclude.includes(name)) {
        continue;
      }

      let result;

      try {
        if (factor.hasRequiredData(input)) {
          result = factor.calculate(input);
          factorsUsed.push(name);
        } else {
          result = factor.getFallbackResult('Missing required data');
          factorsMissing.push(name);
        }
      } catch (error) {
        console.error(`[ScoreEngine] Error in ${name} factor:`, error);
        result = factor.getFallbackResult(`Error: ${error.message}`);
        factorsMissing.push(name);
      }

      breakdown[name] = result;

      // Weighted average calculation (confidence-adjusted)
      if (result.confidence >= this.config.degradation.minConfidenceThreshold) {
        weightedSum += result.rawScore * result.weight * result.confidence;
        totalWeight += result.weight * result.confidence;
        confidenceSum += result.confidence;
      }
    }

    // Calculate final score
    const factorCount = Object.keys(breakdown).length;
    const finalScore = totalWeight > 0
      ? Math.round(weightedSum / totalWeight)
      : this.config.factors.baseline?.fallbackScore ?? 50;

    const avgConfidence = factorCount > 0
      ? Math.round((confidenceSum / factorCount) * 100) / 100
      : 0.5;

    // Build summary
    const summary = this.buildSummary(breakdown, input);

    const result = {
      finalScore: clamp(finalScore, 0, 100),
      confidence: avgConfidence,
      cityId: input.cityId,
      breakdown,
      summary,
    };

    // Add debug info if requested
    if (includeDebug) {
      result.debug = {
        configVersion: this.config.version,
        factorsUsed,
        factorsMissing,
        dataFreshness: this.getDataFreshness(breakdown),
        calculationTimeMs: Date.now() - startTime,
        weightsUsed: Object.fromEntries(
          Object.entries(breakdown).map(([k, v]) => [k, v.weight])
        ),
      };
    }

    return result;
  }

  /**
   * Build human-readable summary from breakdown.
   *
   * @param {Object} breakdown - Factor results
   * @param {Object} input - Original input
   * @returns {Object} Summary with why, highlights, warnings
   */
  buildSummary(breakdown, input) {
    const highlights = [];
    const warnings = [];
    const whyParts = [];

    // Score label
    const totalWeightedScore = Object.values(breakdown)
      .filter(r => r.confidence > 0)
      .reduce((sum, r) => sum + r.rawScore * r.weight * r.confidence, 0);
    const totalWeight = Object.values(breakdown)
      .filter(r => r.confidence > 0)
      .reduce((sum, r) => sum + r.weight * r.confidence, 0);
    const avgScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 50;

    const label = getScoreLabel(avgScore);
    whyParts.push(`${label} time to visit`);

    // Weather highlight
    if (breakdown.weather?.rawScore >= 70 && breakdown.weather?.confidence > 0.5) {
      const temp = breakdown.weather.details?.avgTemp;
      const condition = breakdown.weather.details?.condition;
      if (temp) {
        const tempStr = `${Math.round(temp)}°C`;
        highlights.push(condition ? `${tempStr}, ${condition}` : tempStr);
        whyParts.push(tempStr);
      }
    } else if (breakdown.weather?.rawScore < 40 && breakdown.weather?.confidence > 0.5) {
      warnings.push('Weather may be challenging');
    }

    // Event highlight
    if (breakdown.events?.rawScore >= 70) {
      const events = breakdown.events.details?.events || [];
      if (events.length > 0) {
        highlights.push(events[0]);
        whyParts.push(events[0]);
      }
    }

    // Crowd highlight
    if (breakdown.crowds?.rawScore >= 70) {
      highlights.push('Fewer crowds');
      whyParts.push('fewer crowds');
    } else if (breakdown.crowds?.rawScore < 30 && breakdown.crowds?.confidence > 0.5) {
      warnings.push('Peak season - expect crowds');
    }

    // Pricing highlight
    if (breakdown.pricing?.rawScore >= 80) {
      highlights.push('Great value');
    } else if (breakdown.pricing?.rawScore < 30 && breakdown.pricing?.confidence > 0.5) {
      warnings.push('Premium pricing season');
    }

    // Personalization highlight
    if (breakdown.personalization?.rawScore >= 80 && breakdown.personalization?.confidence > 0.5) {
      const type = input.travelerProfile?.type;
      if (type && type !== 'everyone') {
        highlights.push(`Great for ${type}`);
      }
    }

    // Ease highlight
    if (breakdown.ease?.rawScore >= 80) {
      highlights.push('Easy to reach');
    }

    return {
      why: whyParts.slice(0, 3).join(' · '),
      highlights: highlights.slice(0, 4),
      warnings: warnings.slice(0, 2),
    };
  }

  /**
   * Get data freshness info from breakdown.
   *
   * @param {Object} breakdown
   * @returns {Object} Source info per factor
   */
  getDataFreshness(breakdown) {
    const freshness = {};
    for (const [name, result] of Object.entries(breakdown)) {
      freshness[name] = result.source;
    }
    return freshness;
  }

  /**
   * Score multiple cities.
   *
   * @param {Object} params
   * @param {string[]} params.cityIds - Cities to score
   * @param {string|Date} params.startDate
   * @param {string|Date} params.endDate
   * @param {Object} [params.travelerProfile]
   * @param {Function} [params.getEnrichmentData] - Async function to get enrichment data
   * @param {Function} [params.getCityData] - Function to get city data
   * @param {Object} [params.options]
   * @returns {Promise<ScoreResult[]>}
   */
  async scoreCities({
    cityIds,
    startDate,
    endDate,
    travelerProfile = {},
    originCity = null,
    getEnrichmentData = null,
    getCityData = null,
    options = {},
  }) {
    const results = [];

    for (const cityId of cityIds) {
      // Get enrichment data if provider available
      let enrichmentData = {};
      if (getEnrichmentData) {
        try {
          enrichmentData = await getEnrichmentData(cityId, startDate, endDate);
        } catch (error) {
          console.warn(`[ScoreEngine] Failed to get enrichment for ${cityId}:`, error);
        }
      }

      // Get city data if provider available
      let cityData = null;
      if (getCityData) {
        try {
          cityData = getCityData(cityId);
        } catch (error) {
          console.warn(`[ScoreEngine] Failed to get city data for ${cityId}:`, error);
        }
      }

      const result = this.calculateScore({
        cityId,
        startDate,
        endDate,
        travelerProfile,
        originCity,
        enrichmentData,
        cityData,
        options,
      });

      results.push(result);
    }

    // Sort by score, then confidence
    results.sort((a, b) => {
      const scoreDiff = b.finalScore - a.finalScore;
      if (Math.abs(scoreDiff) > 1) return scoreDiff;
      return b.confidence - a.confidence;
    });

    return results;
  }
}
