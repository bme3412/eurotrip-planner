/**
 * Mock Data Generators for City Enrichment
 *
 * Generates realistic weather, events, and crowd data based on:
 * - City latitude (climate zone)
 * - Month/season
 * - Known patterns
 *
 * This allows testing the scoring system without API costs.
 * Replace with real API calls when ready.
 */

// ── Climate Zones by Latitude ────────────────────────────────────────

function getClimateZone(latitude) {
  const absLat = Math.abs(latitude);
  if (absLat >= 60) return 'subarctic';      // Scandinavia, Iceland
  if (absLat >= 50) return 'continental';    // UK, Germany, Poland
  if (absLat >= 43) return 'temperate';      // France, Northern Italy
  return 'mediterranean';                     // Spain, Southern Italy, Greece
}

// ── Weather Generator ────────────────────────────────────────────────

const CLIMATE_PATTERNS = {
  subarctic: {
    // Month -> { avgHigh, avgLow, rainMm, sunshineHours, goodWeatherChance }
    1: { avgHigh: -2, avgLow: -10, rainMm: 40, sunshineHours: 1, goodWeatherChance: 0.3 },
    2: { avgHigh: -1, avgLow: -9, rainMm: 35, sunshineHours: 3, goodWeatherChance: 0.35 },
    3: { avgHigh: 3, avgLow: -5, rainMm: 35, sunshineHours: 5, goodWeatherChance: 0.4 },
    4: { avgHigh: 9, avgLow: 1, rainMm: 40, sunshineHours: 7, goodWeatherChance: 0.5 },
    5: { avgHigh: 15, avgLow: 6, rainMm: 45, sunshineHours: 9, goodWeatherChance: 0.55 },
    6: { avgHigh: 19, avgLow: 11, rainMm: 55, sunshineHours: 10, goodWeatherChance: 0.6 },
    7: { avgHigh: 22, avgLow: 14, rainMm: 70, sunshineHours: 9, goodWeatherChance: 0.6 },
    8: { avgHigh: 20, avgLow: 13, rainMm: 75, sunshineHours: 7, goodWeatherChance: 0.55 },
    9: { avgHigh: 14, avgLow: 8, rainMm: 65, sunshineHours: 5, goodWeatherChance: 0.45 },
    10: { avgHigh: 8, avgLow: 3, rainMm: 60, sunshineHours: 3, goodWeatherChance: 0.35 },
    11: { avgHigh: 3, avgLow: -2, rainMm: 55, sunshineHours: 2, goodWeatherChance: 0.3 },
    12: { avgHigh: 0, avgLow: -7, rainMm: 45, sunshineHours: 1, goodWeatherChance: 0.25 },
  },
  continental: {
    1: { avgHigh: 4, avgLow: -1, rainMm: 55, sunshineHours: 2, goodWeatherChance: 0.4 },
    2: { avgHigh: 6, avgLow: 0, rainMm: 45, sunshineHours: 3, goodWeatherChance: 0.45 },
    3: { avgHigh: 10, avgLow: 3, rainMm: 50, sunshineHours: 4, goodWeatherChance: 0.5 },
    4: { avgHigh: 15, avgLow: 6, rainMm: 50, sunshineHours: 6, goodWeatherChance: 0.55 },
    5: { avgHigh: 19, avgLow: 10, rainMm: 60, sunshineHours: 7, goodWeatherChance: 0.6 },
    6: { avgHigh: 22, avgLow: 13, rainMm: 65, sunshineHours: 8, goodWeatherChance: 0.65 },
    7: { avgHigh: 25, avgLow: 15, rainMm: 70, sunshineHours: 8, goodWeatherChance: 0.7 },
    8: { avgHigh: 24, avgLow: 15, rainMm: 65, sunshineHours: 7, goodWeatherChance: 0.7 },
    9: { avgHigh: 20, avgLow: 11, rainMm: 55, sunshineHours: 6, goodWeatherChance: 0.65 },
    10: { avgHigh: 14, avgLow: 7, rainMm: 55, sunshineHours: 4, goodWeatherChance: 0.5 },
    11: { avgHigh: 8, avgLow: 3, rainMm: 55, sunshineHours: 2, goodWeatherChance: 0.4 },
    12: { avgHigh: 5, avgLow: 0, rainMm: 55, sunshineHours: 2, goodWeatherChance: 0.35 },
  },
  temperate: {
    1: { avgHigh: 7, avgLow: 2, rainMm: 50, sunshineHours: 3, goodWeatherChance: 0.45 },
    2: { avgHigh: 9, avgLow: 3, rainMm: 45, sunshineHours: 4, goodWeatherChance: 0.5 },
    3: { avgHigh: 13, avgLow: 5, rainMm: 50, sunshineHours: 5, goodWeatherChance: 0.55 },
    4: { avgHigh: 17, avgLow: 8, rainMm: 55, sunshineHours: 6, goodWeatherChance: 0.6 },
    5: { avgHigh: 21, avgLow: 12, rainMm: 60, sunshineHours: 7, goodWeatherChance: 0.65 },
    6: { avgHigh: 25, avgLow: 15, rainMm: 55, sunshineHours: 9, goodWeatherChance: 0.75 },
    7: { avgHigh: 28, avgLow: 18, rainMm: 45, sunshineHours: 10, goodWeatherChance: 0.8 },
    8: { avgHigh: 27, avgLow: 17, rainMm: 50, sunshineHours: 9, goodWeatherChance: 0.8 },
    9: { avgHigh: 23, avgLow: 14, rainMm: 55, sunshineHours: 7, goodWeatherChance: 0.7 },
    10: { avgHigh: 17, avgLow: 10, rainMm: 60, sunshineHours: 5, goodWeatherChance: 0.55 },
    11: { avgHigh: 11, avgLow: 5, rainMm: 60, sunshineHours: 3, goodWeatherChance: 0.45 },
    12: { avgHigh: 8, avgLow: 3, rainMm: 55, sunshineHours: 2, goodWeatherChance: 0.4 },
  },
  mediterranean: {
    1: { avgHigh: 12, avgLow: 5, rainMm: 60, sunshineHours: 5, goodWeatherChance: 0.55 },
    2: { avgHigh: 14, avgLow: 6, rainMm: 50, sunshineHours: 6, goodWeatherChance: 0.6 },
    3: { avgHigh: 17, avgLow: 8, rainMm: 45, sunshineHours: 7, goodWeatherChance: 0.65 },
    4: { avgHigh: 20, avgLow: 11, rainMm: 40, sunshineHours: 8, goodWeatherChance: 0.7 },
    5: { avgHigh: 25, avgLow: 15, rainMm: 30, sunshineHours: 9, goodWeatherChance: 0.8 },
    6: { avgHigh: 30, avgLow: 19, rainMm: 15, sunshineHours: 11, goodWeatherChance: 0.9 },
    7: { avgHigh: 33, avgLow: 22, rainMm: 5, sunshineHours: 12, goodWeatherChance: 0.95 },
    8: { avgHigh: 33, avgLow: 22, rainMm: 10, sunshineHours: 11, goodWeatherChance: 0.95 },
    9: { avgHigh: 28, avgLow: 19, rainMm: 35, sunshineHours: 9, goodWeatherChance: 0.8 },
    10: { avgHigh: 22, avgLow: 14, rainMm: 60, sunshineHours: 6, goodWeatherChance: 0.65 },
    11: { avgHigh: 16, avgLow: 9, rainMm: 70, sunshineHours: 5, goodWeatherChance: 0.55 },
    12: { avgHigh: 13, avgLow: 6, rainMm: 65, sunshineHours: 4, goodWeatherChance: 0.5 },
  },
};

