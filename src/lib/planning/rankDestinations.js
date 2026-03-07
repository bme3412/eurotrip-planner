/**
 * Rank Destinations Utility
 *
 * Ranks destination cities from an origin with trip-style-aware scoring.
 * Returns candidates with bestTrip, fastest, and cheapest metrics.
 */

import { calculateEaseScores } from './easeScoreCalculator';

const COUNTRY_FLAGS = {
  'Spain': '🇪🇸', 'France': '🇫🇷', 'Italy': '🇮🇹', 'Germany': '🇩🇪',
  'UK': '🇬🇧', 'Netherlands': '🇳🇱', 'Belgium': '🇧🇪', 'Portugal': '🇵🇹',
  'Austria': '🇦🇹', 'Switzerland': '🇨🇭', 'Czechia': '🇨🇿', 'Poland': '🇵🇱',
  'Croatia': '🇭🇷', 'Greece': '🇬🇷', 'Hungary': '🇭🇺', 'Ireland': '🇮🇪',
  'Denmark': '🇩🇰', 'Sweden': '🇸🇪', 'Norway': '🇳🇴', 'Finland': '🇫🇮',
  'Slovenia': '🇸🇮', 'Slovakia': '🇸🇰', 'Romania': '🇷🇴', 'Bulgaria': '🇧🇬',
  'Serbia': '🇷🇸', 'Estonia': '🇪🇪', 'Latvia': '🇱🇻', 'Lithuania': '🇱🇹',
  'Iceland': '🇮🇸', 'Malta': '🇲🇹', 'Monaco': '🇲🇨', 'Luxembourg': '🇱🇺',
  'Montenegro': '🇲🇪', 'Albania': '🇦🇱', 'North-Macedonia': '🇲🇰',
  'Bosnia-and-Herzegovina': '🇧🇦', 'Cyprus': '🇨🇾', 'San-Marino': '🇸🇲',
};

const TRANSPORT_ICONS = {
  train: '🚂',
  flight: '✈️',
  bus: '🚌',
  ferry: '⛴️',
  unknown: '🚗',
};

// Cities with family-friendly reputation
const FAMILY_FRIENDLY_CITIES = new Set([
  'amsterdam', 'barcelona', 'copenhagen', 'lisbon', 'vienna',
  'munich', 'salzburg', 'bruges', 'edinburgh', 'dublin',
  'lucerne', 'zurich', 'prague', 'berlin', 'london',
]);

// Cities with romantic reputation
const ROMANTIC_CITIES = new Set([
  'paris', 'venice', 'florence', 'rome', 'santorini',
  'dubrovnik', 'prague', 'bruges', 'vienna', 'lisbon',
  'barcelona', 'seville', 'cinque-terre', 'amalfi', 'verona',
]);

// Well-connected hub cities (good for solo travelers)
const HUB_CITIES = new Set([
  'paris', 'london', 'amsterdam', 'berlin', 'munich',
  'zurich', 'milan', 'rome', 'barcelona', 'madrid',
  'brussels', 'frankfurt', 'vienna', 'prague', 'budapest',
]);

// Budget-friendly destinations
const BUDGET_FRIENDLY_CITIES = new Set([
  'prague', 'budapest', 'krakow', 'warsaw', 'lisbon',
  'porto', 'sofia', 'bucharest', 'belgrade', 'ljubljana',
  'tallinn', 'riga', 'vilnius', 'bratislava', 'split',
]);

// Luxury destinations
const LUXURY_CITIES = new Set([
  'paris', 'monaco', 'zurich', 'geneva', 'milan',
  'florence', 'venice', 'santorini', 'mykonos', 'dubrovnik',
  'vienna', 'salzburg', 'lucerne', 'st-moritz', 'nice',
]);

/**
 * Parse journey time string to hours (float)
 */
function parseTimeToHours(timeStr) {
  if (!timeStr || timeStr === 'N/A') return 99;

  const hours = timeStr.match(/(\d+)h/);
  const minutes = timeStr.match(/(\d+)m/);

  let totalMinutes = 0;
  if (hours) totalMinutes += parseInt(hours[1]) * 60;
  if (minutes) totalMinutes += parseInt(minutes[1]);

  return totalMinutes > 0 ? Math.round(totalMinutes / 60 * 100) / 100 : 99;
}

/**
 * Parse price string to EUR integer
 */
function parsePriceToEur(priceStr) {
  if (!priceStr || priceStr === 'N/A') return 100;

  // Handle GBP conversion
  const isGBP = priceStr.includes('£');
  const gbpRate = 1.15;

  const range = priceStr.match(/[€£]?(\d+)\s*[-–]\s*(\d+)/);
  if (range) {
    const avg = (parseInt(range[1]) + parseInt(range[2])) / 2;
    return Math.round(isGBP ? avg * gbpRate : avg);
  }

  const single = priceStr.match(/[€£]?(\d+)/);
  if (single) {
    const val = parseInt(single[1]);
    return Math.round(isGBP ? val * gbpRate : val);
  }

  return 100;
}

/**
 * Get trip style modifier for a city
 */
