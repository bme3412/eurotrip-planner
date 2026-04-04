import { getTravelStyleForPace } from './travelStyles.js';

/**
 * Generic itinerary generator for any city.
 *
 * Works with whatever data is available in the city's index.json.
 * Falls back gracefully when data is sparse.
 *
 * @param {Object} trip  - Trip parameters from the wizard / Supabase row
 * @param {Object} cityData - Full city data from getCityData()
 * @returns {Object} itinerary with days[], summary, travelStyle, bookImmediately
 */

const MILLISECONDS_IN_DAY = 1000 * 60 * 60 * 24;

// ── Interest matchers (generic, works for any city) ─────────────────

const INTEREST_MATCHERS = {
  'Culture & History': (s) => {
    const t = (s.type || '').toLowerCase();
    const d = (s.description || '').toLowerCase();
    return ['museum', 'monument', 'historic', 'palace', 'cathedral', 'church', 'castle', 'fort', 'ruin'].some(k => t.includes(k) || d.includes(k));
  },
  'Food & Drink': (s) => {
    const t = (s.type || '').toLowerCase();
    const d = (s.description || '').toLowerCase();
    return ['market', 'food', 'restaurant', 'café', 'wine', 'brewery', 'culinary'].some(k => t.includes(k) || d.includes(k));
  },
  'Nature & Outdoors': (s) => {
    const t = (s.type || '').toLowerCase();
    const d = (s.description || '').toLowerCase();
    return ['park', 'garden', 'trail', 'beach', 'lake', 'mountain', 'nature', 'outdoor', 'river', 'forest'].some(k => t.includes(k) || d.includes(k));
  },
  'Art & Museums': (s) => {
    const t = (s.type || '').toLowerCase();
    const d = (s.description || '').toLowerCase();
    return ['museum', 'gallery', 'art', 'exhibition'].some(k => t.includes(k) || d.includes(k));
  },
  'Nightlife': (s) => {
    const t = (s.type || '').toLowerCase();
    const d = (s.description || '').toLowerCase();
    return ['bar', 'club', 'nightlife', 'jazz', 'pub', 'lounge'].some(k => t.includes(k) || d.includes(k));
  },
  'Shopping': (s) => {
    const t = (s.type || '').toLowerCase();
    const d = (s.description || '').toLowerCase();
    return ['market', 'shopping', 'boutique', 'district', 'bazaar', 'souk'].some(k => t.includes(k) || d.includes(k));
  },
  'Photography': (s) => {
    const d = (s.description || '').toLowerCase();
    return ['view', 'panoram', 'scenic', 'photo', 'lookout', 'skyline', 'sunset'].some(k => d.includes(k));
  },
  'Family Activities': (s) => {
    const t = (s.type || '').toLowerCase();
    const d = (s.description || '').toLowerCase();
    return ['zoo', 'aquarium', 'park', 'family', 'kids', 'playground', 'science'].some(k => t.includes(k) || d.includes(k));
  },
};

// Also support the Paris interest labels
const LEGACY_MATCHERS = {
  'Art & Design': INTEREST_MATCHERS['Art & Museums'],
  'History': INTEREST_MATCHERS['Culture & History'],
  'Food & Wine': INTEREST_MATCHERS['Food & Drink'],
  'Hidden Gems': (s) => (s?.ratings?.cultural_significance ?? 3) <= 3,
  'Parks & Outdoors': INTEREST_MATCHERS['Nature & Outdoors'],
  'Family Friendly': INTEREST_MATCHERS['Family Activities'],
  'Nightlife': INTEREST_MATCHERS['Nightlife'],
  'Fashion & Shopping': INTEREST_MATCHERS['Shopping'],
};

const ALL_MATCHERS = { ...INTEREST_MATCHERS, ...LEGACY_MATCHERS };

// ── Helpers ──────────────────────────────────────────────────────────

function parseDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function computeDays(start, end) {
  if (!start || !end) return 3;
  const diff = Math.round((end - start) / MILLISECONDS_IN_DAY);
  return Math.max(1, Math.min(14, diff + 1));
}