const WEATHER_CONDITIONS = [
  { code: 0, name: 'Clear sky', isGood: true },
  { code: 1, name: 'Mainly clear', isGood: true },
  { code: 2, name: 'Partly cloudy', isGood: true },
  { code: 3, name: 'Overcast', isGood: false },
  { code: 61, name: 'Light rain', isGood: false },
  { code: 63, name: 'Moderate rain', isGood: false },
  { code: 80, name: 'Rain showers', isGood: false },
];

/**
 * Generate realistic weather data for a city and date range.
 */
export function generateMockWeather(latitude, longitude, startDate, endDate) {
  const climate = getClimateZone(latitude);
  const patterns = CLIMATE_PATTERNS[climate];

  const start = new Date(startDate);
  const end = new Date(endDate);
  const numDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

  // Get average pattern for the month(s) in the date range
  const months = new Set();
  const current = new Date(start);
  while (current <= end) {
    months.add(current.getMonth() + 1);
    current.setDate(current.getDate() + 1);
  }

  // Average the patterns for covered months
  let avgPattern = { avgHigh: 0, avgLow: 0, rainMm: 0, sunshineHours: 0, goodWeatherChance: 0 };
  for (const month of months) {
    const p = patterns[month];
    avgPattern.avgHigh += p.avgHigh / months.size;
    avgPattern.avgLow += p.avgLow / months.size;
    avgPattern.rainMm += p.rainMm / months.size;
    avgPattern.sunshineHours += p.sunshineHours / months.size;
    avgPattern.goodWeatherChance += p.goodWeatherChance / months.size;
  }

  // Add some randomness (±15%)
  const variance = () => 0.85 + Math.random() * 0.3;
  const avgTemp = (avgPattern.avgHigh + avgPattern.avgLow) / 2;

  // Generate daily data
  const daily = [];
  const dailyCurrent = new Date(start);
  let goodDays = 0;

  for (let i = 0; i < numDays; i++) {
    const isGoodWeather = Math.random() < avgPattern.goodWeatherChance;
    if (isGoodWeather) goodDays++;

    const condition = isGoodWeather
      ? WEATHER_CONDITIONS.filter(c => c.isGood)[Math.floor(Math.random() * 3)]
      : WEATHER_CONDITIONS.filter(c => !c.isGood)[Math.floor(Math.random() * 4)];

    daily.push({
      date: dailyCurrent.toISOString().split('T')[0],
      tempHigh: Math.round(avgPattern.avgHigh * variance()),
      tempLow: Math.round(avgPattern.avgLow * variance()),
      precipitationMm: isGoodWeather ? 0 : Math.round(Math.random() * 10),
      sunshineHours: Math.round(avgPattern.sunshineHours * (isGoodWeather ? 1.1 : 0.5)),
      condition: condition.name,
      conditionCode: condition.code,
      isGoodWeather,
    });

    dailyCurrent.setDate(dailyCurrent.getDate() + 1);
  }

  return {
    avgTemp: Math.round(avgTemp * 10) / 10,
    avgTempHigh: Math.round(avgPattern.avgHigh),
    avgTempLow: Math.round(avgPattern.avgLow),
    highTemp: Math.max(...daily.map(d => d.tempHigh)),
    lowTemp: Math.min(...daily.map(d => d.tempLow)),
    totalPrecipitationMm: daily.reduce((sum, d) => sum + d.precipitationMm, 0),
    totalSunshineHours: daily.reduce((sum, d) => sum + d.sunshineHours, 0),
    avgSunshineHoursPerDay: Math.round(avgPattern.sunshineHours * 10) / 10,
    goodWeatherDays: goodDays,
    goodWeatherRatio: Math.round((goodDays / numDays) * 100) / 100,
    dominantCondition: goodDays > numDays / 2 ? 'Mainly clear' : 'Mixed conditions',
    numDays,
    confidence: 0.85, // Mock data has good confidence
    climate,
    daily,
    source: 'mock',
  };
}