function getTripStyleModifier(cityId, tripStyle, priceEur, allPrices) {
  let modifier = 0;

  // Calculate price terciles
  const sortedPrices = [...allPrices].sort((a, b) => a - b);
  const cheapThreshold = sortedPrices[Math.floor(sortedPrices.length / 3)] || 50;
  const expensiveThreshold = sortedPrices[Math.floor(sortedPrices.length * 2 / 3)] || 100;

  switch (tripStyle) {
    case 'budget':
      if (BUDGET_FRIENDLY_CITIES.has(cityId)) modifier += 15;
      if (priceEur <= cheapThreshold) modifier += 20;
      else if (priceEur >= expensiveThreshold) modifier -= 10;
      break;

    case 'luxury':
      if (LUXURY_CITIES.has(cityId)) modifier += 15;
      if (priceEur >= expensiveThreshold) modifier += 10; // Luxury travelers don't mind cost
      break;

    case 'families':
      if (FAMILY_FRIENDLY_CITIES.has(cityId)) modifier += 15;
      break;

    case 'couples':
      if (ROMANTIC_CITIES.has(cityId)) modifier += 15;
      break;

    case 'solo':
      if (HUB_CITIES.has(cityId)) modifier += 10;
      break;

    case 'everyone':
    default:
      // No special modifiers for "everyone"
      break;
  }

  return modifier;
}

/**
 * Get transport name from type and connection data
 */
function getTransportName(transportType, allTransport) {
  if (transportType === 'train') {
    const train = allTransport.train;
    if (train?.trainType) return train.trainType;
    return 'Train';
  }
  if (transportType === 'flight') {
    return 'Flight';
  }
  if (transportType === 'bus') {
    return 'Bus';
  }
  if (transportType === 'ferry') {
    return 'Ferry';
  }
  return 'Unknown';
}

/**
 * Format time for display (e.g., "2h 15m")
 */
function formatTime(hours) {
  if (hours >= 99) return 'N/A';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Rank destinations from an origin city with trip style awareness
 *
 * @param {string} fromCityId - Origin city ID
 * @param {string} tripStyle - Trip style filter ('everyone', 'families', 'couples', 'solo', 'budget', 'luxury')
 * @param {string[]} excludeIds - City IDs to exclude from results
 * @param {number} limit - Maximum number of results (default 8)
 * @returns {Promise<Array>} Ranked destination candidates
 */
export async function rankDestinations(fromCityId, tripStyle = 'everyone', excludeIds = [], limit = 8) {
  // Get base ease scores from existing calculator
  const allDestinations = await calculateEaseScores(fromCityId);

  // Filter out excluded cities
  const filtered = allDestinations.filter(d => !excludeIds.includes(d.id));

  if (filtered.length === 0) {
    return [];
  }

  // Calculate price for all destinations for tercile calculation
  const allPrices = filtered.map(d => parsePriceToEur(d.transportPrice));

  // Enrich with additional metrics
  const enriched = filtered.map(dest => {
    const fastestHours = parseTimeToHours(dest.transportTime);
    const cheapestEur = parsePriceToEur(dest.transportPrice);

    // Base bestTrip score: normalize easeScore (0-10) to 0-100
    const baseScore = (dest.easeScore / 10) * 100;

    // Apply trip style modifier
    const modifier = getTripStyleModifier(dest.id, tripStyle, cheapestEur, allPrices);

    // Calculate final bestTrip score (capped at 100)
    const bestTrip = Math.min(100, Math.max(0, Math.round(baseScore + modifier)));

    return {
      city: {
        id: dest.id,
        name: dest.name,
        country: dest.country,
        flag: COUNTRY_FLAGS[dest.country] || '🏳️',
        latitude: dest.latitude,
        longitude: dest.longitude,
      },
      bestTrip,
      fastestHours,
      fastestFormatted: formatTime(fastestHours),
      cheapestEur,
      transportMode: dest.transportType,
      transportIcon: TRANSPORT_ICONS[dest.transportType] || TRANSPORT_ICONS.unknown,
      transportName: getTransportName(dest.transportType, dest.allTransport),
      frequency: dest.transportFrequency || 'Multiple daily',
      // Keep raw data for potential use
      _raw: {
        easeScore: dest.easeScore,
        allTransport: dest.allTransport,
        whyGo: dest.whyGo,
        highlights: dest.highlights,
      },
    };
  });

  // Sort by bestTrip score (descending)
  enriched.sort((a, b) => b.bestTrip - a.bestTrip);

  // Calculate category leaders for highlighting
  const result = enriched.slice(0, limit);

  if (result.length > 0) {
    // Find fastest
    const fastestIdx = result.reduce((minIdx, curr, idx, arr) =>
      curr.fastestHours < arr[minIdx].fastestHours ? idx : minIdx, 0);
    result[fastestIdx].isFastest = true;

    // Find cheapest
    const cheapestIdx = result.reduce((minIdx, curr, idx, arr) =>
      curr.cheapestEur < arr[minIdx].cheapestEur ? idx : minIdx, 0);
    result[cheapestIdx].isCheapest = true;

    // Best trip is always first (already sorted)
    result[0].isBestTrip = true;
  }

  return result;
}

/**
 * Get a specific destination's transport details
 * Used when committing a stop to get full transport info
 */
export async function getTransportDetails(fromCityId, toCityId) {
  const destinations = await calculateEaseScores(fromCityId);
  const dest = destinations.find(d => d.id === toCityId);

  if (!dest) {
    return null;
  }

  return {
    mode: dest.transportType,
    durationHours: parseTimeToHours(dest.transportTime),
    durationFormatted: formatTime(parseTimeToHours(dest.transportTime)),
    costEur: parsePriceToEur(dest.transportPrice),
    frequency: dest.transportFrequency || 'Multiple daily',
    icon: TRANSPORT_ICONS[dest.transportType] || TRANSPORT_ICONS.unknown,
    name: getTransportName(dest.transportType, dest.allTransport),
  };
}

export { COUNTRY_FLAGS, TRANSPORT_ICONS };
