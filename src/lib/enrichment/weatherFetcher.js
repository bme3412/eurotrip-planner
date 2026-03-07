/**
 * Weather fetcher using Open-Meteo API (free, no API key required).
 *
 * https://open-meteo.com/en/docs
 */

import { getCachedEnrichment, setCachedEnrichment } from './cache';

const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1/forecast';

function formatDate(date) {
  if (typeof date === 'string') return date;
  return date.toISOString().split('T')[0];
}

function daysBetween(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  return Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Fetch weather forecast from Open-Meteo API.
 */
async function fetchFromOpenMeteo(latitude, longitude, startDate, endDate) {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    start_date: formatDate(startDate),
    end_date: formatDate(endDate),
    daily: [
      'temperature_2m_max',
      'temperature_2m_min',
      'apparent_temperature_max',
      'apparent_temperature_min',
      'precipitation_sum',
      'precipitation_probability_max',
      'sunshine_duration',
      'uv_index_max',
      'weathercode',
    ].join(','),
    timezone: 'auto',
  });

  const response = await fetch(`${OPEN_METEO_BASE}?${params}`);

  if (!response.ok) {
    throw new Error(`Open-Meteo API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Convert Open-Meteo weather code to human-readable description.
 * https://open-meteo.com/en/docs#weathervariables
 */
function getWeatherDescription(code) {
  const codes = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    56: 'Light freezing drizzle',
    57: 'Dense freezing drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    66: 'Light freezing rain',
    67: 'Heavy freezing rain',
    71: 'Slight snow',
    73: 'Moderate snow',
    75: 'Heavy snow',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail',
  };
  return codes[code] || 'Unknown';
}

/**
 * Determine if weather code indicates good weather.
 */
function isGoodWeather(code) {
  return code <= 3; // Clear, mainly clear, partly cloudy, or overcast
}

/**
 * Transform Open-Meteo response to our schema.
 */
function transformWeatherData(raw, startDate, endDate) {
  const daily = raw.daily;
  const numDays = daily.time.length;

  // Calculate averages
  const avgTempHigh = daily.temperature_2m_max.reduce((a, b) => a + b, 0) / numDays;
  const avgTempLow = daily.temperature_2m_min.reduce((a, b) => a + b, 0) / numDays;
  const avgTemp = (avgTempHigh + avgTempLow) / 2;
  const totalPrecipitation = daily.precipitation_sum.reduce((a, b) => a + (b || 0), 0);
  const totalSunshineHours = daily.sunshine_duration.reduce((a, b) => a + (b || 0), 0) / 3600; // Convert seconds to hours
  const avgUvIndex = daily.uv_index_max.reduce((a, b) => a + (b || 0), 0) / numDays;

  // Count good weather days
  const goodWeatherDays = daily.weathercode.filter(isGoodWeather).length;

  // Calculate forecast reliability (more accurate for near-term)
  const daysAhead = daysBetween(new Date(), startDate);
  const confidence = daysAhead <= 3 ? 0.95 : daysAhead <= 7 ? 0.85 : daysAhead <= 14 ? 0.7 : 0.5;

  // Most common weather condition
  const codeCounts = {};
  daily.weathercode.forEach(code => {
    codeCounts[code] = (codeCounts[code] || 0) + 1;
  });
  const dominantCode = Object.entries(codeCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

  return {
    // Summary stats
    avgTemp: Math.round(avgTemp * 10) / 10,
    avgTempHigh: Math.round(avgTempHigh * 10) / 10,
    avgTempLow: Math.round(avgTempLow * 10) / 10,
    highTemp: Math.max(...daily.temperature_2m_max),
    lowTemp: Math.min(...daily.temperature_2m_min),
    totalPrecipitationMm: Math.round(totalPrecipitation * 10) / 10,
    totalSunshineHours: Math.round(totalSunshineHours * 10) / 10,
    avgSunshineHoursPerDay: Math.round((totalSunshineHours / numDays) * 10) / 10,
    avgUvIndex: Math.round(avgUvIndex * 10) / 10,
    goodWeatherDays,
    goodWeatherRatio: Math.round((goodWeatherDays / numDays) * 100) / 100,

    // Dominant condition
    dominantCondition: getWeatherDescription(Number(dominantCode)),
    dominantConditionCode: Number(dominantCode),

    // Metadata
    forecastDaysAhead: daysAhead,
    confidence,
    numDays,
    timezone: raw.timezone,

    // Daily breakdown for UI
    daily: daily.time.map((date, i) => ({
      date,
      tempHigh: daily.temperature_2m_max[i],
      tempLow: daily.temperature_2m_min[i],
      feelsLikeHigh: daily.apparent_temperature_max[i],
      feelsLikeLow: daily.apparent_temperature_min[i],
      precipitationMm: daily.precipitation_sum[i],
      precipitationProbability: daily.precipitation_probability_max[i],
      sunshineHours: Math.round((daily.sunshine_duration[i] || 0) / 360) / 10, // seconds to hours
      uvIndex: daily.uv_index_max[i],
      condition: getWeatherDescription(daily.weathercode[i]),
      conditionCode: daily.weathercode[i],
      isGoodWeather: isGoodWeather(daily.weathercode[i]),
    })),
  };
}

/**
 * Get weather data for a city and date range.
 * Uses cache if available, otherwise fetches from Open-Meteo.
 *
 * @param {string} citySlug - City identifier
 * @param {number} latitude - City latitude
 * @param {number} longitude - City longitude
 * @param {string|Date} startDate - Trip start date
 * @param {string|Date} endDate - Trip end date
 * @returns {Promise<Object>} Weather data with confidence score
 */
export async function getWeatherForCity(citySlug, latitude, longitude, startDate, endDate) {
  // Check cache first
  const cached = await getCachedEnrichment(citySlug, 'weather', startDate, endDate);
  if (cached?.data) {
    return {
      ...cached.data,
      source: cached.source,
      fetchedAt: cached.fetchedAt,
    };
  }

  // Fetch fresh data
  try {
    const raw = await fetchFromOpenMeteo(latitude, longitude, startDate, endDate);
    const transformed = transformWeatherData(raw, startDate, endDate);

    // Cache the result
    await setCachedEnrichment(
      citySlug,
      'weather',
      startDate,
      endDate,
      transformed,
      'open-meteo',
      transformed.confidence
    );

    return {
      ...transformed,
      source: 'api',
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Weather fetch failed for ${citySlug}:`, error);

    // Return null with error info - scorer will fall back to baseline
    return {
      error: error.message,
      source: 'error',
      confidence: 0,
    };
  }
}

/**
 * Batch fetch weather for multiple cities.
 * Fetches in parallel with concurrency limit.
 *
 * @param {Array<{citySlug: string, latitude: number, longitude: number}>} cities
 * @param {string|Date} startDate
 * @param {string|Date} endDate
 * @param {number} concurrency - Max parallel requests (default 5)
 */
export async function getWeatherForCities(cities, startDate, endDate, concurrency = 5) {
  const results = new Map();

  // Process in batches to respect rate limits
  for (let i = 0; i < cities.length; i += concurrency) {
    const batch = cities.slice(i, i + concurrency);
    const promises = batch.map(city =>
      getWeatherForCity(city.citySlug, city.latitude, city.longitude, startDate, endDate)
        .then(data => ({ citySlug: city.citySlug, data }))
    );

    const batchResults = await Promise.all(promises);
    batchResults.forEach(({ citySlug, data }) => {
      results.set(citySlug, data);
    });

    // Small delay between batches to be nice to the API
    if (i + concurrency < cities.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return results;
}
