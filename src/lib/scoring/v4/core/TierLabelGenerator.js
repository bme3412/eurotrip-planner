/**
 * Tier Label Generator for V4 Scoring
 *
 * Generates contextual tier labels by analyzing:
 * - Dominant tourism categories in the tier
 * - Average temperature range
 * - Common events/festivals
 * - Season and time of year
 *
 * Example outputs:
 * - "Best for Winter Sun" (December, Mediterranean cities)
 * - "Christmas Market Gems" (December, Central European cities)
 * - "Mediterranean Sun + Festival Season" (Summer, beach cities with events)
 */

import { getMonthIndex } from '../utils/index.js';

// Category detection patterns
const CATEGORY_PATTERNS = {
  beach: ['beach', 'coastal', 'seaside', 'island', 'mediterranean', 'riviera'],
  cultural: ['museum', 'art', 'historical', 'cultural', 'heritage', 'unesco', 'architecture'],
  christmas: ['christmas', 'market', 'winter market'],
  festival: ['festival', 'carnival', 'celebration', 'parade'],
  food: ['food', 'culinary', 'gastronomy', 'wine', 'foodie'],
  romantic: ['romantic', 'honeymoon', 'couples'],
  nature: ['nature', 'hiking', 'outdoor', 'mountain', 'scenic'],
};

// Label templates by season and dominant category
const LABEL_TEMPLATES = {
  winter: {
    beach_warm: { label: 'Best for Winter Sun', sublabel: 'Warm Mediterranean escapes' },
    christmas: { label: 'Christmas Market Gems', sublabel: 'Festive holiday atmosphere' },
    cultural: { label: 'Winter Cultural Escapes', sublabel: 'Museums and indoor treasures' },
    food: { label: 'Winter Culinary Retreats', sublabel: 'Cozy dining experiences' },
    default: { label: 'Winter Escapes', sublabel: 'Off-season discoveries' },
  },
  spring: {
    beach: { label: 'Spring Coastal Charm', sublabel: 'Mild weather, fewer crowds' },
    cultural: { label: 'Spring Cultural Awakening', sublabel: 'Perfect sightseeing weather' },
    festival: { label: 'Spring Festivals', sublabel: 'Seasonal celebrations' },
    nature: { label: 'Spring Blooms', sublabel: 'Nature at its finest' },
    default: { label: 'Perfect Spring Weather', sublabel: 'Ideal travel conditions' },
  },
  summer: {
    beach: { label: 'Mediterranean Sun', sublabel: 'Beach paradise awaits' },
    beach_festival: { label: 'Sun + Festival Season', sublabel: 'Beaches and celebrations' },
    low_crowds: { label: 'Summer Without Crowds', sublabel: 'Hidden gems for summer' },
    cultural: { label: 'Summer Cultural Highlights', sublabel: 'Outdoor events and landmarks' },
    default: { label: 'Summer Hot Spots', sublabel: 'Peak season favorites' },
  },
  fall: {
    wine: { label: 'Harvest Season Favorites', sublabel: 'Wine country at its best' },
    cultural: { label: 'Golden Autumn Culture', sublabel: 'Fall colors and heritage' },
    food: { label: 'Autumn Culinary Trail', sublabel: 'Seasonal flavors' },
    beach: { label: 'Late Season Beach', sublabel: 'Warm waters, fewer tourists' },
    default: { label: 'Golden Autumn Destinations', sublabel: 'Perfect fall getaways' },
  },
};

// Tier-specific prefixes
const TIER_PREFIXES = {
  1: '', // Top tier gets clean label
  2: '', // Strong choices
  3: 'Good for ', // Lower tiers get qualifier
  4: 'Consider for ',
  5: 'Also Worth a Look: ',
};

export class TierLabelGenerator {
  /**
   * Generate a contextual label for a tier.
   *
   * @param {Object} params
   * @param {Array} params.tierCities - Cities in this tier with their data
   * @param {Date|string} params.startDate - Trip start date
   * @param {Date|string} params.endDate - Trip end date
   * @param {number} params.tierNumber - Tier number (1-4)
   * @returns {Object} - { label, sublabel, paragraph }
   */
  generate({ tierCities, startDate, endDate, tierNumber }) {
    if (!tierCities || tierCities.length === 0) {
      return { ...this.getDefaultLabel(tierNumber, startDate), paragraph: '' };
    }

    const month = startDate ? getMonthIndex(startDate) : new Date().getMonth();
    const season = this.getSeason(month);

    // Analyze the cities in this tier
    const analysis = this.analyzeTierCities(tierCities, month);

    // Pick the best label template
    const template = this.selectTemplate(season, analysis, tierNumber);

    // Apply tier prefix if needed
    const prefix = TIER_PREFIXES[tierNumber] || '';
    const label = prefix + template.label;

    // Generate sublabel with specific data
    const sublabel = this.generateSublabel(template.sublabel, analysis);

    // Generate rich paragraph describing the tier
    const paragraph = this.generateParagraph({ tierCities, startDate, analysis, season });

    return { label, sublabel, paragraph };
  }

