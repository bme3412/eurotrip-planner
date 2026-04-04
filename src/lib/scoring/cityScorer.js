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

const MONTH_DISPLAY = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const SCORE_LABELS = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Great', 5: 'Excellent' };
const CROWD_ORDER = ['Very Low', 'Low', 'Moderate', 'High', 'Very High', 'Extreme'];

/**
 * Many visit-calendar files use non-standard crowdLevel strings.
 * Map them to values that CROWD_ORDER.indexOf() can work with.
 */
const CROWD_ALIASES = {
  'very low':                 'Very Low',
  'low':                      'Low',
  'low-moderate':             'Low',
  'low to moderate':          'Low',
  'moderate':                 'Moderate',
  'medium':                   'Moderate',
  'moderate-high':            'High',
  'medium-high':              'High',
  'moderate to high':         'High',
  'moderately high':          'High',
  'high':                     'High',
  'high at popular spots':    'High',
  'high at major museums':    'High',
  'high in montmartre':       'High',
  'high (tourists), low (locals)': 'High',
  'low (streets), full (restaurants)': 'Moderate',
  'very high':                'Very High',
  'very high along route':    'Very High',
  'very high (tourists)':     'Very High',
  'extreme':                  'Extreme',
  'extremely high':           'Extreme',
};

function normalizeCrowdLevel(raw) {
  if (!raw) return null;
  return CROWD_ALIASES[raw.toLowerCase()] ?? raw;
}

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

// ── Date helpers ────────────────────────────────────────────────────

function formatEventDate(overlapDays, monthIdx) {
  if (!overlapDays || overlapDays.length === 0) return MONTH_DISPLAY[monthIdx];
  const sorted = [...overlapDays].sort((a, b) => a - b);
  const monthName = MONTH_DISPLAY[monthIdx];
  if (sorted.length === 1) return `${monthName} ${sorted[0]}`;
  return `${monthName} ${sorted[0]}–${sorted[sorted.length - 1]}`;
}

function eventSortKey(monthIdx, firstDay) {
  return monthIdx * 31 + (firstDay || 1);
}

// ── Scoring logic ──────────────────────────────────────────────────

function findRange(monthData, day) {
  if (!monthData?.ranges) return null;
  for (const range of monthData.ranges) {
    if (range.days && range.days.includes(day)) {
      return range;
    }
  }
  return null;
}

function buildHighlights(eventMap, scoreData) {
  const highlights = [];

  const evtList = [...eventMap.values()].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return eventSortKey(a.monthIdx, a.overlapDays[0]) - eventSortKey(b.monthIdx, b.overlapDays[0]);
  });

  for (const evt of evtList) {
    const dateLabel = formatEventDate(evt.overlapDays, evt.monthIdx);
    highlights.push({
      type: 'event',
      name: evt.name,
      date: dateLabel,
      description: evt.notes || null,
      score: evt.score,
      sortKey: eventSortKey(evt.monthIdx, evt.overlapDays[0] || 1),
    });
  }

  // Crowd context — only add when no events
  if (highlights.length === 0) {
    const crowdIdx = CROWD_ORDER.indexOf(scoreData.crowdLevel);
    if (crowdIdx <= 1) {
      highlights.push({ type: 'crowd', description: 'Fewer crowds than usual for this city' });
    } else if (crowdIdx >= 4) {
      highlights.push({ type: 'crowd', description: 'Peak season — popular but busy' });
    }
  }

  return highlights.slice(0, 4);
}

