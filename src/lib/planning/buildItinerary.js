import { getTravelStyleForPace } from './travelStyles.js';
import { getSeasonalContext } from './seasonalContext.js';

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
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  // Parse bare YYYY-MM-DD at LOCAL midnight. `new Date('2026-07-12')` is UTC
  // midnight, which rolls back a day in any timezone behind UTC — shifting the
  // month/day used for weather, daylight and event anchoring.
  if (typeof v === 'string') {
    const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
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

export function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getAttractions(cityData) {
  if (!cityData) return [];
  if (Array.isArray(cityData.attractions?.sites)) return cityData.attractions.sites;
  if (Array.isArray(cityData.attractions)) return cityData.attractions;
  return [];
}

export function getNeighborhoods(cityData) {
  if (!cityData) return [];
  if (Array.isArray(cityData.neighborhoods?.neighborhoods)) return cityData.neighborhoods.neighborhoods;
  if (Array.isArray(cityData.neighborhoods)) return cityData.neighborhoods;
  return [];
}

export function getCulinary(cityData) {
  if (!cityData) return null;
  return cityData.culinaryGuide || cityData.culinary || null;
}

export function getFoodEntries(culinary) {
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

// ── Outdoor / weather classification ─────────────────────────────────

const OUTDOOR_KEYWORDS = ['park', 'garden', 'square', 'bridge', 'riverside', 'beach',
  'outdoor', 'viewpoint', 'lookout', 'promenade', 'cemetery', 'market', 'hill', 'trail',
  'vineyard', 'canal', 'boat', 'cruise', 'terrace', 'rooftop'];

/**
 * Whether a site is primarily an open-air experience. Prefers the explicit
 * `indoor` flag from the city guide; falls back to type/description keywords.
 */
export function isOutdoor(site) {
  if (site.indoor === true) return false;
  if (site.indoor === false) return true;
  const t = (site.type || '').toLowerCase();
  const d = (site.description || '').toLowerCase();
  return OUTDOOR_KEYWORDS.some(k => t.includes(k) || d.includes(k));
}

/** Loose name match between a site and a seasonal experience/event title. */
function nameMatches(siteName, otherName) {
  if (!siteName || !otherName) return false;
  const a = siteName.toLowerCase();
  const b = otherName.toLowerCase();
  if (a.length < 4 || b.length < 4) return false;
  return a.includes(b) || b.includes(a);
}

// ── Scoring ──────────────────────────────────────────────────────────

/** Normalize a name for dedup: lowercase, strip accents/punctuation/spacing. */
export function normalizeName(n) {
  return (n || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

export function scoreAttraction(site, interests, mustSee, season = {}) {
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

  // ── Seasonal weighting ──
  const { seasonalContext, flags = {}, avoidWet = false } = season;
  if (seasonalContext) {
    // Boost sites featured in this month's curated experiences/events — these
    // are the things actually worth doing during the trip window.
    const featured = [
      ...seasonalContext.uniqueExperiences.map(x => x.activity),
      ...seasonalContext.events.map(e => e.name),
    ];
    if (featured.some(name => nameMatches(site.name, name))) score += 25;
  }

  // In wet/cold windows (or for rain-averse travelers) push open-air sites down
  // so the day skews indoor. Heat is handled at slot-placement time instead.
  if (avoidWet && isOutdoor(site)) score -= 25;

  return score;
}

/** Short per-day weather/packing note derived from seasonal context. */
function buildWeatherNote(ctx) {
  if (!ctx?.weather) return null;
  const { highC, lowC, precipitation, tips } = ctx.weather;
  const bits = [];
  if (highC != null) bits.push(lowC != null ? `${lowC}–${highC}°C` : `~${highC}°C`);
  if (ctx.flags.heatRisk) bits.push('hot midday — plan indoor/shade 14:00–17:00');
  if (ctx.flags.rainRisk) bits.push('rain likely — keep indoor backups');
  if (ctx.flags.coldRisk) bits.push('cold — layer up');
  if (ctx.flags.shortDaylight && ctx.daylightHours != null) bits.push(`only ~${ctx.daylightHours}h daylight`);
  else if (precipitation && !ctx.flags.rainRisk) bits.push(String(precipitation).split('.')[0]);
  const note = bits.join(' · ');
  return note || tips || null;
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
export function parseOpeningHours(site, tripDate) {
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
  const baseInterests = Array.isArray(trip.interests) ? trip.interests : [];
  const mustSee = Array.isArray(trip.must_see) ? trip.must_see : [];
  const budget = trip.budget || 'moderate';
  const cityName = cityData?.cityName || cityData?.name || trip.city || 'this city';
  const country = cityData?.country || trip.country || '';

  // ── Seasonal + traveler context (previously dormant) ──
  const seasonalContext = trip.seasonalContext
    || getSeasonalContext(cityData, trip.start_date, trip.end_date);
  const flags = seasonalContext?.flags || {};
  const weatherTolerance = trip.weather_tolerance || null;
  const travelers = trip.travelers || null;
  const mobility = trip.mobility || null;
  const dietary = Array.isArray(trip.dietary) ? trip.dietary : [];
  const hasChildren = !!(travelers && travelers.hasChildren);
  const gentlerDay = hasChildren || !!mobility || !!(travelers && travelers.hasElderly);
  // Skew indoor when it's wet/cold or the traveler wants to avoid rain.
  const avoidWet = !!(flags.rainRisk || flags.coldRisk || weatherTolerance === 'avoid_rain');

  // Families implicitly care about family-friendly stops.
  const interests = hasChildren && !baseInterests.includes('Family Activities')
    ? [...baseInterests, 'Family Activities']
    : baseInterests;

  // ── Gather & score attractions ──
  const rawAttractions = getAttractions(cityData);
  const scored = rawAttractions
    .map(site => {
      const hours = parseOpeningHours(site, startDate);
      return {
        ...site,
        _score: scoreAttraction(site, interests, mustSee, { seasonalContext, flags, avoidWet }),
        _lat: site.latitude || null,
        _lon: site.longitude || null,
        _outdoor: isOutdoor(site),
        _weatherFallback: site.visit_profile?.weather_fallback || null,
        // Parsed opening window {opensAt, closesAt} (hours), for clock scheduling.
        _hours: hours,
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

  // Dedupe by name — some city guides carry duplicate or near-duplicate entries
  // ("Musée Picasso Paris" vs "Musée Picasso–Paris"), which would otherwise
  // schedule the same place twice. Normalize away accents/punctuation/spacing
  // and keep the highest-scored. Falls back to the raw name when normalization
  // would empty the key (e.g. a non-Latin script).
  const seenNames = new Set();
  const uniqueScored = [];
  for (const s of scored) {
    const key = normalizeName(s.name) || (s.name || '').trim().toLowerCase();
    if (key && seenNames.has(key)) continue;
    if (key) seenNames.add(key);
    uniqueScored.push(s);
  }

  const neighborhoods = getNeighborhoods(cityData);
  const culinary = getCulinary(cityData);
  const foodEntries = getFoodEntries(culinary);

  // ── Time slots for the day, adapted to season & travelers ──
  let timeSlots = [...TIME_SLOTS[paceLabel]];
  // Winter / high-latitude: don't schedule sightseeing after dark.
  if (flags.shortDaylight) timeSlots = timeSlots.filter(s => s.time !== 'late_afternoon');
  // Kids / reduced mobility / elderly → one fewer stop for a gentler pace.
  if (gentlerDay) {
    const fromEnd = [...timeSlots].reverse().findIndex(s => s.time !== 'lunch');
    if (fromEnd !== -1 && timeSlots.filter(s => s.time !== 'lunch').length > 1) {
      timeSlots.splice(timeSlots.length - 1 - fromEnd, 1);
    }
  }
  const attractionSlotsPerDay = Math.max(1, timeSlots.filter(s => s.time !== 'lunch').length);

  // ── Select & cluster attractions for the trip ──
  const totalSlots = numDays * attractionSlotsPerDay;
  const selected = uniqueScored.slice(0, Math.min(totalSlots + 4, uniqueScored.length));
  const clusters = clusterByProximity(selected, numDays).map(orderByProximity);

  const days = [];

  /**
   * Pick the best attraction for a time slot from the remaining pool,
   * respecting opening hours and (in hot weather) steering open-air sites away
   * from the midday heat. Falls back to the first available item.
   */
  function pickForSlot(pool, slotTime) {
    const isEarlySlot = slotTime === 'early_morning' || slotTime === 'morning';
    const isLateSlot = slotTime === 'late_afternoon';
    const isHotSlot = slotTime === 'afternoon'; // ~14:00–17:00, peak heat
    for (let i = 0; i < pool.length; i++) {
      const site = pool[i];
      if (isEarlySlot && site._opensLate) continue;
      if (isLateSlot && site._closesEarly) continue;
      // In a heat-risk window prefer indoor sites for the hot afternoon block.
      if (flags.heatRisk && isHotSlot && site._outdoor) continue;
      return pool.splice(i, 1)[0];
    }
    // No ideal match — fall back to first available (no hours data, or all restricted)
    return pool.splice(0, 1)[0];
  }

  // Dietary suffix for food blocks when the lunch entry can't be tag-filtered.
  const dietaryNote = dietary.length ? ` (${dietary.join(', ')}-friendly options nearby)` : '';

  // Honest fallback for cities without a detailed guide yet (no attractions and
  // no neighborhoods). Better than leaving a day as a single "Lunch break".
  const lowData = selected.length === 0 && neighborhoods.length === 0;
  const GENERIC_EXPLORE = [
    { name: `Explore central ${cityName}`, description: `Get oriented in ${cityName} on foot — the historic center, main squares, and riverside.` },
    { name: `${cityName} old town walk`, description: `Wander ${cityName}'s old town: landmark streets, local cafés, and people-watching.` },
    { name: `Viewpoints & markets`, description: `Seek out a viewpoint and a local market to feel the rhythm of ${cityName}.` },
    { name: `Free time in ${cityName}`, description: `An open block to follow your own interests around ${cityName}.` },
  ];

  for (let d = 0; d < numDays; d++) {
    const dayDate = startDate ? new Date(startDate.getTime() + d * MILLISECONDS_IN_DAY) : null;
    // Mutable copy so pickForSlot can splice from it
    const pool = [...(clusters[d] || [])];

    // Event anchoring: a dated festival/holiday landing on THIS calendar day
    // becomes a fixed morning anchor instead of a generic attraction.
    const matchedEvent = (dayDate && seasonalContext)
      ? seasonalContext.events.find(e => e.day === dayDate.getDate())
      : null;
    let eventAnchored = false;

    // Avoid padding the same neighborhood twice in one day.
    const usedHoods = new Set();
    // Seed the generic-explore rotation by day so consecutive sparse days differ.
    let exploreIdx = d;

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
            description: (food?.description || food?.atmosphere || `Explore local cuisine in ${cityName}`) + dietaryNote,
            neighborhood: food?.neighborhood || pool[0]?.neighborhood || null,
            suggestions: food ? [food.name] : [],
            price: food?.price_range || null,
          },
        });
        continue;
      }

      // Place the day's event in the first non-lunch slot.
      if (matchedEvent && !eventAnchored) {
        eventAnchored = true;
        timeBlocks.push({
          time: slot.time,
          startTime: slot.startTime,
          endTime: slot.endTime,
          activity: {
            name: matchedEvent.name,
            type: 'event',
            description: matchedEvent.description || `Special event happening today in ${cityName}.`,
            isEvent: true,
            note: matchedEvent.notes || null,
            date: matchedEvent.date || null,
          },
        });
        continue;
      }

      if (pool.length > 0) {
        const site = pickForSlot(pool, slot.time);
        const activity = {
          name: site.name,
          type: site.type || 'Attraction',
          description: site.description || '',
          duration: site.ratings?.suggested_duration_hours ? `${site.ratings.suggested_duration_hours}h` : '1.5h',
          price: site.price_range || 'Check locally',
          coordinates: site._lat && site._lon ? [site._lon, site._lat] : null,
          bookingUrl: site.official_url || site.website || null,
          neighborhood: site.neighborhood || null,
          outdoor: site._outdoor,
          googlePlaceId: site.googlePlaceId || null,
          // Opening window carried for the optional clock-time pass; ignored by persistence.
          _hours: site._hours || null,
          // Provenance (e.g. 'google_places') so the UI can flag live suggestions.
          _provenance: site._provenance || null,
        };
        // Attach a rainy-day backup for open-air stops when weather is iffy.
        if (avoidWet && site._outdoor && site._weatherFallback) {
          activity.weatherBackup = site._weatherFallback;
        }
        timeBlocks.push({ time: slot.time, startTime: slot.startTime, endTime: slot.endTime, activity });
      } else {
        // Pad with neighborhood exploration — pick one not already used today.
        const hood = neighborhoods.find(h => h?.name && !usedHoods.has(h.name))
          || neighborhoods[d % Math.max(1, neighborhoods.length)];
        if (hood) {
          usedHoods.add(hood.name);
          timeBlocks.push({
            time: slot.time,
            startTime: slot.startTime,
            endTime: slot.endTime,
            activity: {
              name: `Explore ${hood.name}`,
              type: 'neighborhood',
              description: hood.character || `Discover the charm of ${hood.name}`,
              neighborhood: hood.name,
              highlights: Array.isArray(hood.highlights) ? hood.highlights.slice(0, 3) : [],
            },
          });
        } else {
          // No attractions or neighborhoods for this city — keep the day useful
          // with a generic, honest "explore" block rather than only lunch.
          const ex = GENERIC_EXPLORE[exploreIdx % GENERIC_EXPLORE.length];
          exploreIdx += 1;
          timeBlocks.push({
            time: slot.time,
            startTime: slot.startTime,
            endTime: slot.endTime,
            activity: { name: ex.name, type: 'explore', description: ex.description },
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
      weatherNote: buildWeatherNote(seasonalContext),
      tips: [],
    });
  }

  // ── Book immediately ──
  // Must-see items with booking tips, plus weather-dependent / high-cost
  // seasonal experiences and dated events that reward booking ahead.
  const bookImmediately = rawAttractions
    .filter(s => s.booking_tips && mustSee.some(m => (s.name || '').toLowerCase().includes(m)))
    .slice(0, 3)
    .map(s => ({
      type: s.type || 'Attraction',
      title: s.name,
      note: s.booking_tips,
    }));

  if (seasonalContext) {
    for (const exp of seasonalContext.uniqueExperiences) {
      if (bookImmediately.length >= 5) break;
      const pricey = /€\s*\d|expensive|\$\d/.test(String(exp.estimatedCost || ''));
      if ((exp.weatherDependent || pricey) && exp.practicalTips) {
        bookImmediately.push({ type: 'Seasonal experience', title: exp.activity, note: exp.practicalTips });
      }
    }
    for (const ev of seasonalContext.events) {
      if (bookImmediately.length >= 5) break;
      if (ev.notes) bookImmediately.push({ type: 'Event', title: ev.name, note: ev.notes });
    }
  }

  // ── Summary ──
  const allNeighborhoods = [...new Set(days.flatMap(d => d.timeBlocks.map(tb => tb.activity?.neighborhood).filter(Boolean)))];
  let summary;
  if (lowData) {
    summary = `A ${numDays}-day skeleton for ${cityName}${country ? `, ${country}` : ''}. We don't have a detailed attraction guide for ${cityName} yet, so this is a light day-by-day frame to build on.`;
  } else {
    summary = `Your ${numDays}-day ${travelStyle.headline.toLowerCase()} itinerary for ${cityName}${country ? `, ${country}` : ''}. ${selected.length} experiences across ${allNeighborhoods.length || 'several'} neighborhoods.`;
  }
  if (!lowData && seasonalContext?.weather?.highC != null) {
    summary += ` Tuned for ${seasonalContext.month} (~${seasonalContext.weather.highC}°C)`;
    if (flags.heatRisk) summary += ' with indoor-leaning afternoons';
    else if (avoidWet) summary += ' with rainy-day backups';
    else if (flags.shortDaylight) summary += ' with daylight-aware pacing';
    summary += '.';
  }

  return {
    city: cityName,
    country,
    startDate: trip.start_date,
    endDate: trip.end_date,
    travelStyle,
    summary,
    bookImmediately,
    days,
    seasonal: seasonalContext ? {
      month: seasonalContext.month,
      weather: seasonalContext.weather,
      crowds: seasonalContext.crowds,
      flags,
      weatherNote: buildWeatherNote(seasonalContext),
    } : null,
    meta: {
      totalAttractions: selected.length,
      neighborhoods: allNeighborhoods,
      mustSeeCompleted: mustSee,
      lowData,
    },
  };
}

export async function buildItineraryWithRouting(trip, cityData, options = {}) {
  // Optional live Google Places fallback for cities without a curated attraction
  // guide: pull real nearby POIs so the day isn't generic "Explore central X".
  let effectiveCityData = cityData;
  if (process.env.ITINERARY_PLACES_FALLBACK === 'true' && getAttractions(cityData).length === 0) {
    try {
      const { getFallbackAttractions } = await import('./placesFallback.js');
      const fb = await getFallbackAttractions(trip.city);
      if (fb && fb.length) effectiveCityData = { ...cityData, attractions: fb };
    } catch (err) {
      console.warn('[buildItineraryWithRouting] places fallback skipped:', err?.message || err);
    }
  }

  let itinerary = buildItinerary(trip, effectiveCityData);

  // Optional grounded LLM curation: replace the deterministic day content with an
  // LLM-sequenced plan drawn from the SAME candidate pool. Runs before routing so
  // travel times + clock times reflect the curated picks. Falls back silently to
  // the deterministic days on no key / disabled / timeout / sparse pool.
  if (process.env.ITINERARY_LLM_CURATE === 'true') {
    try {
      const { curateCityDays } = await import('./curateCityDays.js');
      const curatedDays = await curateCityDays(trip, effectiveCityData, itinerary);
      if (curatedDays) itinerary = { ...itinerary, days: curatedDays, _curated: true };
    } catch (err) {
      console.warn('[buildItineraryWithRouting] curation skipped:', err?.message || err);
    }
  }

  let routed = itinerary;
  if (options.routeOptimization !== false) {
    const { applyGoogleRouteOrdering } = await import('./googleRouteOrdering.js');
    routed = await applyGoogleRouteOrdering(itinerary, {
      travelMode: options.travelMode || 'WALK',
    });
  }

  // Optional realistic clock times (duration + travel + opening-hours aware).
  // Off by default — the builder's fixed templates remain the baseline.
  if (process.env.ITINERARY_CLOCK_TIMES === 'true') {
    const { assignClockTimes } = await import('./assignClockTimes.js');
    const pace = typeof trip.pace === 'number' ? trip.pace : 50;
    return assignClockTimes(routed, { pace: getPaceLabel(pace) });
  }

  return routed;
}