  /**
   * Generate a 2-3 sentence paragraph explaining what makes this tier special.
   *
   * @param {Object} params
   * @param {Array} params.tierCities - Cities in this tier
   * @param {Date|string} params.startDate - Trip start date
   * @param {Object} params.analysis - Analysis from analyzeTierCities
   * @param {string} params.season - Current season
   * @returns {string} - 2-3 sentence paragraph
   */
  generateParagraph({ tierCities, startDate, analysis, season }) {
    if (!tierCities?.length) return '';

    const sentences = [];

    // Aggregate weather and daylight data
    const weatherData = this.aggregateWeatherData(tierCities);

    // Sentence 1: Weather description
    const weatherSentence = this.buildWeatherSentence(weatherData, analysis, season);
    if (weatherSentence) sentences.push(weatherSentence);

    // Sentence 2: Daylight description
    const daylightSentence = this.buildDaylightSentence(weatherData, season);
    if (daylightSentence) sentences.push(daylightSentence);

    // Sentence 3: Events, crowds, or activity context
    const contextSentence = this.buildContextSentence(analysis, season);
    if (contextSentence) sentences.push(contextSentence);

    return sentences.join(' ');
  }

  /**
   * Aggregate weather data from tier cities.
   * Handles both raw result format (from groupIntoTiers) and API format.
   */
  aggregateWeatherData(cities) {
    let totalHigh = 0;
    let totalDaylight = 0;
    let highCount = 0;
    let daylightCount = 0;

    for (const city of cities) {
      // Get temperature - check raw result format first, then API format
      const temp = city.breakdown?.timing?.details?.weatherHighC ||  // Raw result format
                   city.weather?.highC ||                            // API format
                   city.debug?.factors?.timing?.details?.weatherHighC ||
                   null;
      if (temp) {
        totalHigh += parseInt(temp, 10);
        highCount++;
      }

      // Get daylight hours - check rangeData first (raw result), then other sources
      // Handle both flat structure (daylightHours) and nested structure (weatherDetails.daylightHours)
      const daylight = city.rangeData?.monthData?.daylightHours ||
                       city.rangeData?.monthData?.weatherDetails?.daylightHours ||
                       city.weather?.daylightHours ||
                       city.breakdown?.timing?.details?.daylightHours ||
                       city.debug?.factors?.timing?.details?.daylightHours ||
                       null;
      if (daylight) {
        totalDaylight += parseFloat(daylight);
        daylightCount++;
      }
    }

    return {
      avgHighC: highCount > 0 ? Math.round(totalHigh / highCount) : null,
      avgDaylightHours: daylightCount > 0 ? Math.round(totalDaylight / daylightCount * 2) / 2 : null,
    };
  }

  /**
   * Build weather sentence based on aggregated data.
   */
  buildWeatherSentence(weatherData, analysis, season) {
    const temp = weatherData.avgHighC || analysis.avgTemp;
    if (!temp) return '';

    if (season === 'summer' && temp >= 24) {
      return `Perfect beach weather across the Mediterranean with temperatures averaging ${temp - 2}–${temp + 2}°C.`;
    }
    if (season === 'summer' && temp >= 20) {
      return `Warm summer weather with temperatures around ${temp}°C ideal for sightseeing.`;
    }
    if (season === 'spring' && temp >= 15) {
      return `Pleasant spring weather with comfortable ${temp - 2}–${temp + 2}°C temperatures.`;
    }
    if (season === 'fall' && temp >= 18) {
      return `Golden autumn weather with mild ${temp}°C temperatures perfect for exploring.`;
    }
    if (season === 'winter' && temp >= 15) {
      return `Mild winter escape with pleasant temperatures around ${temp}°C.`;
    }
    if (season === 'winter' && temp < 10) {
      return `Crisp winter weather with temperatures around ${temp}°C—perfect for cozy indoor activities.`;
    }

    return `Temperatures averaging ${temp}°C during your visit.`;
  }

