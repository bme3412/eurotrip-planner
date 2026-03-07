/**
 * V4 Score Engine
 *
 * Main orchestrator for the simplified 6-factor scoring system.
 * Produces tiered output: Tier 1 (80+), Tier 2 (70-79), Tier 3 (60-69)
 *
 * Output format:
 * Barcelona ES — 88 (culture 9, beach 8, timing 9, crowds 6, value 6, logistics 9)
 */

import config from '../config/scoringConfig.json' with { type: 'json' };
import { getCountryFlag, clamp } from '../utils/index.js';

export class ScoreEngine {
  constructor(customConfig = null, factorClasses = {}) {
    this.config = customConfig || config;
    this.factorClasses = factorClasses;
    this.factors = {};

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
   */
  calculateScore(input) {
    const { cityId, cityData, startDate, endDate, originCity } = input;
    const breakdown = {};

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

      // Weighted average
      const weight = this.config.factors[name].weight;
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

    // Group into tiers
    return this.groupIntoTiers(results, maxPerTier);
  }

  /**
   * Group results into tiers.
   */
  groupIntoTiers(results, maxPerTier = 10) {
    const tiers = {
      tier1: { label: 'Top Picks (80+)', cities: [] },
      tier2: { label: 'Great Options (70-79)', cities: [] },
      tier3: { label: 'Good Options (60-69)', cities: [] },
      tier4: { label: 'Consider (under 60)', cities: [] },
    };

    for (const result of results) {
      const score = result.finalScore;

      if (score >= 80 && tiers.tier1.cities.length < maxPerTier) {
        tiers.tier1.cities.push(result);
      } else if (score >= 70 && tiers.tier2.cities.length < maxPerTier) {
        tiers.tier2.cities.push(result);
      } else if (score >= 60 && tiers.tier3.cities.length < maxPerTier) {
        tiers.tier3.cities.push(result);
      } else if (tiers.tier4.cities.length < maxPerTier) {
        tiers.tier4.cities.push(result);
      }
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
   * Returns the shape that ResultCard expects, with V4 data added.
   */
  formatForAPI(result, cityData) {
    const { cityId, country, finalScore, breakdown } = result;

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

    // Build tags from tourism categories
    const tags = cityData?.tourismCategories?.slice(0, 4) || [];

    // Tier assignment
    let tier = 4;
    if (finalScore >= 80) tier = 1;
    else if (finalScore >= 70) tier = 2;
    else if (finalScore >= 60) tier = 3;

    return {
      // Existing ResultCard fields
      id: cityId,
      cityId,
      title: this.formatCityName(cityId),
      score: Math.round((finalScore / 20) * 10) / 10, // 0-5 legacy
      image: cityData?.thumbnail || `/images/city-thumbnail/${country}/${cityId}-thumbnail.jpeg`,
      crowdLevel: breakdown.crowds?.details?.crowdLevel || 'Moderate',
      highlights,
      why,
      tags,
      country,

      // V4 additions
      v4: {
        finalScore,
        factors: Object.fromEntries(
          Object.entries(breakdown).map(([name, data]) => [
            name,
            { score: Math.round(data.score), reason: data.reason }
          ])
        ),
        tier,
      },
    };
  }

  /**
   * Score cities and return API-compatible results.
   */
  async scoreCitiesForAPI({
    cityIds,
    startDate,
    endDate,
    originCity = null,
    getCityData,
    limit = 30,
  }) {
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

      const apiResult = this.formatForAPI(result, cityData);
      results.push(apiResult);
    }

    // Sort by finalScore descending
    results.sort((a, b) => b.v4.finalScore - a.v4.finalScore);

    // Limit results
    return results.slice(0, limit);
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
