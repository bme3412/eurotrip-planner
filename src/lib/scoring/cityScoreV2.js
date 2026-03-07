/**
 * City Scoring Engine V2
 *
 * Weighted multi-factor scoring with real-time enrichment data.
 * Replaces the simple +0.2/+0.3 boost system with a proper weighted average.
 *
 * Factors:
 * - baseline     (25%) - existing visit calendar score
 * - weather      (20%) - real-time forecast vs user preferences
 * - events       (20%) - matching events during trip dates
 * - crowds       (15%) - expected crowd levels vs tolerance
 * - pricing      (10%) - flight/hotel affordability (Phase 3)
 * - personalization (10%) - user interest matching
 */

import fs from 'fs';
import path from 'path';
import {
  generateMockWeather,
  generateMockEvents,
  generateMockCrowdLevel,
  generateMockPricing,
} from '../enrichment/mockDataGenerators.js';

// ── Configuration ────────────────────────────────────────────────────

const SCORING_WEIGHTS = {
  baseline: 0.25,
  weather: 0.20,
  events: 0.20,
  crowds: 0.15,
  pricing: 0.10,
  personalization: 0.10,
};

const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

const CROWD_ORDER = ['Very Low', 'Low', 'Moderate', 'High', 'Very High', 'Extreme'];

const CROWD_ALIASES = {
  'very low': 'Very Low',
  'low': 'Low',
  'low-moderate': 'Low',
  'low to moderate': 'Low',
  'moderate': 'Moderate',
  'medium': 'Moderate',
  'moderate-high': 'High',
  'medium-high': 'High',
  'moderate to high': 'High',
  'moderately high': 'High',
  'high': 'High',
  'high at popular spots': 'High',
  'high at major museums': 'High',
  'high in montmartre': 'High',
  'high (tourists), low (locals)': 'High',
  'low (streets), full (restaurants)': 'Moderate',
  'very high': 'Very High',
  'very high along route': 'Very High',
  'very high (tourists)': 'Very High',
  'extreme': 'Extreme',
  'extremely high': 'Extreme',
};

// ── Caches ───────────────────────────────────────────────────────────

let manifestCache = null;
let calendarCache = new Map();
let citiesCache = null;

function getManifest() {
  if (!manifestCache) {
    const p = path.join(process.cwd(), 'public', 'data', 'manifest.json');
    manifestCache = JSON.parse(fs.readFileSync(p, 'utf-8'));
  }
  return manifestCache;
}

function getCitiesList() {
  if (!citiesCache) {
    try {
      const listPath = path.join(process.cwd(), 'src', 'generated', 'cities.json');
      citiesCache = JSON.parse(fs.readFileSync(listPath, 'utf-8'));
    } catch {
      citiesCache = [];
    }
  }
  return citiesCache;
}

