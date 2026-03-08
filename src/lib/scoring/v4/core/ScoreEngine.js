/**
 * V4 Score Engine
 *
 * Main orchestrator for the simplified 6-factor scoring system.
 * Features:
 * - Dynamic factor weights based on city type, dates, and weather
 * - Contextual tier labels (e.g., "Best for Winter Sun", "Christmas Market Gems")
 * - Hybrid tier logic with minimum score thresholds and count caps
 *
 * Output format:
 * Barcelona ES — 88 (culture 9, beach 8, timing 9, crowds 6, value 6, logistics 9)
 */

import config from '../config/scoringConfig.json' with { type: 'json' };
import { getCountryFlag, clamp } from '../utils/index.js';
import { DynamicWeightCalculator } from './DynamicWeightCalculator.js';
import { TierLabelGenerator } from './TierLabelGenerator.js';
import { generateDescriptions, applyDescriptions } from './LLMDescriptionGenerator.js';

export class ScoreEngine {
  constructor(customConfig = null, factorClasses = {}) {
    this.config = customConfig || config;
    this.factorClasses = factorClasses;
    this.factors = {};

    // Initialize dynamic weight calculator and tier label generator
    this.weightCalculator = new DynamicWeightCalculator(
      this.config.dynamicWeights || {}
    );
    this.tierLabelGenerator = new TierLabelGenerator();

    // Track current date range for tier labeling
    this.currentStartDate = null;
    this.currentEndDate = null;

    if (Object.keys(factorClasses).length > 0) {
      this.initializeFactors();
    }
  }

  registerFactor(name, FactorClass) {
    this.factorClasses[name] = FactorClass;
    const factorConfig = this.config.factors[name];
    if (factorConfig?.enabled) {
      this.factors[name] = new FactorClass(factorConfig);
    }
  }

  initializeFactors() {
    this.factors = {};
    for (const [name, FactorClass] of Object.entries(this.factorClasses)) {
      const factorConfig = this.config.factors[name];
      if (factorConfig?.enabled) {
        this.factors[name] = new FactorClass(factorConfig);
      }
    }
  }

  /**
   * Calculate score for a single city.
   * Uses dynamic weights based on city type, dates, and weather.
   */
  calculateScore(input) {
    const { cityId, cityData, startDate, endDate, originCity } = input;
    const breakdown = {};

    // Get range data for timing factor (needed for weather info)
    let rangeData = null;
    if (this.factors.timing && startDate) {
      try {
        rangeData = this.factors.timing.getRangeForDate(cityData, startDate);
      } catch (e) {
        // Ignore if timing factor not available
      }
    }

    // Calculate dynamic weights for this city/date combination
    const dynamicWeightResult = this.weightCalculator.calculate({
      cityData,
      startDate,
      endDate,
      weatherData: rangeData?.monthData,
      rangeData,
    });
    const dynamicWeights = dynamicWeightResult.weights;

    let weightedSum = 0;
    let totalWeight = 0;

    // Calculate each factor
    for (const [name, factor] of Object.entries(this.factors)) {
      let result;

      try {
        if (factor.hasRequiredData(input)) {
          result = factor.calculate(input);
        } else {
          result = factor.getFallbackResult('Missing data');
        }
      } catch (error) {
        console.error(`[ScoreEngine] Error in ${name}:`, error.message);
        result = factor.getFallbackResult(`Error: ${error.message}`);
      }

      breakdown[name] = result;

      // Use dynamic weight instead of static weight
      const weight = dynamicWeights[name] ?? this.config.factors[name]?.weight ?? 0;
      if (result.confidence >= this.config.degradation.minConfidenceThreshold) {
        weightedSum += result.score * weight * 10; // Convert 0-10 to weighted contribution
        totalWeight += weight;
      }
    }

    // Final score (0-100)
    const finalScore = totalWeight > 0
      ? Math.round(weightedSum / totalWeight)
      : 50;

    return {
      cityId,
      country: cityData?.country || '',
      finalScore: clamp(finalScore, 0, 100),
      breakdown,
      dynamicWeights: dynamicWeightResult, // Include for debugging
      rangeData, // Include for expanded descriptions
      formatted: this.formatResult(cityId, cityData?.country, finalScore, breakdown),
    };
  }

