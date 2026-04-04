/**
 * Date Scorer
 *
 * Calculates date-specific scores for cities based on:
 * - Weather conditions (temperature, precipitation)
 * - Crowd levels
 * - Special events and holidays
 *
 * Data sources:
 * - /public/data/{Country}/{city}/{city}-visit-calendar.json (detailed daily scores)
 * - /public/data/{Country}/{city}/monthly/{month}.json (monthly experiences)
 */

import citiesData from '@/generated/cities.json';

// Build a lookup for city ID -> country
const cityToCountry = {};
for (const city of citiesData) {
  cityToCountry[city.id] = city.country;
}

// Month name mapping
const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
];

// Cache for loaded data
const dataCache = new Map();

/**
 * Load visit calendar data for a city
 */
async function loadVisitCalendar(cityId) {
  const cacheKey = `calendar:${cityId}`;
  if (dataCache.has(cacheKey)) {
    return dataCache.get(cacheKey);
  }

  const country = cityToCountry[cityId];
  if (!country) {
    console.warn(`[dateScorer] Unknown city: ${cityId}`);
    return null;
  }

  try {
    const response = await fetch(`/data/${country}/${cityId}/${cityId}-visit-calendar.json`);
    if (!response.ok) return null;
    const data = await response.json();
    dataCache.set(cacheKey, data);
    return data;
  } catch (error) {
    console.warn(`[dateScorer] Failed to load calendar for ${cityId}:`, error.message);
    return null;
  }
}

/**
 * Load monthly data for a city
 */
async function loadMonthlyData(cityId, monthName) {
  const cacheKey = `monthly:${cityId}:${monthName}`;
  if (dataCache.has(cacheKey)) {
    return dataCache.get(cacheKey);
  }

  const country = cityToCountry[cityId];
  if (!country) return null;

  try {
    const response = await fetch(`/data/${country}/${cityId}/monthly/${monthName}.json`);
    if (!response.ok) return null;
    const data = await response.json();
    dataCache.set(cacheKey, data);
    return data;
  } catch (error) {
    return null;
  }
}

/**
 * Parse ISO date string to components
 */
function parseDateComponents(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number);
  return { year, month, day };
}

/**
 * Get the month index (0-11) from an ISO date
 */
function getMonthIndex(isoDate) {
  return parseDateComponents(isoDate).month - 1;
}

/**
 * Get day ranges from visit calendar for a specific month and date range
 */
function getRelevantRanges(calendarMonth, startDay, endDay) {
  if (!calendarMonth?.ranges) return [];

  return calendarMonth.ranges.filter(range => {
    if (!range.days) return false;
    return range.days.some(day => day >= startDay && day <= endDay);
  });
}

/**
 * Calculate weather score and description
 */
function calculateWeatherScore(weatherDetails, monthData) {
  if (!weatherDetails) return { score: 50, description: 'No data', icon: '?' };

  const { highC, lowC, avgC, rainfallMm, sunshineHours } = weatherDetails;

  // Ideal temp range is 15-25°C
  let tempScore = 100;
  if (avgC < 5) tempScore = 30;
  else if (avgC < 10) tempScore = 50;
  else if (avgC < 15) tempScore = 70;
  else if (avgC >= 15 && avgC <= 25) tempScore = 100;
  else if (avgC > 25 && avgC <= 30) tempScore = 80;
  else if (avgC > 30) tempScore = 60;

  // Rainfall penalty (lower is better)
  let rainScore = 100;
  if (rainfallMm > 100) rainScore = 40;
  else if (rainfallMm > 75) rainScore = 60;
  else if (rainfallMm > 50) rainScore = 80;

  // Sunshine bonus
  let sunScore = 50;
  if (sunshineHours >= 8) sunScore = 100;
  else if (sunshineHours >= 6) sunScore = 80;
  else if (sunshineHours >= 4) sunScore = 60;

  const score = Math.round((tempScore * 0.5) + (rainScore * 0.3) + (sunScore * 0.2));

  // Weather icon
  let icon = '☀️';
  if (avgC < 5) icon = '❄️';
  else if (avgC < 15 && rainfallMm > 60) icon = '🌧️';
  else if (avgC < 15) icon = '🌤️';
  else if (avgC > 28) icon = '🔥';
  else if (rainfallMm > 80) icon = '🌧️';
  else if (sunshineHours < 4) icon = '☁️';

  // Temperature description
  const tempRange = highC && lowC ? `${lowC}-${highC}°C` : `${avgC}°C`;

  // Rating text
  let rating = 'Good';
  if (score >= 85) rating = 'Excellent';
  else if (score >= 70) rating = 'Very Good';
  else if (score < 50) rating = 'Challenging';
  else if (score < 60) rating = 'Fair';

  return {
    score,
    temp: tempRange,
    avgTemp: avgC,
    rainfall: rainfallMm,
    sunshine: sunshineHours,
    rating,
    icon,
  };
}