function formatDate(date) {
  if (!date) return '';
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getAttractions(cityData) {
  if (!cityData) return [];
  if (Array.isArray(cityData.attractions?.sites)) return cityData.attractions.sites;
  if (Array.isArray(cityData.attractions)) return cityData.attractions;
  return [];
}

function getNeighborhoods(cityData) {
  if (!cityData) return [];
  if (Array.isArray(cityData.neighborhoods?.neighborhoods)) return cityData.neighborhoods.neighborhoods;
  if (Array.isArray(cityData.neighborhoods)) return cityData.neighborhoods;
  return [];
}

function getCulinary(cityData) {
  if (!cityData) return null;
  return cityData.culinaryGuide || cityData.culinary || null;
}

function getFoodEntries(culinary) {
  if (!culinary) return [];
  const entries = [];
  const sections = ['restaurants', 'bars_and_cafes', 'food_experiences'];
  for (const section of sections) {
    const data = culinary[section];
    if (Array.isArray(data)) {
      entries.push(...data);
    } else if (data && typeof data === 'object') {
      for (const sub of Object.values(data)) {
        if (Array.isArray(sub)) entries.push(...sub);
      }
    }
  }
  return entries;
}

// ── Scoring ──────────────────────────────────────────────────────────

function scoreAttraction(site, interests, mustSee) {
  let score = 0;
  const cultural = site?.ratings?.cultural_significance ?? 3;
  score += cultural * 10;

  // Interest match boost
  for (const interest of interests) {
    const matcher = ALL_MATCHERS[interest];
    if (matcher && matcher(site)) {
      score += 20;
      break;
    }
  }

  // Must-see boost
  const nameSlug = (site.name || '').toLowerCase().replace(/\s+/g, '-');
  if (mustSee.some(m => nameSlug.includes(m) || m.includes(nameSlug))) {
    score += 50;
  }

  return score;
}

// ── Geographic clustering & routing ─────────────────────────────────

/**
 * Reorder items within a day using nearest-neighbor traversal to minimize
 * backtracking. Starts from the westernmost item (approximates hotel/arrival).
 * Items without coordinates are appended at the end unchanged.
 */
function orderByProximity(items) {
  const withCoords = items.filter(i => i._lat && i._lon);
  if (withCoords.length <= 1) return items;

  // Start from westernmost point (lowest longitude) as a proxy for hotel/arrival
  const start = withCoords.reduce((a, b) => (b._lon < a._lon ? b : a));
  const ordered = [start];
  const remaining = new Set(withCoords.filter(i => i !== start));

  while (remaining.size > 0) {
    const last = ordered[ordered.length - 1];
    let nearest = null;
    let nearestDist = Infinity;
    for (const item of remaining) {
      const d = haversine(last._lat, last._lon, item._lat, item._lon);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = item;
      }
    }
    ordered.push(nearest);
    remaining.delete(nearest);
  }

  return [...ordered, ...items.filter(i => !i._lat || !i._lon)];
}

/**
 * Parse opening hours from enriched Google data or static `hours` string.
 * Returns { opensAt: number (hour), closesAt: number (hour) } or null.
 *
 * Google Places `openingHours.periods` format:
 * [ { open: { day, hour, minute }, close: { day, hour, minute } }, ... ]
 *
 * Falls back to parsing a plain string like "9:00 AM – 5:00 PM".
 */
