/**
 * Ease Score Calculator
 *
 * Calculates "ease of travel" scores for city pairings based on:
 * - Transport frequency (30%)
 * - Travel time (25%)
 * - Price (20%)
 * - Direct connections (15%)
 * - Data completeness (10%)
 */

let manifestCache = null;
let citiesCache = null;
let generatedCitiesCache = null;

function parseJourneyTime(timeStr) {
  if (!timeStr || timeStr === 'N/A') return 999;

  const hours = timeStr.match(/(\d+)h/);
  const minutes = timeStr.match(/(\d+)m/);

  let totalMinutes = 0;
  if (hours) totalMinutes += parseInt(hours[1]) * 60;
  if (minutes) totalMinutes += parseInt(minutes[1]);

  return totalMinutes || 999;
}

function parseFrequency(freqStr) {
  if (!freqStr || freqStr === 'N/A') return 1;

  const lower = freqStr.toLowerCase();

  if (lower.includes('every') && lower.includes('minute')) {
    const match = lower.match(/(\d+)\s*minute/);
    if (match) return Math.floor((14 * 60) / parseInt(match[1]));
  }

  if (lower.includes('hourly')) return 14;

  const timesMatch = lower.match(/(\d+)\s*(?:time|x)/);
  if (timesMatch) return parseInt(timesMatch[1]);

  if (lower.includes('daily') || lower.includes('day')) return 4;

  return 4;
}

function parsePrice(priceStr) {
  if (!priceStr || priceStr === 'N/A') return 100;

  const range = priceStr.match(/€?(\d+)\s*[-–]\s*(\d+)/);
  if (range) return (parseInt(range[1]) + parseInt(range[2])) / 2;

  const single = priceStr.match(/€?(\d+)/);
  if (single) return parseInt(single[1]);

  return 100;
}

function getBestTransport(connection) {
  const candidates = [
    { key: 'directWithinCountryTrain', type: 'train', data: connection.directWithinCountryTrain },
    { key: 'intraEuropeTrain', type: 'train', data: connection.intraEuropeTrain },
    { key: 'intraEuropeFlight', type: 'flight', data: connection.intraEuropeFlight },
    { key: 'flight', type: 'flight', data: connection.flight },
    { key: 'bus', type: 'bus', data: connection.bus },
    { key: 'ferry', type: 'ferry', data: connection.ferry },
  ].filter(c => c.data);

  if (candidates.length === 0) return { type: 'unknown', data: {} };

  // Prefer by: train > flight > bus > ferry, but pick fastest valid option
  const withTime = candidates.map(c => ({
    ...c,
    minutes: parseJourneyTime(c.data.journeyTime || c.data.approxFlightTime),
  }));

  // Prefer trains if time is reasonable (< 6h), otherwise pick fastest
  const trains = withTime.filter(c => c.type === 'train' && c.minutes < 360);
  if (trains.length > 0) {
    trains.sort((a, b) => a.minutes - b.minutes);
    return trains[0];
  }

  withTime.sort((a, b) => a.minutes - b.minutes);
  return withTime[0];
}

function calculateEaseScore(connection) {
  const best = getBestTransport(connection);
  const transport = best.data;

  const timeStr = transport.journeyTime || transport.approxFlightTime;
  const freqStr = transport.frequency;
  const priceStr = transport.price;

  const frequency = parseFrequency(freqStr);
  const frequencyScore = Math.min(frequency / 14, 1) * 3;

  const minutes = parseJourneyTime(timeStr);
  const timeScore = Math.max(0, (360 - minutes) / 360) * 2.5;

  const price = parsePrice(priceStr);
  const priceScore = Math.max(0, (150 - price) / 150) * 2;

  const isDirect = !!(connection.directWithinCountryTrain || connection.intraEuropeTrain);
  const directScore = isDirect ? 1.5 : 0.5;

  const hasAllData = !!(timeStr && timeStr !== 'N/A' && freqStr && freqStr !== 'N/A');
  const dataScore = hasAllData ? 1 : 0.5;

  const totalScore = frequencyScore + timeScore + priceScore + directScore + dataScore;
  return Math.round(totalScore * 10) / 10;
}

async function loadManifest() {
  if (manifestCache) return manifestCache;
  try {
    const res = await fetch('/data/manifest.json');
    if (res.ok) {
      manifestCache = await res.json();
      return manifestCache;
    }
  } catch (_) { /* fallback below */ }
  return { cities: {} };
}

async function loadCitiesIndex() {
  if (citiesCache) return citiesCache;
  try {
    const res = await fetch('/data/cities.json');
    if (res.ok) {
      citiesCache = await res.json();
      return citiesCache;
    }
  } catch (_) { /* fallback below */ }
  return {};
}