  /**
   * Format a single result in the desired output format.
   * Example: "Barcelona ES — 88 (culture 9, beach 8, timing 9, crowds 6, value 6, logistics 9)"
   */
  formatResult(cityId, country, finalScore, breakdown) {
    const flag = getCountryFlag(country);
    const cityName = this.formatCityName(cityId);

    const factorStr = Object.entries(breakdown)
      .map(([name, result]) => `${name} ${Math.round(result.score)}`)
      .join(', ');

    return `${cityName} ${flag} — ${finalScore} (${factorStr})`;
  }

  formatCityName(cityId) {
    return cityId
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Build a compelling "why visit now" string using city-specific data.
   */
  buildWhyString(breakdown, cityData) {
    // Priority 1: Events (most compelling)
    if (breakdown.timing?.details?.event) {
      const temp = breakdown.timing?.details?.weatherHighC;
      return temp ? `${breakdown.timing.details.event} • ${temp}°C` : breakdown.timing.details.event;
    }

    const temp = breakdown.timing?.details?.weatherHighC;
    const crowdScore = breakdown.crowds?.score || 5;
    const isLowCrowd = crowdScore >= 7;

    // Get top attraction for city-specific hook
    const topAttraction = this.getTopAttraction(cityData);
    const cityVibe = this.getCityVibe(cityData);

    // Build compelling reason
    if (topAttraction && isLowCrowd && temp) {
      return `Explore ${topAttraction} without crowds • ${temp}°C`;
    }

    if (topAttraction && temp) {
      return `${topAttraction} at ${temp}°C`;
    }

    if (cityVibe && isLowCrowd && temp) {
      return `${cityVibe} • fewer tourists, ${temp}°C`;
    }

    if (cityVibe && temp) {
      return `${cityVibe} • ${temp}°C`;
    }

    // Fallback to weather + crowd combo
    if (temp && isLowCrowd) {
      return `${temp}°C, fewer crowds than usual`;
    }

    if (temp) {
      const weatherDesc = temp >= 22 ? 'warm' : temp >= 15 ? 'mild' : 'cool';
      return `${weatherDesc} ${temp}°C, good for sightseeing`;
    }

    return breakdown.timing?.reason || 'good time to visit';
  }

  /**
   * Build an expanded 2-3 sentence "why visit" description.
   * Includes weather, daylight, events, attractions, and crowd context.
   */
  buildExpandedWhyString(breakdown, cityData, rangeData) {
    const sentences = [];

    const temp = breakdown.timing?.details?.weatherHighC;
    // Daylight hours can be in monthData.daylightHours or monthData.weatherDetails.daylightHours
    const daylightHours = rangeData?.monthData?.daylightHours ||
                          rangeData?.monthData?.weatherDetails?.daylightHours;
    const crowdLevel = breakdown.crowds?.details?.crowdLevel;
    const event = breakdown.timing?.details?.event;
    const topAttraction = this.getTopAttraction(cityData);

    // Sentence 1: Weather + daylight
    if (temp && daylightHours) {
      const weatherDesc = this.getWeatherDescription(temp);
      sentences.push(`${weatherDesc} at ${temp}°C with ${Math.round(daylightHours)} hours of daylight.`);
    } else if (temp) {
      const weatherDesc = this.getWeatherDescription(temp);
      sentences.push(`${weatherDesc} at ${temp}°C.`);
    }

    // Sentence 2: Event or attraction
    if (event) {
      sentences.push(`${event} draws visitors.`);
    } else if (topAttraction) {
      sentences.push(`${topAttraction} offers memorable experiences.`);
    }

    // Sentence 3: Crowd context
    if (crowdLevel) {
      const crowdSentence = this.getCrowdSentence(crowdLevel);
      if (crowdSentence) {
        sentences.push(crowdSentence);
      }
    }

    return sentences.slice(0, 3).join(' ');
  }

  /**
   * Get a weather description word based on temperature.
   */
  getWeatherDescription(temp) {
    if (temp >= 28) return 'Hot weather';
    if (temp >= 24) return 'Beach weather';
    if (temp >= 20) return 'Warm weather';
    if (temp >= 15) return 'Mild weather';
    if (temp >= 10) return 'Cool weather';
    if (temp >= 5) return 'Crisp weather';
    return 'Cold weather';
  }

  /**
   * Get a crowd context sentence based on crowd level.
   */
  getCrowdSentence(crowdLevel) {
    const map = {
      'Very Low': 'Very few tourists—peaceful exploration.',
      'Low': 'Fewer crowds—shorter queues and better value.',
      'Moderate': 'Expect moderate crowds—less busy than peak weeks.',
      'High': 'Popular period—book accommodations ahead.',
      'Very High': 'Peak tourist season—expect crowds at major sites.',
      'Extreme': 'Extremely busy period—advance booking essential.',
    };
    return map[crowdLevel] || '';
  }

  /**
   * Get the top attraction name for a city.
   */
  getTopAttraction(cityData) {
    let sites = cityData?.attractions?.sites || cityData?.attractions || [];
    if (!Array.isArray(sites)) sites = sites.sites || [];

    const top = sites[0];
    if (!top?.name) return null;

    // Shorten long names
    let name = top.name;
    if (name.length > 30) {
      name = name.split('(')[0].trim();
      if (name.length > 30) {
        name = name.split(',')[0].trim();
      }
    }
    return name;
  }

  /**
   * Get a short city vibe/identity descriptor.
   */
  getCityVibe(cityData) {
    // Check tourism categories
    const categories = cityData?.tourismCategories || [];
    if (categories.length > 0) {
      const vibeMap = {
        'beach': 'Beach paradise',
        'coastal': 'Coastal charm',
        'historical': 'Historic treasures',
        'cultural': 'Rich culture',
        'art': 'Art & museums',
        'food': 'Culinary scene',
        'nightlife': 'Vibrant nightlife',
        'romantic': 'Romantic getaway',
        'architecture': 'Stunning architecture',
        'nature': 'Natural beauty',
        'wine': 'Wine country',
        'medieval': 'Medieval charm'
      };

      for (const cat of categories) {
        const lower = cat.toLowerCase();
        for (const [key, vibe] of Object.entries(vibeMap)) {
          if (lower.includes(key)) return vibe;
        }
      }
    }

    // Check attraction types for vibe
    let sites = cityData?.attractions?.sites || cityData?.attractions || [];
    if (!Array.isArray(sites)) sites = sites.sites || [];

    const types = sites.slice(0, 5).map(s => (s.type || '').toLowerCase()).join(' ');
    if (types.includes('beach')) return 'Beach destination';
    if (types.includes('castle') || types.includes('fortress')) return 'Historic fortress city';
    if (types.includes('cathedral') || types.includes('church')) return 'Architectural heritage';
    if (types.includes('museum')) return 'Cultural hub';

    return null;
  }

  /**
   * Score multiple cities and return tiered results.
   */
  async scoreCities({
    cityIds,
    startDate,
    endDate,
    originCity = null,
    getCityData,
    maxPerTier = 10,
  }) {
    // Store date range for tier label generation
    this.currentStartDate = startDate;
    this.currentEndDate = endDate;

    const results = [];

    for (const cityId of cityIds) {
      let cityData = null;
      try {
        cityData = await getCityData(cityId);
      } catch (error) {
        console.warn(`[ScoreEngine] Failed to get data for ${cityId}`);
        continue;
      }

      if (!cityData) continue;

      const result = this.calculateScore({
        cityId,
        cityData,
        startDate,
        endDate,
        originCity,
      });

      results.push(result);
    }

    // Sort by score descending
    results.sort((a, b) => b.finalScore - a.finalScore);

    // Group into tiers with hybrid logic
    return this.groupIntoTiers(results, { maxPerTier: Array.isArray(maxPerTier) ? maxPerTier : [maxPerTier, maxPerTier, maxPerTier, maxPerTier] });
  }

  /**
   * Group results into tiers with hybrid logic.
   * Uses minimum score thresholds combined with count caps.
   * Generates contextual tier labels based on city analysis.
   *
   * @param {Array} results - Sorted results array
   * @param {Object} options - Tier configuration options
   * @returns {Object} - Tiered results with contextual labels
   */
  groupIntoTiers(results, options = {}) {
    const tierConfig = this.config.tiers || {};
    const {
      maxPerTier = [
        tierConfig.tier1?.maxCities || 8,
        tierConfig.tier2?.maxCities || 10,
        tierConfig.tier3?.maxCities || 12,
        tierConfig.tier4?.maxCities || 15,
      ],
      minScores = [
        tierConfig.tier1?.minScore || 80,
        tierConfig.tier2?.minScore || 70,
        tierConfig.tier3?.minScore || 60,
        tierConfig.tier4?.minScore || 0,
      ],
    } = options;

    const tiers = {
      tier1: { label: '', sublabel: '', paragraph: '', cities: [], minScore: minScores[0] },
      tier2: { label: '', sublabel: '', paragraph: '', cities: [], minScore: minScores[1] },
      tier3: { label: '', sublabel: '', paragraph: '', cities: [], minScore: minScores[2] },
      tier4: { label: '', sublabel: '', paragraph: '', cities: [], minScore: minScores[3] },
    };

    // Sort by score descending
    const sorted = [...results].sort((a, b) => b.finalScore - a.finalScore);

    // Assign cities to tiers (hybrid: score threshold + count cap)
    for (const result of sorted) {
      const score = result.finalScore;

      if (score >= minScores[0] && tiers.tier1.cities.length < maxPerTier[0]) {
        tiers.tier1.cities.push(result);
      } else if (score >= minScores[1] && tiers.tier2.cities.length < maxPerTier[1]) {
        tiers.tier2.cities.push(result);
      } else if (score >= minScores[2] && tiers.tier3.cities.length < maxPerTier[2]) {
        tiers.tier3.cities.push(result);
      } else if (tiers.tier4.cities.length < maxPerTier[3]) {
        tiers.tier4.cities.push(result);
      }
      // Cities that don't fit anywhere are dropped
    }

    // Generate contextual labels for each tier
    for (const [tierKey, tier] of Object.entries(tiers)) {
      const tierNumber = parseInt(tierKey.slice(-1), 10);
      const labelResult = this.tierLabelGenerator.generate({
        tierCities: tier.cities,
        startDate: this.currentStartDate,
        endDate: this.currentEndDate,
        tierNumber,
      });
      tier.label = labelResult.label;
      tier.sublabel = labelResult.sublabel;
      tier.paragraph = labelResult.paragraph || '';
    }

    return tiers;
  }

  /**
   * Format tiered results for display.
   */
  formatTieredOutput(tiers, options = {}) {
    const { includeTier4 = false } = options;
    const lines = [];

    const tierKeys = includeTier4
      ? ['tier1', 'tier2', 'tier3', 'tier4']
      : ['tier1', 'tier2', 'tier3'];

    for (const tierKey of tierKeys) {
      const tier = tiers[tierKey];
      if (tier.cities.length === 0) continue;

      lines.push(`\n## ${tier.label}`);
      for (const result of tier.cities) {
        lines.push(result.formatted);
      }
    }

    return lines.join('\n');
  }

  /**
   * Quick score a single city (convenience method).
   */
  async quickScore(cityId, startDate, endDate, getCityData, originCity = null) {
    const cityData = await getCityData(cityId);
    if (!cityData) return null;

    return this.calculateScore({
      cityId,
      cityData,
      startDate,
      endDate,
      originCity,
    });
  }

  /**
   * Format a V4 result for API/ResultCard compatibility.
   * Returns the shape that ResultCard expects.
   * NOTE: Numerical scores are only included in debug mode.
   */
  formatForAPI(result, cityData, includeDebug = false) {
    const { cityId, country, finalScore, breakdown, dynamicWeights, rangeData } = result;

    // Build highlights from breakdown
    const highlights = [];

    // Add event highlight if present
    if (breakdown.timing?.details?.event) {
      highlights.push({
        type: 'event',
        name: breakdown.timing.details.event,
        description: breakdown.timing.reason,
      });
    }

    // Add weather highlight
    if (breakdown.timing?.details?.weatherHighC) {
      const temp = breakdown.timing.details.weatherHighC;
      highlights.push({
        type: 'weather',
        name: `${temp}°C`,
        description: breakdown.timing.reason,
      });
    }

    // Add crowd highlight
    if (breakdown.crowds?.details?.crowdLevel) {
      highlights.push({
        type: 'crowds',
        name: breakdown.crowds.details.crowdLevel,
        description: breakdown.crowds.reason,
      });
    }

    // Build compelling "why" string highlighting the best aspects
    const why = this.buildWhyString(breakdown, cityData);

    // Build expanded "why" description (2-3 sentences)
    const whyExpanded = this.buildExpandedWhyString(breakdown, cityData, rangeData);

    // Build tags from tourism categories
    const tags = cityData?.tourismCategories?.slice(0, 4) || [];

    // Tier assignment
    const tierConfig = this.config.tiers || {};
    let tier = 4;
    if (finalScore >= (tierConfig.tier1?.minScore || 80)) tier = 1;
    else if (finalScore >= (tierConfig.tier2?.minScore || 70)) tier = 2;
    else if (finalScore >= (tierConfig.tier3?.minScore || 60)) tier = 3;

    // Weather info (OK to show)
    const weather = {
      highC: breakdown.timing?.details?.weatherHighC,
      lowC: breakdown.timing?.details?.weatherLowC,
    };

    // Base response (no numerical scores exposed)
    const response = {
      id: cityId,
      cityId,
      title: this.formatCityName(cityId),
      image: cityData?.thumbnail || `/images/city-thumbnail/${country}/${cityId}-thumbnail.jpeg`,
      country,
      tier,
      weather,
      crowdLevel: breakdown.crowds?.details?.crowdLevel || 'Moderate',
      highlights,
      why,
      whyExpanded,
      tags,
    };

    // Debug info only when requested
    if (includeDebug) {
      response.debug = {
        finalScore,
        dynamicWeights: dynamicWeights?.weights,
        weightReasoning: dynamicWeights?.reasoning,
        factors: Object.fromEntries(
          Object.entries(breakdown).map(([name, data]) => [
            name,
            { score: Math.round(data.score), reason: data.reason, details: data.details }
          ])
        ),
      };
      // Legacy score for backwards compatibility in debug mode
      response.score = Math.round((finalScore / 20) * 10) / 10;
    }

    return response;
  }

  /**
   * Score cities and return API-compatible results grouped by tier.
   *
   * @param {Object} options - Scoring options
   * @param {Array} options.cityIds - City IDs to score
   * @param {Date|string} options.startDate - Trip start date
   * @param {Date|string} options.endDate - Trip end date
   * @param {string} options.originCity - Origin city for logistics
   * @param {Function} options.getCityData - Function to get city data
   * @param {number} options.limit - Max cities to return
   * @param {boolean} options.includeDebug - Include debug info in response
   * @param {boolean} options.flatList - Return flat list instead of tiers (backwards compat)
   * @param {boolean} options.useLLM - Use LLM for generating descriptions (default: true)
   * @returns {Object} - Tiered results or flat list
   */
  async scoreCitiesForAPI({
    cityIds,
    startDate,
    endDate,
    originCity = null,
    getCityData,
    limit = 30,
    includeDebug = false,
    flatList = false,
    useLLM = true,
  }) {
    // Store date range for tier label generation
    this.currentStartDate = startDate;
    this.currentEndDate = endDate;

    const results = [];
    const rawResults = []; // For tiering

    for (const cityId of cityIds) {
      let cityData = null;
      try {
        cityData = await getCityData(cityId);
      } catch (error) {
        console.warn(`[ScoreEngine] Failed to get data for ${cityId}`);
        continue;
      }

      if (!cityData) continue;

      const result = this.calculateScore({
        cityId,
        cityData,
        startDate,
        endDate,
        originCity,
      });

      rawResults.push({ result, cityData });

      const apiResult = this.formatForAPI(result, cityData, includeDebug);
      results.push(apiResult);
    }

    // Sort by tier then by internal score
    results.sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier;
      // Within same tier, use debug score if available, otherwise maintain order
      const scoreA = a.debug?.finalScore || 0;
      const scoreB = b.debug?.finalScore || 0;
      return scoreB - scoreA;
    });

