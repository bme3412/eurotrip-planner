/**
 * Gap Suggester - Date-First Scoring Algorithm
 *
 * Suggests cities to fill gaps in a trip using weighted factors:
 * - Timing Score (40%): Weather + Events + Crowds for specific dates
 * - Route Score (25%): Travel time from start + connection to end city
 * - Interest Score (20%): User preference matching
 * - Value Score (15%): Budget alignment
 */

import { calculateEaseScores, batchGetConnectionsToCity } from './easeScoreCalculator';
import { suggestDaysForCity } from './gapAnalyzer';
import { batchGetDateScores, getScoreBadges } from './dateScorer';
import { generateVisitDescription, generateShortTagline } from './generateVisitDescription';
import { normalizeRankedCandidate } from '@/lib/discovery/rankedCandidate';
import cityTraitsData from '@/lib/planning/config/cityTraits.json';
import citiesData from '@/generated/cities.json';

// Build lookup for city descriptions and thumbnails
const citiesLookup = {};
for (const city of citiesData) {
  citiesLookup[city.id] = {
    description: city.description,
    thumbnail: city.thumbnail,
    tourismCategories: city.tourismCategories,
  };
}

// =============================================================================
// SCORING WEIGHTS (must sum to 1.0)
// =============================================================================
const WEIGHTS = {
  timing: 0.40,    // Weather + Events + Crowds
  route: 0.25,     // Travel time + end-city connectivity
  interest: 0.20,  // User preferences
  value: 0.15,     // Budget alignment
};

// =============================================================================
// TIMING SCORE HELPERS (40% of total)
// =============================================================================

/**
 * Calculate weather score (0-100)
 */