async function loadGeneratedCities() {
  if (generatedCitiesCache) return generatedCitiesCache;
  try {
    // Dynamic import for generated cities with coordinates
    const cities = (await import('@/generated/cities.json')).default;
    // Build a lookup by id for fast access
    generatedCitiesCache = {};
    for (const city of cities) {
      generatedCitiesCache[city.id] = city;
    }
    return generatedCitiesCache;
  } catch (_) {
    console.warn('[easeScoreCalculator] Could not load generated cities');
    return {};
  }
}

function getCityCoordinates(cityId, lookup) {
  const city = lookup[cityId];
  if (city) {
    return { latitude: city.latitude, longitude: city.longitude };
  }
  return { latitude: null, longitude: null };
}

function resolveCountry(cityId, manifest, citiesIndex) {
  const slug = cityId.toLowerCase().replace(/\s+/g, '-');

  if (manifest.cities?.[slug]?.country) {
    return manifest.cities[slug].country;
  }

  for (const [country, cities] of Object.entries(citiesIndex)) {
    if (cities.includes(slug)) return country;
  }

  return null;
}

async function loadConnections(cityId) {
  const slug = cityId.toLowerCase().replace(/\s+/g, '-');

  const [manifest, citiesIndex] = await Promise.all([
    loadManifest(),
    loadCitiesIndex(),
  ]);

  const country = resolveCountry(slug, manifest, citiesIndex);

  if (country) {
    try {
      const res = await fetch(`/data/${country}/${slug}/${slug}_connections.json`);
      if (res.ok) return await res.json();
    } catch (_) { /* fall through */ }
  }

  // Brute-force fallback: try all countries from the cities index
  for (const c of Object.keys(citiesIndex)) {
    if (c === country) continue;
    try {
      const res = await fetch(`/data/${c}/${slug}/${slug}_connections.json`);
      if (res.ok) return await res.json();
    } catch (_) { continue; }
  }

  console.warn(`[easeScoreCalculator] No connections found for ${cityId}`);
  return { destinations: [] };
}

/**
 * Calculate ease scores for all destinations from an anchor city
 */
export async function calculateEaseScores(anchorCity) {
  const [data, generatedLookup] = await Promise.all([
    loadConnections(anchorCity),
    loadGeneratedCities(),
  ]);
  const destinations = data.destinations || [];

  return destinations
    .map(dest => {
      const easeScore = calculateEaseScore(dest);
      const best = getBestTransport(dest);
      const timeStr = best.data.journeyTime || best.data.approxFlightTime || null;
      const cityId = dest.city.toLowerCase().replace(/\s+/g, '-');
      const coords = getCityCoordinates(cityId, generatedLookup);

      return {
        id: cityId,
        name: dest.city,
        country: dest.country,
        latitude: coords.latitude,
        longitude: coords.longitude,
        easeScore,
        transportType: best.type,
        transportTime: (timeStr && timeStr !== 'N/A') ? timeStr : null,
        transportFrequency: best.data.frequency !== 'N/A' ? best.data.frequency : null,
        transportPrice: best.data.price || null,
        allTransport: {
          train: dest.directWithinCountryTrain || dest.intraEuropeTrain || null,
          flight: dest.intraEuropeFlight || dest.flight || null,
          bus: dest.bus || null,
          ferry: dest.ferry || null,
        },
        whyGo: dest.whyGo || null,
        highlights: dest.highlights || (dest.whyGo ? [dest.whyGo] : []),
        suggestedDays: dest.suggestedDays || '2-3',
      };
    })
    .filter(c => c.transportTime) // Exclude cities with no usable transport data
    .sort((a, b) => b.easeScore - a.easeScore);
}

/**
 * Get top N cities by ease score
 */
export function getTopCities(scores, count = 3, exclude = []) {
  return scores.filter(c => !exclude.includes(c.id)).slice(0, count);
}

/**
 * Get random N cities from the top pool
 */
export function getRandomCities(scores, count = 3, exclude = []) {
  const pool = scores.filter(c => !exclude.includes(c.id)).slice(0, 12);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Get all available city IDs with their countries for the anchor selector
 */
export async function getAllCities() {
  const [citiesIndex, generatedLookup] = await Promise.all([
    loadCitiesIndex(),
    loadGeneratedCities(),
  ]);
  const result = [];

  for (const [country, cities] of Object.entries(citiesIndex)) {
    for (const slug of cities) {
      const name = slug
        .split('-')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      const coords = getCityCoordinates(slug, generatedLookup);
      result.push({
        id: slug,
        name,
        country,
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
    }
  }

  return result.sort((a, b) => a.name.localeCompare(b.name));
}
