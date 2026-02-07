import fs from 'fs';
import path from 'path';

/**
 * Scores cities based on visit calendar data for a given date range.
 *
 * Option A: reads visit calendar files on demand with module-level caching.
 * TODO (Option B): pre-compute a scoring index at build time for O(1) lookups.
 */

const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

const SCORE_LABELS = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Great', 5: 'Excellent' };
const CROWD_ORDER = ['Very Low', 'Low', 'Moderate', 'High', 'Very High', 'Extreme'];

// ── Module-level cache ─────────────────────────────────────────────
let manifestCache = null;
let calendarCache = new Map(); // slug → parsed visit calendar

function getManifest() {
  if (!manifestCache) {
    const p = path.join(process.cwd(), 'public', 'data', 'manifest.json');
    manifestCache = JSON.parse(fs.readFileSync(p, 'utf-8'));
  }
  return manifestCache;
}

function readCalendar(slug) {
  if (calendarCache.has(slug)) return calendarCache.get(slug);

  const manifest = getManifest();
  const entry = manifest.cities[slug];
  if (!entry) { calendarCache.set(slug, null); return null; }

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

// ── Scoring logic ──────────────────────────────────────────────────

/**
 * For a single day (month index 0-11, day 1-31), find the matching range
 * in the visit calendar and return its data.
 */
function findRange(monthData, day) {
  if (!monthData?.ranges) return null;
  for (const range of monthData.ranges) {
    if (range.days && range.days.includes(day)) {
      return range;
    }
  }
  return null;
}

/**
 * Score a city for a date range.
 * Returns null if the city has no visit calendar.
 */
function scoreCity(slug, startDate, endDate) {
  const cal = readCalendar(slug);
  if (!cal?.months) return null;

  const scores = [];
  const crowdLevels = [];
  const travelerTypeScores = {};
  const events = [];

  // Iterate each day in the range
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
        if (range.crowdLevel) crowdLevels.push(range.crowdLevel);

        // Accumulate traveler type scores
        if (range.travelerTypes && typeof range.travelerTypes === 'object') {
          for (const [type, score] of Object.entries(range.travelerTypes)) {
            if (!travelerTypeScores[type]) travelerTypeScores[type] = [];
            travelerTypeScores[type].push(typeof score === 'number' ? score : 3);
          }
        }

        // Collect events
        if (range.event && range.special) {
          const eventStr = range.event;
          if (!events.includes(eventStr)) {
            events.push(eventStr);
          }
        }
      }
    }
    current.setDate(current.getDate() + 1);
  }

  if (scores.length === 0) return null;

  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

  // Summarize crowd level (most common)
  const crowdCounts = {};
  crowdLevels.forEach(c => { crowdCounts[c] = (crowdCounts[c] || 0) + 1; });
  const crowdLevel = Object.entries(crowdCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';

  // Top traveler types (avg score > 3)
  const topTravelerTypes = Object.entries(travelerTypeScores)
    .map(([type, scores]) => ({
      type,
      avg: scores.reduce((a, b) => a + b, 0) / scores.length,
    }))
    .filter(t => t.avg >= 3)
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 3)
    .map(t => t.type);

  return {
    avgScore: Math.round(avgScore * 10) / 10,
    crowdLevel,
    travelerTypes: topTravelerTypes,
    events: events.slice(0, 3),
    daysScored: scores.length,
  };
}

/**
 * Build a human-readable "reason" string for why a city is good for these dates.
 */
function buildReason(scoreData) {
  const parts = [];

  const label = SCORE_LABELS[Math.round(scoreData.avgScore)] || 'Good';
  parts.push(`${label} time to visit`);

  if (scoreData.events.length > 0) {
    parts.push(scoreData.events[0]);
  }

  const crowdIdx = CROWD_ORDER.indexOf(scoreData.crowdLevel);
  if (crowdIdx <= 1) {
    parts.push('fewer crowds');
  } else if (crowdIdx >= 4) {
    parts.push('peak season');
  }

  return parts.join(' · ');
}

// ── Public API ─────────────────────────────────────────────────────

/**
 * Score all cities for a date range and return top results.
 */
export async function scoreCitiesForDates({ startDate, endDate, travelerType, limit = 20 }) {
  const manifest = getManifest();

  // Load the generated city list for metadata
  let cityList = [];
  try {
    const listPath = path.join(process.cwd(), 'src', 'generated', 'cities.json');
    cityList = JSON.parse(fs.readFileSync(listPath, 'utf-8'));
  } catch {
    // Fallback: build minimal list from manifest
    cityList = Object.entries(manifest.cities).map(([slug, entry]) => ({
      id: slug,
      name: slug.charAt(0).toUpperCase() + slug.slice(1),
      country: entry.country.replace(/-/g, ' '),
    }));
  }

  const cityMap = Object.fromEntries(cityList.map(c => [c.id, c]));
  const results = [];

  for (const slug of Object.keys(manifest.cities)) {
    const scoreData = scoreCity(slug, startDate, endDate);
    if (!scoreData) continue;

    const city = cityMap[slug] || {};

    // Traveler type boost
    let finalScore = scoreData.avgScore;
    if (travelerType && scoreData.travelerTypes.includes(travelerType.toLowerCase())) {
      finalScore = Math.min(5, finalScore + 0.3);
    }

    results.push({
      id: slug,
      title: `${city.name || slug}, ${city.country || ''}`.trim(),
      subtitle: city.description || '',
      tags: scoreData.travelerTypes.map(t => t.charAt(0).toUpperCase() + t.slice(1)),
      score: Math.round(finalScore * 10) / 10,
      popularity: Math.round(finalScore * 20),
      value: scoreData.crowdLevel === 'Very Low' || scoreData.crowdLevel === 'Low' ? 85 : 65,
      image: city.thumbnail || `/images/city-thumbnail/${slug}-thumbnail.jpeg`,
      why: buildReason(scoreData),
      crowdLevel: scoreData.crowdLevel,
      events: scoreData.events,
      cityId: slug,
      cityName: city.name || slug,
      country: city.country || '',
      coordinates: city.latitude && city.longitude ? [city.longitude, city.latitude] : null,
    });
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  return results.slice(0, limit);
}