/**
 * Calculate crowd score and description
 */
function calculateCrowdScore(calendarMonth, ranges) {
  // Get tourism level from month (1-10 scale)
  const tourismLevel = calendarMonth?.tourismLevel || 5;

  // Get crowd levels from relevant ranges
  const crowdLevels = ranges
    .map(r => r.crowdLevel)
    .filter(Boolean);

  const levelMap = {
    'Very Low': 95,
    'Low': 85,
    'Low-Moderate': 70,
    'Moderate': 60,
    'Moderate-High': 45,
    'High': 30,
    'Very High': 15,
    'Extremely High': 5,
  };

  let avgCrowdScore = 60; // default
  if (crowdLevels.length > 0) {
    const scores = crowdLevels.map(level => levelMap[level] || 50);
    avgCrowdScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }

  // Adjust for tourism level
  const tourismAdjustment = (5 - tourismLevel) * 3;
  const finalScore = Math.max(0, Math.min(100, avgCrowdScore + tourismAdjustment));

  // Determine level label
  let level = 'Moderate';
  if (finalScore >= 80) level = 'Very Low';
  else if (finalScore >= 65) level = 'Low';
  else if (finalScore >= 50) level = 'Moderate';
  else if (finalScore >= 35) level = 'High';
  else level = 'Very High';

  return {
    score: finalScore,
    level,
    tourismLevel,
  };
}

/**
 * Extract events from ranges that fall within the date range
 */
function extractEvents(ranges, monthlyData, monthName) {
  const events = [];

  // From visit calendar ranges
  for (const range of ranges) {
    if (range.special && range.event) {
      events.push({
        name: range.event,
        date: range.days?.length === 1 ? `Day ${range.days[0]}` : undefined,
        description: range.notes,
        highlight: true,
      });
    }
    if (range.events_holidays) {
      for (const event of range.events_holidays) {
        events.push({
          name: event.name,
          date: event.date,
          description: event.description,
        });
      }
    }
  }

  // From monthly data
  if (monthlyData) {
    const monthKey = monthName.charAt(0).toUpperCase() + monthName.slice(1);
    const data = monthlyData[monthKey];

    if (data?.first_half?.events_holidays) {
      for (const event of data.first_half.events_holidays) {
        if (!events.find(e => e.name === event.name)) {
          events.push({
            name: event.name,
            date: event.date,
            description: event.description,
          });
        }
      }
    }
    if (data?.second_half?.events_holidays) {
      for (const event of data.second_half.events_holidays) {
        if (!events.find(e => e.name === event.name)) {
          events.push({
            name: event.name,
            date: event.date,
            description: event.description,
          });
        }
      }
    }
  }

  return events.slice(0, 3); // Max 3 events
}

/**
 * Generate why-visit reasons for specific dates
 */
function generateDateReasons(weather, crowds, events, ranges) {
  const reasons = [];

  // Weather-based reasons
  if (weather.score >= 80) {
    reasons.push(`Perfect weather (${weather.temp})`);
  } else if (weather.score >= 65) {
    reasons.push(`Pleasant ${weather.avgTemp}°C average`);
  } else if (weather.avgTemp && weather.avgTemp < 10) {
    reasons.push(`Cool weather - great for museums`);
  }

  // Crowd-based reasons
  if (crowds.level === 'Very Low' || crowds.level === 'Low') {
    reasons.push(`${crowds.level} tourist crowds`);
  } else if (crowds.score < 40) {
    reasons.push(`Popular period - book ahead`);
  }

  // Event-based reasons
  if (events.length > 0) {
    const topEvent = events[0];
    if (topEvent.date) {
      reasons.push(`${topEvent.name} (${topEvent.date})`);
    } else {
      reasons.push(topEvent.name);
    }
  }

  // Range-based reasons
  for (const range of ranges) {
    if (range.priceLevel === 'Low' || range.price?.toLowerCase().includes('lower')) {
      reasons.push('Lower prices');
      break;
    }
  }

  return reasons.slice(0, 4);
}