function parseOpeningHours(site, tripDate) {
  // Try Google Places structured format
  const periods = site.openingHours?.periods || site.opening_hours?.periods;
  if (periods && Array.isArray(periods) && periods.length > 0) {
    // Use day-of-week from tripDate if available, else day 0 (Sunday) as default
    const dow = tripDate ? tripDate.getDay() : 1;
    const period = periods.find(p => p.open?.day === dow) || periods[0];
    if (period?.open?.hour != null) {
      const opensAt = period.open.hour + (period.open.minute || 0) / 60;
      const closesAt = period.close
        ? period.close.hour + (period.close.minute || 0) / 60
        : 22;
      return { opensAt, closesAt };
    }
  }

  // Try plain string (e.g. "9:00 AM – 5:00 PM" or "10:00-18:00")
  const hoursStr = site.hours || site.opening_hours_text;
  if (typeof hoursStr === 'string') {
    // Match patterns like "9:00 AM", "9AM", "09:00", "9h"
    const timeRe = /(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/gi;
    const matches = [...hoursStr.matchAll(timeRe)];
    if (matches.length >= 2) {
      const toHour = (m) => {
        let h = parseInt(m[1], 10);
        const min = parseInt(m[2] || '0', 10);
        const period = (m[3] || '').toUpperCase();
        if (period === 'PM' && h < 12) h += 12;
        if (period === 'AM' && h === 12) h = 0;
        return h + min / 60;
      };
      return { opensAt: toHour(matches[0]), closesAt: toHour(matches[1]) };
    }
  }

  return null;
}

function clusterByProximity(items, numGroups) {
  if (items.length === 0) return Array.from({ length: numGroups }, () => []);
  if (items.length <= numGroups) return items.map(i => [i]);

  const withCoords = items.filter(i => i._lat && i._lon);
  const noCoords = items.filter(i => !i._lat || !i._lon);

  if (withCoords.length < 2) {
    // Can't cluster geographically, just chunk evenly
    const groups = Array.from({ length: numGroups }, () => []);
    items.forEach((item, i) => groups[i % numGroups].push(item));
    return groups;
  }

  // Simple greedy clustering: pick seeds, assign nearest
  const seeds = [];
  const step = Math.max(1, Math.floor(withCoords.length / numGroups));
  for (let i = 0; i < numGroups && i * step < withCoords.length; i++) {
    seeds.push(withCoords[i * step]);
  }

  const groups = seeds.map(s => [s]);
  const assigned = new Set(seeds.map(s => s.name));

  for (const item of withCoords) {
    if (assigned.has(item.name)) continue;
    let bestGroup = 0;
    let bestDist = Infinity;
    for (let g = 0; g < groups.length; g++) {
      const seed = seeds[g];
      const dist = haversine(item._lat, item._lon, seed._lat, seed._lon);
      if (dist < bestDist) {
        bestDist = dist;
        bestGroup = g;
      }
    }
    groups[bestGroup].push(item);
  }

  // Distribute no-coords items evenly
  noCoords.forEach((item, i) => groups[i % groups.length].push(item));

  return groups;
}

// ── Time block templates ─────────────────────────────────────────────

const TIME_SLOTS = {
  relaxed: [
    { time: 'morning', startTime: '10:00', endTime: '12:00' },
    { time: 'lunch', startTime: '12:30', endTime: '14:00' },
    { time: 'afternoon', startTime: '15:00', endTime: '17:00' },
  ],
  moderate: [
    { time: 'morning', startTime: '9:30', endTime: '11:30' },
    { time: 'late_morning', startTime: '11:30', endTime: '12:30' },
    { time: 'lunch', startTime: '12:30', endTime: '14:00' },
    { time: 'afternoon', startTime: '14:30', endTime: '17:00' },
  ],
  active: [
    { time: 'early_morning', startTime: '9:00', endTime: '10:30' },
    { time: 'morning', startTime: '10:45', endTime: '12:15' },
    { time: 'lunch', startTime: '12:30', endTime: '13:30' },
    { time: 'afternoon', startTime: '14:00', endTime: '16:00' },
    { time: 'late_afternoon', startTime: '16:15', endTime: '18:00' },
  ],
};

function getPaceLabel(pace) {
  if (pace <= 35) return 'relaxed';
  if (pace >= 70) return 'active';
  return 'moderate';
}

// ── Day themes ──────────────────────────────────────────────────────

function generateDayTheme(items, neighborhoods, dayNumber) {
  // Try to derive from neighborhoods
  const hoods = [...new Set(items.map(i => i.neighborhood).filter(Boolean))];
  if (hoods.length > 0) return hoods.slice(0, 2).join(' & ');

  // Try attraction types
  const types = [...new Set(items.map(i => i.type).filter(Boolean))];
  if (types.length > 0) return types.slice(0, 2).join(' & ') + ' Day';

  return `Day ${dayNumber} Exploration`;
}

// ── Main builder ────────────────────────────────────────────────────

export function buildItinerary(trip, cityData) {
  const startDate = parseDate(trip.start_date);
  const endDate = parseDate(trip.end_date);
  const numDays = computeDays(startDate, endDate);
  const pace = typeof trip.pace === 'number' ? trip.pace : 50;
  const paceLabel = getPaceLabel(pace);
  const travelStyle = getTravelStyleForPace(pace);
  const interests = Array.isArray(trip.interests) ? trip.interests : [];
  const mustSee = Array.isArray(trip.must_see) ? trip.must_see : [];
  const budget = trip.budget || 'moderate';
  const cityName = cityData?.cityName || trip.city || 'this city';
  const country = cityData?.country || trip.country || '';

  // ── Gather & score attractions ──
  const rawAttractions = getAttractions(cityData);
  const scored = rawAttractions
    .map(site => {
      const hours = parseOpeningHours(site, startDate);
      return {
        ...site,
        _score: scoreAttraction(site, interests, mustSee),
        _lat: site.latitude || null,
        _lon: site.longitude || null,
        // Flag sites that open late (skip early slots) or close early (skip late slots)
        _opensLate: hours ? hours.opensAt > 10 : false,
        _closesEarly: hours ? hours.closesAt < 16 : false,
      };
    })
    .filter(site => {
      // Budget filter: skip expensive for budget travelers
      if (budget === 'budget' && (site.price_range || '').toLowerCase().includes('expensive')) return false;
      return true;
    })
    .sort((a, b) => b._score - a._score);

  const neighborhoods = getNeighborhoods(cityData);
  const culinary = getCulinary(cityData);
  const foodEntries = getFoodEntries(culinary);

  // ── Select attractions for the trip ──
  const slotsPerDay = paceLabel === 'relaxed' ? 2 : paceLabel === 'active' ? 4 : 3;
  const totalSlots = numDays * slotsPerDay;
  const selected = scored.slice(0, Math.min(totalSlots + 4, scored.length));

  // ── Cluster geographically by day, then order within each day ──
  const clusters = clusterByProximity(selected, numDays).map(orderByProximity);

  // ── Build days ──
  const timeSlots = TIME_SLOTS[paceLabel];
  const days = [];

  /**
   * Pick the best attraction for a time slot from the remaining pool,
   * respecting opening hours flags while preserving geographic order.
   * Falls back to the first available item if no ideal candidate exists.
   */
  function pickForSlot(pool, slotTime) {
    const isEarlySlot = slotTime === 'early_morning' || slotTime === 'morning';
    const isLateSlot = slotTime === 'late_afternoon';
    for (let i = 0; i < pool.length; i++) {
      const site = pool[i];
      if (isEarlySlot && site._opensLate) continue;
      if (isLateSlot && site._closesEarly) continue;
      return pool.splice(i, 1)[0];
    }
    // No ideal match — fall back to first available (no hours data, or all restricted)
    return pool.splice(0, 1)[0];
  }

  for (let d = 0; d < numDays; d++) {
    const dayDate = startDate ? new Date(startDate.getTime() + d * MILLISECONDS_IN_DAY) : null;
    // Mutable copy so pickForSlot can splice from it
    const pool = [...(clusters[d] || [])];

    const timeBlocks = [];

    for (const slot of timeSlots) {
      if (slot.time === 'lunch') {
        // Food recommendation
        const food = foodEntries[d % Math.max(1, foodEntries.length)];
        timeBlocks.push({
          time: 'lunch',
          startTime: slot.startTime,
          endTime: slot.endTime,
          activity: {
            name: food ? `Lunch: ${food.name}` : `Lunch break`,
            type: 'food_recommendation',
            description: food?.description || food?.atmosphere || `Explore local cuisine in ${cityName}`,
            neighborhood: food?.neighborhood || pool[0]?.neighborhood || null,
            suggestions: food ? [food.name] : [],
            price: food?.price_range || null,
          },
        });
      } else if (pool.length > 0) {
        const site = pickForSlot(pool, slot.time);

        timeBlocks.push({
          time: slot.time,
          startTime: slot.startTime,
          endTime: slot.endTime,
          activity: {
            name: site.name,
            type: site.type || 'Attraction',
            description: site.description || '',
            duration: site.ratings?.suggested_duration_hours ? `${site.ratings.suggested_duration_hours}h` : '1.5h',
            price: site.price_range || 'Check locally',
            coordinates: site._lat && site._lon ? [site._lon, site._lat] : null,
            bookingUrl: site.official_url || site.website || null,
            neighborhood: site.neighborhood || null,
          },
        });
      } else {
        // Pad with neighborhood exploration
        const hood = neighborhoods[d % Math.max(1, neighborhoods.length)];
        if (hood) {
          timeBlocks.push({
            time: slot.time,
            startTime: slot.startTime,
            endTime: slot.endTime,
            activity: {
              name: `Explore ${hood.name}`,
              type: 'neighborhood',
              description: hood.character || `Discover the charm of ${hood.name}`,
              neighborhood: hood.name,
              highlights: hood.highlights?.slice(0, 3) || [],
            },
          });
        }
      }
    }

    const theme = generateDayTheme(clusters[d] || [], neighborhoods, d + 1);

    days.push({
      dayNumber: d + 1,
      date: formatDate(dayDate),
      theme,
      timeBlocks,
      tips: [],
    });
  }

  // ── Book immediately (must-see items that need pre-booking) ──
  const bookImmediately = rawAttractions
    .filter(s => s.booking_tips && mustSee.some(m => (s.name || '').toLowerCase().includes(m)))
    .slice(0, 3)
    .map(s => ({
      type: s.type || 'Attraction',
      title: s.name,
      note: s.booking_tips,
    }));

  // ── Summary ──
  const allNeighborhoods = [...new Set(days.flatMap(d => d.timeBlocks.map(tb => tb.activity?.neighborhood).filter(Boolean)))];
  const summary = `Your ${numDays}-day ${travelStyle.headline.toLowerCase()} itinerary for ${cityName}${country ? `, ${country}` : ''}. ${selected.length} experiences across ${allNeighborhoods.length || 'several'} neighborhoods.`;

  return {
    city: cityName,
    country,
    startDate: trip.start_date,
    endDate: trip.end_date,
    travelStyle,
    summary,
    bookImmediately,
    days,
    meta: {
      totalAttractions: selected.length,
      neighborhoods: allNeighborhoods,
      mustSeeCompleted: mustSee,
    },
  };
}