function scoreCity(slug, startDate, endDate) {
  const cal = readCalendar(slug);
  if (!cal?.months) return null;

  const scores = [];
  const crowdLevels = [];
  const travelerTypeScores = {};
  const eventMap = new Map();
  let hasAnyEventField = false;   // tracks whether this calendar has special events at all
  let hasCrowdData = false;       // tracks whether this calendar has crowdLevel data

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

        // Normalize and collect crowd level
        if (range.crowdLevel) {
          const normalized = normalizeCrowdLevel(range.crowdLevel);
          if (normalized) {
            crowdLevels.push(normalized);
            hasCrowdData = true;
          }
        }

        // Accumulate traveler type scores
        if (range.travelerTypes && typeof range.travelerTypes === 'object') {
          for (const [type, score] of Object.entries(range.travelerTypes)) {
            if (!travelerTypeScores[type]) travelerTypeScores[type] = [];
            travelerTypeScores[type].push(typeof score === 'number' ? score : 3);
          }
        }

        // Collect structured events
        if (range.event && range.special) {
          hasAnyEventField = true;
          const key = range.event;
          if (!eventMap.has(key)) {
            const overlapDays = (range.days || []).filter(d => {
              const dayDate = new Date(current.getFullYear(), monthIdx, d);
              return dayDate >= startDate && dayDate <= end;
            });
            eventMap.set(key, {
              name: range.event,
              score: range.score || 3,
              notes: range.notes || null,
              overlapDays,
              monthIdx,
              month: monthName,
            });
          }
        }
      }
    }
    current.setDate(current.getDate() + 1);
  }

  if (scores.length === 0) return null;

  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

  // Summarize crowd level (most common normalized value)
  const crowdCounts = {};
  crowdLevels.forEach(c => { crowdCounts[c] = (crowdCounts[c] || 0) + 1; });
  const crowdLevel = Object.entries(crowdCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';

  const crowdIdx = CROWD_ORDER.indexOf(crowdLevel);

  // Top traveler types (avg score >= 3)
  const topTravelerTypes = Object.entries(travelerTypeScores)
    .map(([type, sc]) => ({
      type,
      avg: sc.reduce((a, b) => a + b, 0) / sc.length,
    }))
    .filter(t => t.avg >= 3)
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 3)
    .map(t => t.type);

  const sortedEvents = [...eventMap.values()].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return eventSortKey(a.monthIdx, a.overlapDays[0]) - eventSortKey(b.monthIdx, b.overlapDays[0]);
  });

  const scoreData = {
    avgScore,  // unrounded so event/traveler boosts in scoreCitiesForDates have room to work
    crowdLevel,
    travelerTypes: topTravelerTypes,
    events: sortedEvents.map(e => e.name).slice(0, 3),
    primaryEvent: sortedEvents[0]
      ? { name: sortedEvents[0].name, date: formatEventDate(sortedEvents[0].overlapDays, sortedEvents[0].monthIdx) }
      : null,
    daysScored: scores.length,
    hasEvents: eventMap.size > 0,
    hasCrowdData,
    crowdIdx,  // -1 = unknown, 0-5 = Very Low → Extreme
  };

  return {
    ...scoreData,
    highlights: buildHighlights(eventMap, scoreData),
  };
}

function buildReason(scoreData) {
  const parts = [];
  const label = SCORE_LABELS[Math.round(scoreData.avgScore)] || 'Good';
  parts.push(`${label} time to visit`);
  if (scoreData.events.length > 0) parts.push(scoreData.events[0]);
  if (scoreData.crowdIdx >= 0) {
    if (scoreData.crowdIdx <= 1) parts.push('fewer crowds');
    else if (scoreData.crowdIdx >= 4) parts.push('peak season');
  }
  return parts.join(' · ');
}

// ── Public API ─────────────────────────────────────────────────────

export async function scoreCitiesForDates({ startDate, endDate, travelerType, limit = 20 }) {
  const manifest = getManifest();

  let cityList = [];
  try {
    const listPath = path.join(process.cwd(), 'src', 'generated', 'cities.json');
    cityList = JSON.parse(fs.readFileSync(listPath, 'utf-8'));
  } catch {
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

    let finalScore = scoreData.avgScore;

    // Event boost: city has a special event overlapping the trip dates
    // Lifts event cities above generic 5.0 ties
    if (scoreData.hasEvents) {
      finalScore = Math.min(5, finalScore + 0.2);
    }

    // Traveler type boost
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
      value: scoreData.crowdIdx >= 0 && scoreData.crowdIdx <= 1 ? 85 : 65,
      image: city.thumbnail || `/images/city-thumbnail/${slug}-thumbnail.jpeg`,
      why: buildReason(scoreData),
      crowdLevel: scoreData.crowdLevel,
      events: scoreData.events,
      primaryEvent: scoreData.primaryEvent || null,
      highlights: scoreData.highlights,
      cityId: slug,
      cityName: city.name || slug,
      country: city.country || '',
      coordinates: city.latitude && city.longitude ? [city.longitude, city.latitude] : null,
      // Internal signals for tie-breaking (not shown in UI)
      _finalScore: finalScore,           // unrounded — used for sorting
      _hasEvents: scoreData.hasEvents,
      _hasCrowdData: scoreData.hasCrowdData,
      _crowdIdx: scoreData.crowdIdx,
      _daysScored: scoreData.daysScored,
    });
  }

  // Multi-key sort using unrounded _finalScore so event boost (+0.2) and
  // traveler-type boost (+0.3) actually change the order instead of rounding away.
  results.sort((a, b) => {
    const scoreDiff = b._finalScore - a._finalScore;
    if (Math.abs(scoreDiff) > 0.001) return scoreDiff;

    // Prefer cities with events
    if (a._hasEvents !== b._hasEvents) return a._hasEvents ? -1 : 1;

    // Prefer lower crowds (when crowd data is available)
    const aHasCrowd = a._hasCrowdData && a._crowdIdx >= 0;
    const bHasCrowd = b._hasCrowdData && b._crowdIdx >= 0;
    if (aHasCrowd && bHasCrowd) return a._crowdIdx - b._crowdIdx;
    if (aHasCrowd && !bHasCrowd) return -1;
    if (!aHasCrowd && bHasCrowd) return 1;

    // More scored days = more complete data
    return b._daysScored - a._daysScored;
  });

  // Strip internal fields before returning
  return results.slice(0, limit).map(({ _finalScore, _hasEvents, _hasCrowdData, _crowdIdx, _daysScored, ...r }) => r);
}