    // For backwards compatibility, return flat list if requested
    if (flatList) {
      return results.slice(0, limit);
    }

    // Group into tiers with contextual labels
    const tiers = this.groupIntoTiers(
      rawResults.map(r => r.result),
      {}
    );

    // Attach cityData to tier cities for LLM context
    for (const tierKey of Object.keys(tiers)) {
      tiers[tierKey].cities = tiers[tierKey].cities.map(rawResult => {
        const cityData = rawResults.find(r => r.result.cityId === rawResult.cityId)?.cityData;
        return { ...rawResult, cityData, tags: cityData?.tourismCategories || [] };
      });
    }

    // Generate LLM descriptions if enabled
    let llmDescriptions = null;
    let llmUsed = false;
    if (useLLM) {
      try {
        llmDescriptions = await generateDescriptions({
          startDate,
          endDate,
          tiers,
        });
        llmUsed = llmDescriptions !== null;
      } catch (error) {
        console.warn('[ScoreEngine] LLM description generation failed:', error.message);
      }
    }

    // Store LLM usage flag for API response meta
    this._llmUsed = llmUsed;

    // Apply LLM descriptions to tiers (updates paragraph and whyExpanded)
    const enrichedTiers = llmDescriptions ? applyDescriptions(tiers, llmDescriptions) : tiers;

    // Format tiered response
    const tieredResponse = {};
    for (const [tierKey, tier] of Object.entries(enrichedTiers)) {
      const tierNumber = parseInt(tierKey.slice(-1), 10);
      const tierCities = tier.cities.map(rawResult => {
        const cityData = rawResults.find(r => r.result.cityId === rawResult.cityId)?.cityData;
        const formatted = this.formatForAPI(rawResult, cityData, includeDebug);
        // Override whyExpanded with LLM version if available
        if (rawResult.whyExpanded) {
          formatted.whyExpanded = rawResult.whyExpanded;
        }
        return formatted;
      });

      tieredResponse[tierKey] = {
        label: tier.label,
        sublabel: tier.sublabel,
        paragraph: tier.paragraph,
        cities: tierCities,
      };
    }

    // Attach meta info about LLM usage
    tieredResponse._meta = { llmUsed };

    return tieredResponse;
  }
}

/**
 * Create a pre-configured V4 ScoreEngine instance.
 */
export async function createV4Engine() {
  const { getFactorClasses } = await import('../factors/index.js');
  const engine = new ScoreEngine(null, getFactorClasses());
  return engine;
}