function calculateWeatherScore(weatherData) {
  if (!weatherData) return 50; // Neutral if no data

  let score = 0;
  const temp = weatherData.avgC ?? weatherData.highC ?? 20;

  // Temperature scoring
  if (temp >= 15 && temp <= 25) {
    score = 100; // Ideal
  } else if ((temp >= 10 && temp < 15) || (temp > 25 && temp <= 30)) {
    score = 80; // Good
  } else if ((temp >= 5 && temp < 10) || (temp > 30 && temp <= 35)) {
    score = 60; // Acceptable
  } else {
    score = 40; // Poor
  }

  // Rain penalty
  const rain = weatherData.rainfallMm ?? 0;
  if (rain > 100) score -= 20;
  else if (rain > 75) score -= 10;

  // Sunshine bonus
  const sunshine = weatherData.sunshineHours ?? 6;
  if (sunshine >= 8) score += 10;

  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate event score (0-100)
 */
function calculateEventScore(events) {
  if (!events || events.length === 0) return 40; // No events = baseline

  // Check for major festivals/events
  const eventNames = events.map(e => (e.name || e).toLowerCase());

  const isMajorFestival = eventNames.some(name =>
    name.includes('festival') ||
    name.includes('carnival') ||
    name.includes('carnevale') ||
    name.includes('christmas market') ||
    name.includes('oktoberfest') ||
    name.includes('pride')
  );

  if (isMajorFestival) return 100;

  // Notable events (holidays, special occasions)
  const isNotableEvent = eventNames.some(name =>
    name.includes('holiday') ||
    name.includes('new year') ||
    name.includes('easter') ||
    name.includes('summer')
  );

  if (isNotableEvent) return 80;

  // Any event present
  return 60;
}

/**
 * Calculate crowd score (0-100) - higher is better (fewer crowds)
 */
function calculateCrowdScore(crowdLevel) {
  const crowdMap = {
    'very low': 100,
    'low': 85,
    'moderate': 65,
    'high': 45,
    'very high': 25,
    'extreme': 10,
  };

  const level = (crowdLevel || 'moderate').toLowerCase();
  return crowdMap[level] ?? 65;
}

/**
 * Calculate combined timing score (0-100)
 * Components: Weather (50%), Events (35%), Crowds (15%)
 */
function calculateTimingScore(dateScore) {
  if (!dateScore) return 50; // Neutral if no data

  const weatherScore = calculateWeatherScore(dateScore.weather);
  const eventScore = calculateEventScore(dateScore.events);
  const crowdScore = calculateCrowdScore(dateScore.crowds?.level);

  return Math.round(
    (weatherScore * 0.50) + (eventScore * 0.35) + (crowdScore * 0.15)
  );
}

// =============================================================================
// ROUTE SCORE HELPERS (25% of total)
// =============================================================================

/**
 * Calculate travel score from minutes (0-100)
 */
function calculateTravelScore(travelMinutes) {
  if (!travelMinutes || travelMinutes >= 999) return 30;

  if (travelMinutes < 120) return 100;       // <2h: excellent
  if (travelMinutes < 180) return 85;        // 2-3h: great
  if (travelMinutes < 240) return 70;        // 3-4h: good
  if (travelMinutes < 360) return 50;        // 4-6h: acceptable
  return 30;                                  // >6h: poor
}

/**
 * Calculate route score with end-city awareness (0-100)
 * Components: Travel from start (60%), Connection to end (40%)
 */
function calculateRouteScore(travelMinutes, endCityConnection) {
  const travelScore = calculateTravelScore(travelMinutes);

  if (!endCityConnection) {
    // No end city specified, just use travel score
    return travelScore;
  }

  const endCityScore = calculateTravelScore(endCityConnection.travelMinutes);
  return Math.round((travelScore * 0.60) + (endCityScore * 0.40));
}

// =============================================================================
// INTEREST SCORE HELPERS (20% of total)
// =============================================================================

// Build a lookup: cityId -> array of trait names
const cityTraitsLookup = {};
for (const [traitName, traitData] of Object.entries(cityTraitsData.traits)) {
  for (const cityId of traitData.cities) {
    if (!cityTraitsLookup[cityId]) {
      cityTraitsLookup[cityId] = [];
    }
    cityTraitsLookup[cityId].push(traitName);
  }
}

// Map user interest selections to city traits
const INTEREST_TO_TRAIT_MAP = {
  'Culture & History': ['cultural', 'historical'],
  'Food & Drink': ['foodie', 'culinary'],
  'Art & Museums': ['cultural', 'artScene'],
  'Nature & Outdoors': ['adventure', 'scenic', 'nature'],
  'Architecture': ['architectural', 'historical'],
  'Nightlife': ['nightlife', 'partyScene'],
  'Shopping': ['shopping', 'fashionCapital'],
  'Photography': ['scenic', 'photogenic', 'beautiful'],
};

/**
 * Calculate interest match for a city
 * @returns {{ score: number, matches: string[] }}
 */
function calculateInterestMatch(cityTraits, userInterests) {
  if (!userInterests || userInterests.length === 0 || !cityTraits || cityTraits.length === 0) {
    return { score: 0, matches: [] };
  }

  const matches = [];

  for (const interest of userInterests) {
    const matchingTraits = INTEREST_TO_TRAIT_MAP[interest] || [];
    for (const trait of matchingTraits) {
      if (cityTraits.includes(trait)) {
        matches.push(interest);
        break; // Only count each interest once
      }
    }
  }

  return { matches };
}

/**
 * Calculate interest score (0-100)
 * Base: 40, +15 per matching interest (max 4), +10 for pace alignment
 */
function calculateInterestScore(cityTraits, userInterests, paceId, recommendedDays) {
  let score = 40; // Baseline

  // Interest matching: +15 per match (max 60 points from interests)
  const { matches } = calculateInterestMatch(cityTraits, userInterests);
  score += Math.min(matches.length, 4) * 15;

  // Pace alignment: +10
  if (paceId === 'active' && recommendedDays <= 2) score += 10;
  else if (paceId === 'relaxed' && recommendedDays >= 4) score += 10;
  else if (paceId === 'balanced' && recommendedDays >= 2 && recommendedDays <= 3) score += 5;

  return Math.min(100, score);
}

// =============================================================================
// VALUE SCORE HELPERS (15% of total)
// =============================================================================

// Budget-friendly cities
const BUDGET_CITIES = new Set([
  'budapest', 'prague', 'krakow', 'warsaw', 'bucharest',
  'sofia', 'belgrade', 'ljubljana', 'zagreb', 'bratislava',
  'porto', 'seville', 'valencia', 'malaga', 'granada',
  'naples', 'palermo', 'bologna', 'split', 'dubrovnik',
  'tallinn', 'riga', 'vilnius'
]);

// Premium/luxury cities
const PREMIUM_CITIES = new Set([
  'paris', 'monaco', 'zurich', 'geneva', 'milan', 'florence',
  'venice', 'santorini', 'mykonos', 'vienna', 'salzburg',
  'lucerne', 'nice', 'cannes', 'st-moritz', 'london', 'amsterdam'
]);

/**
 * Calculate value score (0-100) based on budget alignment
 */
function calculateValueScore(cityId, userBudget) {
  const isBudgetCity = BUDGET_CITIES.has(cityId);
  const isPremiumCity = PREMIUM_CITIES.has(cityId);

  if (!userBudget) return 70; // Neutral if no preference

  if (userBudget === 'budget') {
    if (isBudgetCity) return 100;
    if (isPremiumCity) return 40;
    return 70; // Moderate city
  }

  if (userBudget === 'premium') {
    if (isPremiumCity) return 100;
    if (isBudgetCity) return 60; // Budget cities can still be nice
    return 80; // Moderate city
  }

  // Moderate budget - all cities are fine
  return 75;
}

// =============================================================================
// MATCH REASONS GENERATOR
// =============================================================================

/**
 * Generate human-readable match reasons for a city
 */
function generateMatchReasons(city, travelMinutes, timingScore, dateScore) {
  const reasons = [];
  const traits = cityTraitsLookup[city.id] || [];

  // Date-based reasons (prioritize these)
  if (dateScore?.events?.length > 0) {
    const eventName = dateScore.events[0]?.name || dateScore.events[0];
    if (eventName) {
      reasons.push(eventName.length > 20 ? eventName.slice(0, 18) + '...' : eventName);
    }
  }

  if (timingScore >= 80) {
    reasons.push('Great weather');
  } else if (timingScore >= 70) {
    reasons.push('Good timing');
  }

  // Travel time reasons
  if (travelMinutes <= 90) {
    reasons.push('Quick connection');
  } else if (travelMinutes <= 150) {
    reasons.push('Easy access');
  }

  // Direct high-speed train
  if (city.allTransport?.train) {
    const train = city.allTransport.train;
    if (train.trainType === 'TGV' || train.trainType === 'ICE' || train.trainType === 'Eurostar') {
      reasons.push('High-speed train');
    }
  }

  // Trait-based reasons
  const traitReasons = {
    romantic: 'Romantic',
    cultural: 'Cultural',
    foodie: 'Great food scene',
    budgetFriendly: 'Budget-friendly',
    hubCity: 'Well-connected',
    nightlife: 'Vibrant nightlife',
    beachDestination: 'Beach access',
    familyFriendly: 'Family-friendly',
    adventure: 'Adventure',
    relaxation: 'Relaxing',
  };

  for (const trait of traits) {
    if (traitReasons[trait] && reasons.length < 4) {
      reasons.push(traitReasons[trait]);
    }
  }

  return reasons.slice(0, 4);
}

/**
 * Get suggestions for filling a gap - DATE-FIRST SCORING
 *
 * Uses weighted scoring formula:
 * - Timing (40%): Weather + Events + Crowds for specific dates
 * - Route (25%): Travel time + end-city connectivity
 * - Interest (20%): User preference matching
 * - Value (15%): Budget alignment
 *
 * @param {Object} params
 * @param {string} params.fromCity - The city before the gap (or null if gap is at start)
 * @param {string} params.toCity - The city after the gap (or null if gap is at end)
 * @param {string} params.gapStart - Start date of the gap (YYYY-MM-DD)
 * @param {string} params.gapEnd - End date of the gap (YYYY-MM-DD)
 * @param {Object} params.preferences - User preferences (budget, interests, paceId)
 * @returns {Promise<Array>} Array of city suggestions
 */
export async function getSuggestionsForGap({
  fromCity,
  toCity,
  gapStart,
  gapEnd,
  preferences = {},
}) {
  const gapDays = Math.round(
    (new Date(gapEnd) - new Date(gapStart)) / (1000 * 60 * 60 * 24)
  );

  // Get ease scores from start city
  const sourceCity = fromCity || toCity;
  let easeScores = [];

  if (sourceCity) {
    try {
      easeScores = await calculateEaseScores(sourceCity);
    } catch (error) {
      console.warn('[gapSuggester] Failed to get ease scores:', error);
    }
  }

  // Pre-filter candidates by travel time constraints
  const candidates = easeScores.filter(city => {
    if (toCity && city.id === toCity) return false;
    const travelMinutes = parseTimeToMinutes(city.transportTime);
    if (gapDays <= 2 && travelMinutes > 180) return false;
    if (gapDays <= 4 && travelMinutes > 360) return false;
    return true;
  });

  if (candidates.length === 0) return [];

  // === FETCH ALL SCORING DATA IN PARALLEL ===

  // 1. Date scores for timing (weather, events, crowds)
  const dateScoreRequests = candidates.map(c => ({
    cityId: c.id,
    startDate: gapStart,
    endDate: gapEnd,
  }));

  // 2. End-city connections (if end city specified)
  const candidateIds = candidates.map(c => c.id);

  const [dateScores, endCityConnections] = await Promise.all([
    batchGetDateScores(dateScoreRequests).catch(() => new Map()),
    toCity ? batchGetConnectionsToCity(candidateIds, toCity).catch(() => new Map()) : Promise.resolve(new Map()),
  ]);

  // === CALCULATE SCORES USING NEW FORMULA ===

  const suggestions = candidates.map(city => {
    const travelMinutes = parseTimeToMinutes(city.transportTime);
    const recommendedDays = suggestDaysForCity(gapDays, city.id);
    const traits = cityTraitsLookup[city.id] || [];
    const dateScore = dateScores.get(city.id);
    const endCityConnection = endCityConnections.get(city.id);

    // 1. TIMING SCORE (40% weight)
    const timingScore = calculateTimingScore(dateScore);

    // 2. ROUTE SCORE (25% weight)
    const routeScore = calculateRouteScore(travelMinutes, endCityConnection);

    // 3. INTEREST SCORE (20% weight)
    const interestScore = calculateInterestScore(
      traits,
      preferences.interests,
      preferences.paceId,
      recommendedDays
    );

    // 4. VALUE SCORE (15% weight)
    const valueScore = calculateValueScore(city.id, preferences.budget);

    // === WEIGHTED TOTAL ===
    const totalScore = Math.round(
      (timingScore * WEIGHTS.timing) +
      (routeScore * WEIGHTS.route) +
      (interestScore * WEIGHTS.interest) +
      (valueScore * WEIGHTS.value)
    );

    // Get interest matches for "Best for You" grouping
    const { matches: interestMatches } = calculateInterestMatch(traits, preferences.interests);

    // Generate match reasons with timing context
    const matchReasons = generateMatchReasons(city, travelMinutes, timingScore, dateScore);

    // Format transport details
    const train = city.allTransport?.train;
    const transportDetails = {
      type: city.transportType === 'train'
        ? (train?.trainType || 'Train')
        : city.transportType?.charAt(0).toUpperCase() + city.transportType?.slice(1) || 'Transport',
      frequency: city.transportFrequency || null,
      priceRange: city.transportPrice || train?.priceRange || null,
      isDirect: !!(city.allTransport?.train),
    };

    // Build date score display data
    const badges = dateScore ? getScoreBadges(dateScore) : null;

    // Get city description and thumbnail from cities.json
    const cityInfo = citiesLookup[city.id] || {};
    const thumbnail = cityInfo.thumbnail ||
      `/images/city-thumbnail/${city.country?.replace(/\s+/g, '-')}/${city.id}-thumbnail.jpeg`;

    // Build enriched city object for description generation
    const enrichedCity = {
      ...city,
      traits,
      description: cityInfo.description,
      tourismCategories: cityInfo.tourismCategories,
    };

    // Generate contextual visit description
    const visitDescription = generateVisitDescription(enrichedCity, dateScore, gapStart, gapEnd);
    const shortTagline = generateShortTagline(enrichedCity, dateScore);

    return {
      ...city,
      recommendedDays,
      score: totalScore,
      travelMinutes,
      fitsGap: recommendedDays <= gapDays,
      traits,
      matchReasons,
      transportDetails,
      // Interest matching for "Best for You" grouping
      interestMatches,
      hasInterestMatch: interestMatches.length > 0,
      // Scoring breakdown for debugging/display
      scoreBreakdown: {
        timing: timingScore,
        route: routeScore,
        interest: interestScore,
        value: valueScore,
      },
      // Date score data for badges
      dateScore: badges ? {
        overall: dateScore?.overall,
        weather: badges.weather,
        crowds: badges.crowds,
        events: badges.events,
      } : null,
      dateEnriched: !!dateScore,
      // End city connection info
      endCityConnection: endCityConnection ? {
        travelMinutes: endCityConnection.travelMinutes,
        transportType: endCityConnection.transportType,
      } : null,
      // Enhanced data for modal
      thumbnail,
      description: cityInfo.description,
      visitDescription,
      shortTagline,
    };
  });

  // Sort by total score and attach the same ranked-candidate contract used by discovery.
  return suggestions
    .sort((a, b) => b.score - a.score)
    .map((suggestion, index) => ({
      ...suggestion,
      rankedCandidate: normalizeRankedCandidate({
        ...suggestion,
        reason: suggestion.visitDescription || suggestion.shortTagline,
      }, {
        rank: index + 1,
        startDate: gapStart,
        endDate: gapEnd,
      }),
    }));
}

/**
 * Parse a time string like "2h 30m" to minutes
 */
function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 999;

  const hours = timeStr.match(/(\d+)h/);
  const minutes = timeStr.match(/(\d+)m/);

  let total = 0;
  if (hours) total += parseInt(hours[1]) * 60;
  if (minutes) total += parseInt(minutes[1]);

  return total || 999;
}

/**
 * Get random suggestions from the top pool (for "spin" feature)
 *
 * @param {Array} suggestions - Full list of suggestions
 * @param {number} count - Number to return
 * @param {Array} exclude - IDs to exclude
 * @returns {Array} Random subset
 */
export function getRandomSuggestions(suggestions, count = 3, exclude = []) {
  const pool = suggestions
    .filter(s => !exclude.includes(s.id))
    .slice(0, 10); // Top 10 pool

  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Get the top suggestions (for initial display)
 *
 * @param {Array} suggestions - Full list of suggestions
 * @param {number} count - Number to return
 * @param {Array} exclude - IDs to exclude
 * @returns {Array}
 */
export function getTopSuggestions(suggestions, count = 3, exclude = []) {
  return suggestions
    .filter(s => !exclude.includes(s.id))
    .slice(0, count);
}