// ── Events Generator ─────────────────────────────────────────────────

const EUROPEAN_EVENTS = [
  // Major festivals
  { name: 'Carnival', months: [2], countries: ['Italy', 'Germany', 'Belgium'], significance: 'major' },
  { name: 'Easter Celebrations', months: [3, 4], countries: ['Spain', 'Italy', 'Greece', 'Poland'], significance: 'major' },
  { name: 'King\'s Day', months: [4], countries: ['Netherlands'], cities: ['amsterdam'], significance: 'major' },
  { name: 'Feria de Abril', months: [4], countries: ['Spain'], cities: ['seville'], significance: 'major' },
  { name: 'Cannes Film Festival', months: [5], countries: ['France'], cities: ['cannes', 'nice'], significance: 'major' },
  { name: 'San Fermín (Running of Bulls)', months: [7], countries: ['Spain'], cities: ['pamplona'], significance: 'major' },
  { name: 'Bastille Day', months: [7], countries: ['France'], significance: 'notable' },
  { name: 'Edinburgh Fringe Festival', months: [8], countries: ['UK'], cities: ['edinburgh'], significance: 'major' },
  { name: 'La Tomatina', months: [8], countries: ['Spain'], cities: ['valencia'], significance: 'notable' },
  { name: 'Venice Film Festival', months: [9], countries: ['Italy'], cities: ['venice'], significance: 'major' },
  { name: 'Oktoberfest', months: [9, 10], countries: ['Germany'], cities: ['munich'], significance: 'major' },
  { name: 'Christmas Markets', months: [11, 12], countries: ['Germany', 'Austria', 'France', 'Czechia', 'Belgium'], significance: 'major' },
  { name: 'New Year Celebrations', months: [12, 1], countries: ['all'], significance: 'notable' },

  // Cultural events
  { name: 'Fashion Week', months: [2, 3, 9, 10], countries: ['France', 'Italy', 'UK'], cities: ['paris', 'milan', 'london'], significance: 'notable' },
  { name: 'Design Week', months: [4], countries: ['Italy', 'Netherlands'], cities: ['milan', 'eindhoven'], significance: 'notable' },
  { name: 'Music Festival Season', months: [6, 7, 8], countries: ['all'], significance: 'notable' },

  // Seasonal
  { name: 'Tulip Season', months: [4, 5], countries: ['Netherlands'], significance: 'notable' },
  { name: 'Cherry Blossom Season', months: [3, 4], countries: ['Germany', 'France'], cities: ['bonn', 'paris'], significance: 'minor' },
  { name: 'Wine Harvest Season', months: [9, 10], countries: ['France', 'Italy', 'Spain', 'Portugal', 'Germany'], significance: 'notable' },
  { name: 'Northern Lights Season', months: [10, 11, 12, 1, 2, 3], countries: ['Norway', 'Finland', 'Iceland', 'Sweden'], significance: 'major' },
];