/**
 * Get date-specific score for a city
 *
 * @param {string} cityId - The city ID
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<Object>} Date score object
 */
export async function getDateScore(cityId, startDate, endDate) {
  const startComponents = parseDateComponents(startDate);
  const endComponents = parseDateComponents(endDate);

  const monthIndex = startComponents.month - 1;
  const monthName = MONTH_NAMES[monthIndex];

  // Load data
  const [calendar, monthlyData] = await Promise.all([
    loadVisitCalendar(cityId),
    loadMonthlyData(cityId, monthName),
  ]);

  // If we span multiple months, we'll use the first month's data primarily
  const calendarMonth = calendar?.months?.[monthName];
  const weatherDetails = calendarMonth?.weatherDetails;

  // Get relevant day ranges
  const ranges = calendarMonth
    ? getRelevantRanges(calendarMonth, startComponents.day, endComponents.day)
    : [];

  // Calculate scores
  const weather = calculateWeatherScore(weatherDetails, calendarMonth);
  const crowds = calculateCrowdScore(calendarMonth, ranges);
  const events = extractEvents(ranges, monthlyData, monthName);

  // Calculate overall score (weighted average)
  const overallScore = Math.round(
    (weather.score * 0.4) +
    (crowds.score * 0.35) +
    (events.length > 0 ? 80 : 50) * 0.25
  );

  // Generate date-specific reasons
  const dateReasons = generateDateReasons(weather, crowds, events, ranges);

  return {
    cityId,
    startDate,
    endDate,
    overall: overallScore,
    weather: {
      score: weather.score,
      temp: weather.temp,
      rating: weather.rating,
      icon: weather.icon,
    },
    crowds: {
      score: crowds.score,
      level: crowds.level,
    },
    events,
    dateReasons,
    hasData: !!(calendar || monthlyData),
  };
}

/**
 * Batch load date scores for multiple cities
 *
 * @param {Array<{cityId: string, startDate: string, endDate: string}>} requests
 * @returns {Promise<Map<string, Object>>} Map of cityId -> dateScore
 */
export async function batchGetDateScores(requests) {
  const results = new Map();

  // Process in parallel with a concurrency limit
  const batchSize = 5;
  for (let i = 0; i < requests.length; i += batchSize) {
    const batch = requests.slice(i, i + batchSize);
    const scores = await Promise.all(
      batch.map(req => getDateScore(req.cityId, req.startDate, req.endDate))
    );

    for (const score of scores) {
      results.set(score.cityId, score);
    }
  }

  return results;
}

/**
 * Get a simple date score summary for UI display
 *
 * @param {Object} dateScore - Full date score object
 * @returns {Object} Simplified score for badges
 */
export function getScoreBadges(dateScore) {
  if (!dateScore) {
    return {
      weather: { icon: '?', label: 'No data', color: 'gray' },
      crowds: { icon: '👥', label: 'Unknown', color: 'gray' },
      events: null,
    };
  }

  const { weather, crowds, events } = dateScore;

  // Determine colors based on scores
  const getColor = (score) => {
    if (score >= 75) return 'green';
    if (score >= 50) return 'amber';
    return 'red';
  };

  return {
    weather: {
      icon: weather.icon,
      label: weather.temp,
      sublabel: weather.rating,
      color: getColor(weather.score),
    },
    crowds: {
      icon: '👥',
      label: crowds.level,
      color: getColor(crowds.score),
    },
    events: events.length > 0 ? {
      icon: '🎭',
      label: `${events.length} event${events.length > 1 ? 's' : ''}`,
      name: events[0]?.name,
      color: 'blue',
    } : null,
  };
}