function readCalendar(slug) {
  if (calendarCache.has(slug)) return calendarCache.get(slug);

  const manifest = getManifest();
  const entry = manifest.cities[slug];
  if (!entry) {
    calendarCache.set(slug, null);
    return null;
  }

  const calPath = path.join(
    process.cwd(), 'public', 'data',
    entry.country, entry.directoryName,
    `${slug}-visit-calendar.json`
  );

  try {
    const data = JSON.parse(fs.readFileSync(calPath, 'utf-8'));
    calendarCache.set(slug, data);
    return data;
  } catch {
    calendarCache.set(slug, null);
    return null;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────

function normalizeCrowdLevel(raw) {
  if (!raw) return null;
  return CROWD_ALIASES[raw.toLowerCase()] ?? raw;
}

function findRange(monthData, day) {
  if (!monthData?.ranges) return null;
  for (const range of monthData.ranges) {
    if (range.days && range.days.includes(day)) {
      return range;
    }
  }
  return null;
}

// ── Individual Score Calculators ─────────────────────────────────────

/**
 * Calculate baseline score from static visit calendar data.
 */
function calculateBaselineScore(slug, startDate, endDate) {
  const cal = readCalendar(slug);
  if (!cal?.months) return { value: 3, confidence: 0.3, reason: 'No calendar data' };

  const scores = [];
  const crowdLevels = [];
  const events = [];
  const travelerTypeScores = {};

  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    const monthIdx = current.getMonth();
    const day = current.getDate();
    const monthName = MONTH_NAMES[monthIdx];
    const monthData = cal.months[monthName];

    if (monthData) {
      const range = findRange(monthData, day);
      if (range) {
        scores.push(range.score || 3);

        if (range.crowdLevel) {
          const normalized = normalizeCrowdLevel(range.crowdLevel);
          if (normalized) crowdLevels.push(normalized);
        }

        if (range.event && range.special) {
          events.push({ name: range.event, score: range.score, month: monthName });
        }

        if (range.travelerTypes && typeof range.travelerTypes === 'object') {
          for (const [type, score] of Object.entries(range.travelerTypes)) {
            if (!travelerTypeScores[type]) travelerTypeScores[type] = [];
            travelerTypeScores[type].push(typeof score === 'number' ? score : 3);
          }
        }
      }
    }
    current.setDate(current.getDate() + 1);
  }

  if (scores.length === 0) {
    return { value: 3, confidence: 0.3, reason: 'No data for date range' };
  }

  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

  // Determine dominant crowd level
  const crowdCounts = {};
  crowdLevels.forEach(c => { crowdCounts[c] = (crowdCounts[c] || 0) + 1; });
  const crowdLevel = Object.entries(crowdCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';

  // Get top traveler types
  const topTravelerTypes = Object.entries(travelerTypeScores)
    .map(([type, sc]) => ({
      type,
      avg: sc.reduce((a, b) => a + b, 0) / sc.length,
    }))
    .filter(t => t.avg >= 3)
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 3)
    .map(t => t.type);

  return {
    value: avgScore,
    confidence: 0.9, // Static data is reliable (just potentially stale)
    crowdLevel,
    crowdIdx: CROWD_ORDER.indexOf(crowdLevel),
    events: events.slice(0, 3),
    travelerTypes: topTravelerTypes,
    daysScored: scores.length,
    reason: events.length > 0 ? `${events[0].name} during your trip` : `Based on ${scores.length} days`,
  };
}

/**
 * Calculate weather score based on real-time forecast.
 */
function calculateWeatherScore(weatherData, travelerProfile = {}) {
  if (!weatherData || weatherData.error) {
    return { value: null, confidence: 0, reason: 'Weather data unavailable' };
  }

  const idealTemp = travelerProfile.preferences?.idealTemp || { min: 15, max: 25 };

  // Temperature comfort (0-5)
  let tempScore = 5;
  const avgTemp = weatherData.avgTemp;

  if (avgTemp < idealTemp.min) {
    tempScore -= Math.min(3, (idealTemp.min - avgTemp) * 0.2);
  } else if (avgTemp > idealTemp.max) {
    tempScore -= Math.min(3, (avgTemp - idealTemp.max) * 0.15);
  }

  // Precipitation penalty
  const precipPerDay = weatherData.totalPrecipitationMm / weatherData.numDays;
  const rainPenalty = Math.min(1.5, precipPerDay / 10);

  // Sunshine bonus
  const sunshineBonus = Math.min(1, weatherData.avgSunshineHoursPerDay / 8);

  // Good weather ratio bonus
  const goodWeatherBonus = weatherData.goodWeatherRatio * 0.5;

  const value = Math.max(1, Math.min(5, tempScore - rainPenalty + sunshineBonus + goodWeatherBonus));

  // Build reason
  let reason = `${Math.round(weatherData.avgTemp)}°C avg`;
  if (weatherData.goodWeatherRatio >= 0.7) {
    reason += ', mostly sunny';
  } else if (weatherData.totalPrecipitationMm > 20) {
    reason += ', some rain expected';
  }

  return {
    value: Math.round(value * 10) / 10,
    confidence: weatherData.confidence,
    avgTemp: weatherData.avgTemp,
    condition: weatherData.dominantCondition,
    goodWeatherRatio: weatherData.goodWeatherRatio,
    reason,
    raw: weatherData,
  };
}

/**
 * Calculate event score based on festivals/activities during trip.
 */
function calculateEventScore(baselineData, travelerProfile = {}) {
  const events = baselineData?.events || [];
  const interests = travelerProfile.interests || [];

  if (events.length === 0) {
    return { value: 3, confidence: 0.8, events: [], reason: 'No special events' };
  }

  let score = 3;

  for (const event of events) {
    // Base boost for having an event
    const eventBoost = event.score >= 4 ? 1.0 : 0.5;
    score += eventBoost;

    // TODO: Match event categories to user interests when we have event categorization
  }

  return {
    value: Math.min(5, score),
    confidence: 0.85,
    events: events.map(e => e.name),
    reason: events.length === 1 ? events[0].name : `${events.length} events during trip`,
  };
}

/**
 * Calculate crowd score based on expected tourism levels.
 */
function calculateCrowdScore(baselineData, travelerProfile = {}) {
  const crowdLevel = baselineData?.crowdLevel;
  const crowdIdx = baselineData?.crowdIdx ?? -1;

  if (crowdIdx < 0) {
    return { value: null, confidence: 0, reason: 'No crowd data' };
  }

  const crowdTolerance = travelerProfile.crowdTolerance || 'moderate';

  // Scoring based on crowd preference
  // Most travelers prefer lower crowds, but some like vibrant atmospheres
  const preferences = {
    'loves-crowds': { ideal: 4, tolerance: 2 },     // High/Very High
    'moderate': { ideal: 2, tolerance: 2 },         // Moderate
    'avoids-crowds': { ideal: 0, tolerance: 1.5 },  // Very Low
  };

  const pref = preferences[crowdTolerance] || preferences.moderate;
  const deviation = Math.abs(crowdIdx - pref.ideal);
  const score = Math.max(1, 5 - (deviation / pref.tolerance));

  return {
    value: Math.round(score * 10) / 10,
    confidence: 0.7,
    level: crowdLevel,
    levelIdx: crowdIdx,
    reason: crowdIdx <= 1 ? 'Fewer crowds' : crowdIdx >= 4 ? 'Peak season, busy' : 'Moderate crowds',
  };
}

/**
 * Calculate pricing score based on affordability.
 */
function calculatePricingScore(pricingData, travelerProfile = {}) {
  if (!pricingData || !pricingData.affordabilityScore) {
    return { value: null, confidence: 0, reason: 'Pricing data unavailable' };
  }

  const budgetPreference = travelerProfile.budget || 'moderate';

  // Score based on budget match
  let score = pricingData.affordabilityScore; // 1-5 scale (5 = cheapest)

  // Adjust based on user preference
  if (budgetPreference === 'budget') {
    // Budget travelers prefer cheap destinations
    score = pricingData.affordabilityScore;
  } else if (budgetPreference === 'luxury') {
    // Luxury travelers might prefer expensive destinations (inverse)
    score = 6 - pricingData.affordabilityScore;
  } else {
    // Moderate - slight preference for value
    score = Math.min(5, pricingData.affordabilityScore + 1);
  }

  return {
    value: Math.max(1, Math.min(5, score)),
    confidence: 0.7,
    tier: pricingData.tier,
    hotelPerNight: pricingData.hotelPerNight,
    reason: pricingData.tier === 'budget' ? 'Great value destination'
      : pricingData.tier === 'expensive' ? 'Premium destination'
      : 'Mid-range pricing',
  };
}

/**
 * Calculate personalization score based on traveler type match.
 */
function calculatePersonalizationScore(baselineData, travelerProfile = {}) {
  const travelerType = travelerProfile.type?.toLowerCase();
  const cityTravelerTypes = baselineData?.travelerTypes || [];

  if (!travelerType || cityTravelerTypes.length === 0) {
    return { value: 3, confidence: 0.5, reason: 'No preference match data' };
  }

  const matches = cityTravelerTypes.includes(travelerType);
  const score = matches ? 4.5 : 2.5;

  return {
    value: score,
    confidence: 0.7,
    matches,
    cityTypes: cityTravelerTypes,
    reason: matches ? `Great for ${travelerType} travelers` : `Better suited for ${cityTravelerTypes[0] || 'other'} travelers`,
  };
}

// ── Main Scoring Function ────────────────────────────────────────────

/**
 * Calculate weighted multi-factor score for a city.
 *
 * @param {Object} params
 * @param {string} params.citySlug - City identifier
 * @param {string|Date} params.startDate - Trip start date
 * @param {string|Date} params.endDate - Trip end date
 * @param {Object} params.travelerProfile - User preferences
 * @param {Object} params.enrichmentData - Pre-fetched weather/events/pricing data
 * @returns {Object} Scored city with breakdown
 */
export function calculateCityScoreV2({
  citySlug,
  startDate,
  endDate,
  travelerProfile = {},
  enrichmentData = {},
}) {
  // Calculate individual factor scores
  const baselineResult = calculateBaselineScore(citySlug, startDate, endDate);
  const weatherResult = calculateWeatherScore(enrichmentData.weather, travelerProfile);
  const eventResult = calculateEventScore(baselineResult, travelerProfile);
  const crowdResult = calculateCrowdScore(baselineResult, travelerProfile);
  const pricingResult = calculatePricingScore(enrichmentData.pricing, travelerProfile);
  const personalizationResult = calculatePersonalizationScore(baselineResult, travelerProfile);

  const scores = {
    baseline: baselineResult,
    weather: weatherResult,
    events: eventResult,
    crowds: crowdResult,
    pricing: pricingResult,
    personalization: personalizationResult,
  };

  // Calculate weighted average, skipping factors with no data
  let weightedSum = 0;
  let totalWeight = 0;
  let confidenceSum = 0;
  let factorCount = 0;

  for (const [factor, weight] of Object.entries(SCORING_WEIGHTS)) {
    const result = scores[factor];
    if (result && result.value !== null && result.confidence > 0) {
      weightedSum += result.value * weight * result.confidence;
      totalWeight += weight * result.confidence;
      confidenceSum += result.confidence;
      factorCount++;
    }
  }

  // Fallback to baseline if no weighted data
  const finalScore = totalWeight > 0
    ? weightedSum / totalWeight
    : baselineResult.value;

  const avgConfidence = factorCount > 0
    ? confidenceSum / factorCount
    : 0.5;

  return {
    finalScore: Math.round(finalScore * 100) / 100,
    confidence: Math.round(avgConfidence * 100) / 100,
    breakdown: scores,
    dataFreshness: {
      weather: enrichmentData.weather?.source || 'none',
      baseline: 'static',
    },
  };
}

// ── Public API ───────────────────────────────────────────────────────

/**
 * Score multiple cities for a date range with enrichment data.
 *
 * @param {Object} params
 * @param {string|Date} params.startDate
 * @param {string|Date} params.endDate
 * @param {string} params.travelerType - e.g., 'couples', 'families', 'solo'
 * @param {Object} params.preferences - Additional preferences
 * @param {number} params.limit - Max results to return
 * @param {boolean} params.includeEnrichment - Whether to include weather/events/pricing data
 * @returns {Promise<Array>} Scored and sorted city list
 */
export async function scoreCitiesV2({
  startDate,
  endDate,
  travelerType,
  preferences = {},
  limit = 20,
  includeEnrichment = true,
}) {
  const manifest = getManifest();
  const citiesList = getCitiesList();
  const cityMap = Object.fromEntries(citiesList.map(c => [c.id, c]));

  const travelerProfile = {
    type: travelerType,
    ...preferences,
  };

  const results = [];

  // Process each city
  for (const slug of Object.keys(manifest.cities)) {
    const city = cityMap[slug];
    if (!city) continue;

    // Generate enrichment data (mock for now, swap for real APIs later)
    let enrichmentData = {};

    if (includeEnrichment && city.latitude && city.longitude) {
      // Weather based on latitude/climate zone
      enrichmentData.weather = generateMockWeather(
        city.latitude,
        city.longitude,
        startDate,
        endDate
      );

      // Events based on city/country/dates
      enrichmentData.events = generateMockEvents(
        slug,
        city.country,
        startDate,
        endDate
      );

      // Crowd levels based on season and city popularity
      enrichmentData.crowds = generateMockCrowdLevel(
        slug,
        city.country,
        startDate,
        endDate
      );

      // Pricing estimates
      enrichmentData.pricing = generateMockPricing(
        slug,
        startDate,
        endDate
      );
    }

    // Calculate score
    const scoreResult = calculateCityScoreV2({
      citySlug: slug,
      startDate,
      endDate,
      travelerProfile,
      enrichmentData,
    });

    // Build result object
    const baseline = scoreResult.breakdown.baseline;
    const weather = scoreResult.breakdown.weather;
    const events = scoreResult.breakdown.events;
    const crowds = scoreResult.breakdown.crowds;
    const pricing = scoreResult.breakdown.pricing;

    results.push({
      id: slug,
      title: `${city.name || slug}, ${city.country || ''}`.trim(),
      subtitle: city.description || '',
      tags: baseline.travelerTypes?.map(t => t.charAt(0).toUpperCase() + t.slice(1)) || [],

      // Scores
      score: Math.round(scoreResult.finalScore * 10) / 10,
      confidence: scoreResult.confidence,
      popularity: Math.round(scoreResult.finalScore * 20),
      value: crowds.levelIdx >= 0 && crowds.levelIdx <= 1 ? 85 : 65,

      // Weather
      weather: weather.value ? {
        avgTemp: weather.avgTemp,
        condition: weather.condition,
        goodWeatherRatio: weather.goodWeatherRatio,
        score: weather.value,
        confidence: weather.confidence,
      } : null,

      // Events (combine baseline + enrichment)
      events: [...(events.events || []), ...(enrichmentData.events?.events?.map(e => e.name) || [])].slice(0, 3),
      primaryEvent: baseline.events?.[0] || enrichmentData.events?.events?.[0] || null,

      // Crowds
      crowdLevel: enrichmentData.crowds?.level || crowds.level || baseline.crowdLevel,

      // Pricing
      pricing: enrichmentData.pricing ? {
        hotelPerNight: enrichmentData.pricing.hotelPerNight,
        tier: enrichmentData.pricing.tier,
      } : null,

      // Why this city?
      why: buildWhyReason(scoreResult, enrichmentData),

      // Metadata
      image: city.thumbnail || `/images/city-thumbnail/${slug}-thumbnail.jpeg`,
      cityId: slug,
      cityName: city.name || slug,
      country: city.country || '',
      coordinates: city.latitude && city.longitude ? [city.longitude, city.latitude] : null,

      // Score breakdown for debugging/transparency
      scoreBreakdown: {
        baseline: baseline.value,
        weather: weather.value,
        events: events.value,
        crowds: crowds.value,
        pricing: pricing.value,
        personalization: scoreResult.breakdown.personalization.value,
      },

      // Internal fields for sorting
      _finalScore: scoreResult.finalScore,
      _confidence: scoreResult.confidence,
      _hasEvents: (events.events?.length || 0) > 0 || (enrichmentData.events?.count || 0) > 0,
      _crowdIdx: crowds.levelIdx ?? 5,
    });
  }

  // Sort by final score, then by confidence, then by crowd level
  results.sort((a, b) => {
    const scoreDiff = b._finalScore - a._finalScore;
    if (Math.abs(scoreDiff) > 0.01) return scoreDiff;

    // Prefer higher confidence
    const confDiff = b._confidence - a._confidence;
    if (Math.abs(confDiff) > 0.05) return confDiff;

    // Prefer cities with events
    if (a._hasEvents !== b._hasEvents) return a._hasEvents ? -1 : 1;

    // Prefer lower crowds
    return a._crowdIdx - b._crowdIdx;
  });

  // Remove internal fields and limit results
  return results.slice(0, limit).map(({
    _finalScore, _confidence, _hasEvents, _crowdIdx, ...rest
  }) => rest);
}

/**
 * Build a human-readable "why this city" reason.
 */
function buildWhyReason(scoreResult, enrichmentData = {}) {
  const parts = [];
  const { baseline, weather, events, crowds, pricing } = scoreResult.breakdown;

  // Score label
  const scoreLabels = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Great', 5: 'Excellent' };
  const label = scoreLabels[Math.round(scoreResult.finalScore)] || 'Good';
  parts.push(`${label} time to visit`);

  // Weather highlight
  if (weather.value && weather.confidence > 0.5) {
    if (weather.value >= 4) {
      parts.push(`${Math.round(weather.avgTemp)}°C, ${weather.condition?.toLowerCase()}`);
    } else if (weather.value < 3) {
      parts.push('weather may be challenging');
    }
  }

  // Event highlight (from baseline or enrichment)
  const allEvents = [
    ...(events.events || []),
    ...(enrichmentData.events?.events?.map(e => e.name) || [])
  ];
  if (allEvents.length > 0) {
    parts.push(allEvents[0]);
  }

  // Crowd highlight
  const crowdIdx = enrichmentData.crowds?.levelIdx ?? crowds.levelIdx;
  if (crowdIdx >= 0) {
    if (crowdIdx <= 1) parts.push('fewer crowds');
    else if (crowdIdx >= 4) parts.push('peak season');
  }

  // Value highlight
  if (pricing.tier === 'budget' && parts.length < 3) {
    parts.push('great value');
  }

  return parts.slice(0, 3).join(' · ');
}

// Export for backward compatibility
export { calculateBaselineScore };