/**
 * Generate events for a city based on its location and date range.
 */
export function generateMockEvents(citySlug, country, startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Get months in the date range
  const months = new Set();
  const current = new Date(start);
  while (current <= end) {
    months.add(current.getMonth() + 1);
    current.setDate(current.getDate() + 1);
  }

  const events = [];

  for (const event of EUROPEAN_EVENTS) {
    // Check if event happens during trip dates
    const monthMatch = event.months.some(m => months.has(m));
    if (!monthMatch) continue;

    // Check if event applies to this city/country
    const countryMatch = event.countries.includes('all') || event.countries.includes(country);
    const cityMatch = !event.cities || event.cities.includes(citySlug);

    if (countryMatch && cityMatch) {
      events.push({
        name: event.name,
        significance: event.significance,
        category: event.name.toLowerCase().includes('festival') ? 'festival'
          : event.name.toLowerCase().includes('market') ? 'market'
          : event.name.toLowerCase().includes('season') ? 'seasonal'
          : 'cultural',
      });
    }
  }

  return {
    events,
    count: events.length,
    hasMajorEvent: events.some(e => e.significance === 'major'),
    source: 'mock',
  };
}

// ── Crowd Level Generator ────────────────────────────────────────────

const CROWD_PATTERNS = {
  // Month -> base crowd level (0-5 scale)
  1: 1,   // January - Low
  2: 1.5, // February - Low-Moderate
  3: 2,   // March - Moderate
  4: 2.5, // April - Moderate (Easter bump)
  5: 3,   // May - Moderate-High
  6: 4,   // June - High
  7: 5,   // July - Very High (peak)
  8: 5,   // August - Very High (peak)
  9: 3,   // September - Moderate-High (shoulder)
  10: 2,  // October - Moderate
  11: 1.5, // November - Low-Moderate
  12: 3,  // December - Moderate-High (Christmas)
};