  /**
   * Build daylight sentence.
   */
  buildDaylightSentence(weatherData, season) {
    const daylight = weatherData.avgDaylightHours;
    if (!daylight) return '';

    if (season === 'summer' && daylight >= 15) {
      return `Long summer days with ${daylight} hours of daylight for extended exploration.`;
    }
    if (season === 'spring' && daylight >= 13) {
      return `Lengthening spring days with ${daylight} hours of daylight.`;
    }
    if (season === 'fall' && daylight >= 11) {
      return `Comfortable ${daylight} hours of daylight—still plenty of time for sightseeing.`;
    }
    if (season === 'winter' && daylight <= 10) {
      return `Shorter winter days with ${daylight} hours of daylight—embrace the cozy evenings.`;
    }

    return '';
  }

  /**
   * Build context sentence about events, crowds, or activities.
   */
  buildContextSentence(analysis, season) {
    // Events take priority
    if (analysis.hasFestivals && analysis.events.length > 0) {
      return `Peak festival season with outdoor concerts and cultural events.`;
    }

    if (analysis.isChristmasSeason) {
      return `Festive Christmas markets and holiday atmosphere throughout the region.`;
    }

    // Low crowds messaging
    if (analysis.isLowCrowds) {
      if (season === 'winter') {
        return `Fewer tourists than peak months—excellent value and authentic local experiences.`;
      }
      return `Manageable crowds with shorter queues at major attractions.`;
    }

    // Beach context
    if (analysis.dominantCategories.includes('beach') && analysis.isWarmBeach) {
      if (season === 'summer') {
        return `Prime beach season with warm Mediterranean waters.`;
      }
      return `Beach destinations with pleasant swimming conditions.`;
    }

    // Cultural context
    if (analysis.dominantCategories.includes('cultural')) {
      if (season === 'winter') {
        return `World-class museums and indoor cultural attractions at their best.`;
      }
      return `Rich cultural heritage with iconic landmarks and museums.`;
    }

    return '';
  }

  /**
   * Analyze cities to find dominant patterns.
   */
  analyzeTierCities(cities, month) {
    const categoryScores = {};
    let totalTemp = 0;
    let tempCount = 0;
    const events = [];
    let lowCrowdCount = 0;

    for (const city of cities) {
      // Count category occurrences
      const categories = city.tags || city.tourismCategories || [];
      for (const cat of categories) {
        const catLower = cat.toLowerCase();
        for (const [pattern, keywords] of Object.entries(CATEGORY_PATTERNS)) {
          if (keywords.some(kw => catLower.includes(kw))) {
            categoryScores[pattern] = (categoryScores[pattern] || 0) + 1;
          }
        }
      }

      // Collect temperature data - check raw result format first
      const temp = city.breakdown?.timing?.details?.weatherHighC ||   // Raw result format
                   city.weather?.highC ||
                   city.v4?.factors?.timing?.details?.weatherHighC ||
                   city.highlights?.find(h => h.type === 'weather')?.name?.match(/(\d+)/)?.[1];
      if (temp) {
        totalTemp += parseInt(temp, 10);
        tempCount++;
      }

      // Collect events
      if (city.highlights) {
        const eventHighlights = city.highlights.filter(h => h.type === 'event');
        events.push(...eventHighlights.map(h => h.name));
      }
      if (city.why && city.why.toLowerCase().includes('festival')) {
        events.push(city.why);
      }

      // Check for low crowds - handle raw result format
      const crowdLevel = city.breakdown?.crowds?.details?.crowdLevel ||  // Raw result
                         city.crowdLevel || '';
      if (crowdLevel.toLowerCase().includes('low')) {
        lowCrowdCount++;
      }
    }

    // Calculate averages and dominance
    const avgTemp = tempCount > 0 ? Math.round(totalTemp / tempCount) : null;
    const threshold = cities.length * 0.4; // 40% threshold for dominance

    const dominantCategories = Object.entries(categoryScores)
      .filter(([_, count]) => count >= threshold)
      .sort((a, b) => b[1] - a[1])
      .map(([cat]) => cat);

    // Check for Christmas context (December dates)
    const isChristmasSeason = month === 11 && (
      events.some(e => e?.toLowerCase().includes('christmas')) ||
      dominantCategories.some(c => c === 'christmas')
    );

    // Check for warm beach conditions
    const isWarmBeach = dominantCategories.includes('beach') && avgTemp && avgTemp >= 18;

    // Check for low crowd majority
    const isLowCrowds = lowCrowdCount >= cities.length * 0.5;

    // Check for festival presence
    const hasFestivals = events.length >= cities.length * 0.3;

    return {
      dominantCategories,
      avgTemp,
      events: [...new Set(events)].slice(0, 3), // Unique events, max 3
      isChristmasSeason,
      isWarmBeach,
      isLowCrowds,
      hasFestivals,
      cityCount: cities.length,
    };
  }