const CROWD_LABELS = ['Very Low', 'Low', 'Moderate', 'High', 'Very High', 'Extreme'];

/**
 * Generate crowd level estimate for a city and date range.
 */
export function generateMockCrowdLevel(citySlug, country, startDate, endDate, isPopularDestination = false) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Get average month pattern
  const months = [];
  const current = new Date(start);
  while (current <= end) {
    months.push(current.getMonth() + 1);
    current.setDate(current.getDate() + 1);
  }

  const avgPattern = months.reduce((sum, m) => sum + CROWD_PATTERNS[m], 0) / months.length;

  // Adjust for popular destinations
  let crowdLevel = avgPattern;
  if (isPopularDestination) {
    crowdLevel = Math.min(5, crowdLevel + 1);
  }

  // Popular cities list
  const veryPopular = ['paris', 'barcelona', 'rome', 'amsterdam', 'london', 'venice', 'prague', 'florence'];
  const popular = ['vienna', 'berlin', 'madrid', 'lisbon', 'dublin', 'brussels', 'munich', 'milan'];

  if (veryPopular.includes(citySlug)) {
    crowdLevel = Math.min(5, crowdLevel + 1);
  } else if (popular.includes(citySlug)) {
    crowdLevel = Math.min(5, crowdLevel + 0.5);
  }

  const levelIdx = Math.round(crowdLevel);

  return {
    level: CROWD_LABELS[Math.min(5, levelIdx)],
    levelIdx,
    rawScore: Math.round(crowdLevel * 10) / 10,
    isPeakSeason: months.some(m => [6, 7, 8].includes(m)),
    source: 'mock',
  };
}

// ── Pricing Generator ────────────────────────────────────────────────

const PRICE_TIERS = {
  budget: ['lisbon', 'porto', 'prague', 'budapest', 'krakow', 'warsaw', 'sofia', 'bucharest', 'athens', 'belgrade'],
  moderate: ['berlin', 'madrid', 'barcelona', 'dublin', 'brussels', 'vienna', 'munich', 'milan', 'rome', 'amsterdam'],
  expensive: ['paris', 'london', 'zurich', 'geneva', 'copenhagen', 'oslo', 'stockholm', 'reykjavik'],
};

/**
 * Generate price estimate for a city.
 */
export function generateMockPricing(citySlug, startDate, endDate) {
  const start = new Date(startDate);

  // Determine base price tier
  let tier = 'moderate';
  if (PRICE_TIERS.budget.includes(citySlug)) tier = 'budget';
  else if (PRICE_TIERS.expensive.includes(citySlug)) tier = 'expensive';

  const basePrices = {
    budget: { hotel: 60, flight: 80 },
    moderate: { hotel: 120, flight: 150 },
    expensive: { hotel: 200, flight: 250 },
  };

  // Seasonal multiplier
  const month = start.getMonth() + 1;
  const seasonalMultiplier = [6, 7, 8, 12].includes(month) ? 1.4 : [4, 5, 9, 10].includes(month) ? 1.1 : 0.9;

  const base = basePrices[tier];

  return {
    hotelPerNight: Math.round(base.hotel * seasonalMultiplier),
    flightEstimate: Math.round(base.flight * seasonalMultiplier),
    tier,
    seasonalMultiplier,
    affordabilityScore: tier === 'budget' ? 5 : tier === 'moderate' ? 3 : 1,
    source: 'mock',
  };
}