  /**
   * Select the best template based on analysis.
   */
  selectTemplate(season, analysis, tierNumber) {
    const templates = LABEL_TEMPLATES[season];

    // Priority-based selection
    if (season === 'winter') {
      if (analysis.isChristmasSeason && analysis.dominantCategories.includes('cultural')) {
        return templates.christmas;
      }
      if (analysis.isWarmBeach) {
        return templates.beach_warm;
      }
      if (analysis.dominantCategories.includes('cultural')) {
        return templates.cultural;
      }
      if (analysis.dominantCategories.includes('food')) {
        return templates.food;
      }
    }

    if (season === 'summer') {
      if (analysis.dominantCategories.includes('beach')) {
        if (analysis.hasFestivals) {
          return templates.beach_festival;
        }
        return templates.beach;
      }
      if (analysis.isLowCrowds && tierNumber > 1) {
        return templates.low_crowds;
      }
      if (analysis.dominantCategories.includes('cultural')) {
        return templates.cultural;
      }
    }

    if (season === 'spring') {
      if (analysis.hasFestivals) {
        return templates.festival;
      }
      if (analysis.dominantCategories.includes('beach')) {
        return templates.beach;
      }
      if (analysis.dominantCategories.includes('nature')) {
        return templates.nature;
      }
      if (analysis.dominantCategories.includes('cultural')) {
        return templates.cultural;
      }
    }

    if (season === 'fall') {
      if (analysis.dominantCategories.includes('food')) {
        return templates.wine || templates.food;
      }
      if (analysis.dominantCategories.includes('beach') && analysis.avgTemp >= 20) {
        return templates.beach;
      }
      if (analysis.dominantCategories.includes('cultural')) {
        return templates.cultural;
      }
    }

    // Fallback to default for season
    return templates.default;
  }

  /**
   * Generate sublabel with specific data.
   */
  generateSublabel(baseSubLabel, analysis) {
    // Add temperature info if available
    if (analysis.avgTemp) {
      const tempRange = `${analysis.avgTemp - 2}–${analysis.avgTemp + 2}°C`;

      // Check if sublabel already has temperature-like info
      if (!baseSubLabel.includes('°')) {
        if (analysis.isWarmBeach) {
          return `${tempRange} Mediterranean warmth`;
        }
        if (analysis.avgTemp >= 20) {
          return `${baseSubLabel} • ${tempRange}`;
        }
      }
    }

    // Add event info if present
    if (analysis.events.length > 0 && !baseSubLabel.toLowerCase().includes('festival')) {
      const eventName = analysis.events[0];
      if (eventName && eventName.length < 30) {
        return `${eventName}`;
      }
    }

    return baseSubLabel;
  }

  /**
   * Get default label for a tier when no cities to analyze.
   */
  getDefaultLabel(tierNumber, startDate) {
    const month = startDate ? getMonthIndex(startDate) : new Date().getMonth();
    const season = this.getSeason(month);

    const defaultLabels = {
      1: { label: 'Top Picks', sublabel: 'Best matches for your dates' },
      2: { label: 'Great Options', sublabel: 'Strong alternatives' },
      3: { label: 'Good Options', sublabel: 'Worth considering' },
      4: { label: 'More to Explore', sublabel: 'Additional choices' },
      5: { label: 'Other Options', sublabel: 'Expanded selection' },
    };

    const base = defaultLabels[tierNumber] || defaultLabels[4];

    // Add season context
    const seasonLabels = {
      winter: 'for winter travel',
      spring: 'for spring',
      summer: 'for summer',
      fall: 'for autumn',
    };

    return {
      label: base.label,
      sublabel: `${base.sublabel} ${seasonLabels[season]}`,
    };
  }

  /**
   * Get season from month (0-indexed).
   */
  getSeason(month) {
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }
}

/**
 * Create a TierLabelGenerator instance.
 */
export function createTierLabelGenerator() {
  return new TierLabelGenerator();
}

/**
 * Quick function to generate a tier label.
 */
export function generateTierLabel(tierCities, startDate, endDate, tierNumber) {
  const generator = new TierLabelGenerator();
  return generator.generate({ tierCities, startDate, endDate, tierNumber });
}
