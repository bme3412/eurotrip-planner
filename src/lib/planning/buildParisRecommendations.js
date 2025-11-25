import fs from 'fs';
import path from 'path';
import { getTravelStyleForPace } from './travelStyles.js';

const FALLBACK_INTERESTS = ['Art & Design', 'History', 'Food & Wine'];

const MILLISECONDS_IN_DAY = 1000 * 60 * 60 * 24;
const DEFAULT_WALK_KMH = 4.8;
const DEFAULT_TRANSIT_KMH = 18;

let cachedZoneData = null;
let cachedTravelMatrix = null;

const ATTRACTION_URL_OVERRIDES = new Map([
  ['Sainte-Chapelle', 'https://www.sainte-chapelle.fr/en'],
  ['Louvre Museum', 'https://www.louvre.fr/en'],
  ['Conciergerie', 'https://www.paris-conciergerie.fr/'],
  ['Musée de l’Orangerie', 'https://www.musee-orangerie.fr/en'],
]);

function loadZoneData() {
  if (cachedZoneData) return cachedZoneData;
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'France', 'paris', 'paris_zones.json');
    const raw = fs.readFileSync(filePath, 'utf-8');
    const json = JSON.parse(raw);
    const zoneMap = new Map();
    (json.arrondissement_zones || []).forEach((zone) => zoneMap.set(zone.id, zone));
    cachedZoneData = {
      map: zoneMap,
      clusters: json.proximity_clusters || [],
    };
  } catch (error) {
    console.warn('Zone data unavailable; continuing without zone heuristics.', error.message);
    cachedZoneData = { map: new Map(), clusters: [] };
  }
  return cachedZoneData;
}

function loadTravelMatrix() {
  if (cachedTravelMatrix) return cachedTravelMatrix;
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'France', 'paris', 'paris_travel_matrix.json');
    const raw = fs.readFileSync(filePath, 'utf-8');
    const json = JSON.parse(raw);
    cachedTravelMatrix = json.matrix || {};
  } catch (error) {
    console.warn('Travel matrix unavailable; using distance approximations only.', error.message);
    cachedTravelMatrix = {};
  }
  return cachedTravelMatrix;
}

function estimateMinutes(distanceKm, speedKmh) {
  if (!distanceKm || !speedKmh) return null;
  return Math.round((distanceKm / speedKmh) * 60);
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function haversineDistanceKm(from, to) {
  if (!from || !to) return null;
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const dLat = toRadians(to.lat - from.lat);
  const dLon = toRadians(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371 * c;
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateLabel(date) {
  if (!date) return 'Flexible date';
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function computeTripLength(start, end) {
  if (!start || !end) return 3;
  const diff = Math.round((end - start) / MILLISECONDS_IN_DAY);
  return Math.max(1, Math.min(7, diff + 1));
}

function scoreAttraction(site) {
  const cultural = site?.ratings?.cultural_significance ?? 3;
  const duration = site?.ratings?.suggested_duration_hours ?? 2;
  return cultural * 10 - duration;
}

function toAttractionRecommendation(site) {
  return {
    kind: 'attraction',
    name: site.name,
    subtitle: site.type,
    description: site.description,
    bestTime: site.best_time,
    price: site.price_range,
    bookingTips: site.booking_tips,
    coordinates: site.latitude && site.longitude ? { lat: site.latitude, lng: site.longitude } : null,
    durationHours: site?.ratings?.suggested_duration_hours ?? null,
    url: site.official_url || site.website || ATTRACTION_URL_OVERRIDES.get(site.name) || null,
  };
}

const INTEREST_MATCHERS = {
  'Art & Design': (site) => {
    const type = site.type?.toLowerCase() || '';
    const desc = site.description?.toLowerCase() || '';
    return (
      ['museum', 'gallery', 'art', 'design', 'architecture', 'opera'].some((keyword) =>
        type.includes(keyword)
      ) || desc.includes('art') || desc.includes('design')
    );
  },
  History: (site) => {
    const type = site.type?.toLowerCase() || '';
    return ['museum', 'monument', 'historic', 'palace', 'cathedral', 'church'].some((keyword) =>
      type.includes(keyword)
    );
  },
  'Parks & Outdoors': (site) => {
    const type = site.type?.toLowerCase() || '';
    const desc = site.description?.toLowerCase() || '';
    return (
      ['park', 'garden', 'canal', 'island', 'outdoor', 'river'].some((keyword) =>
        type.includes(keyword)
      ) ||
      desc.includes('park') ||
      desc.includes('garden') ||
      desc.includes('river') ||
      desc.includes('canal')
    );
  },
  'Hidden Gems': (site) => {
    const score = site?.ratings?.cultural_significance ?? 3;
    const price = site.price_range || '';
    return score <= 3 && price !== 'Expensive';
  },
  'Family Friendly': (site) => {
    const type = site.type?.toLowerCase() || '';
    const desc = site.description?.toLowerCase() || '';
    const duration = site?.ratings?.suggested_duration_hours ?? 2;
    return (
      ['museum', 'science', 'park', 'garden', 'zoo', 'aquarium'].some((keyword) => type.includes(keyword)) ||
      desc.includes('family') ||
      desc.includes('kids') ||
      duration <= 2
    );
  },
  'Fashion & Shopping': (site) => {
    const desc = site.description?.toLowerCase() || '';
    const type = site.type?.toLowerCase() || '';
    return (
      desc.includes('boutique') ||
      desc.includes('shopping') ||
      desc.includes('fashion') ||
      ['market', 'district'].some((keyword) => type.includes(keyword))
    );
  },
};

function getAttractionsArray(cityData) {
  if (!cityData) return [];
  if (Array.isArray(cityData.attractions)) return cityData.attractions;
  if (Array.isArray(cityData.attractions?.sites)) return cityData.attractions.sites;
  return [];
}

function getNeighborhoodsArray(cityData) {
  if (!cityData) return [];
  if (Array.isArray(cityData.neighborhoods)) return cityData.neighborhoods;
  if (Array.isArray(cityData.neighborhoods?.neighborhoods)) return cityData.neighborhoods.neighborhoods;
  return [];
}

function getCulinaryGuide(cityData) {
  if (!cityData) return {};
  const guide = cityData.culinary;
  if (guide && typeof guide === 'object') return guide;
  return {};
}

function minutesToHours(minutes) {
  if (!minutes) return null;
  return Number((minutes / 60).toFixed(2));
}

function toFoodRecommendation(entry, defaults = {}) {
  if (!entry) return null;

  const descriptionBits = [];
  if (entry.atmosphere) descriptionBits.push(entry.atmosphere);
  if (entry.local_tips) descriptionBits.push(entry.local_tips);
  if (entry.description && !descriptionBits.length) descriptionBits.push(entry.description);

  const bestTime = entry.best_time || entry.best_time_window || defaults.bestTime || null;
  const bookingTips = entry.booking_tips || (entry.reservation_needed ? 'Reservations recommended.' : null);
  const durationHours = minutesToHours(entry.duration_minutes) || defaults.durationHours || null;
  const idealBlock = entry.visit_profile?.ideal_time_block || (bestTime ? `${bestTime} visit` : defaults.idealBlock || null);

  const visitProfile = entry.visit_profile || {
    ideal_time_block: idealBlock,
    min_duration_hours: durationHours,
    max_duration_hours: durationHours,
    weather_fallback: entry.weather_fallback || null,
  };

  return enrichWithZoneMetadata(
    {
      kind: defaults.kind || 'food',
      name: entry.name,
      subtitle: entry.cuisine_type || entry.type || defaults.subtitle || null,
      description: descriptionBits.join(' ').trim() || entry.description || defaults.description || '',
      bestTime,
      price: entry.price_range || entry.budget || defaults.price || null,
      bookingTips,
      coordinates:
        typeof entry.latitude === 'number' && typeof entry.longitude === 'number'
          ? { lat: entry.latitude, lng: entry.longitude }
          : null,
      durationHours,
      url: entry.booking_url || entry.website || entry.reservation_url || defaults.url || null,
      visitProfile,
    },
    entry
  );
}

function enrichWithZoneMetadata(recommendation, site) {
  if (!recommendation || !site) return recommendation;
  const zones = loadZoneData();
  const zoneId = site.arrondissement || site.zone_id || null;
  const zoneInfo = zoneId ? zones.map.get(zoneId) : null;
  return {
    ...recommendation,
    arrondissement: site.arrondissement || null,
    neighborhood: site.neighborhood || null,
    openingHours: site.opening_hours || null,
    transit: site.transit || null,
    visitProfile: site.visit_profile || null,
    zone_id: zoneInfo?.id || zoneId,
    zone_centroid: zoneInfo?.centroid || null,
    zone_radius_km: zoneInfo?.max_radius_km || null,
    zone_neighbors: zoneInfo?.nearest_zones || [],
  };
}

function filterAttractionsByInterest(attractions = [], interest) {
  const matcher = INTEREST_MATCHERS[interest];
  let matches = matcher ? attractions.filter(matcher) : attractions.slice();
  if (matches.length === 0) {
    matches = attractions.slice();
  }
  return matches
    .map((site) => ({ site, score: scoreAttraction(site) }))
    .sort((a, b) => b.score - a.score)
    .map(({ site }) => enrichWithZoneMetadata(toAttractionRecommendation(site), site));
}

function flattenRestaurants(guide = {}) {
  const sections = guide.restaurants || {};
  const collections = ['fine_dining', 'casual_dining', 'street_food'];
  const items = [];
  collections.forEach((key) => {
    const list = sections[key];
    if (Array.isArray(list)) {
      list.forEach((restaurant) => {
        const rec = toFoodRecommendation(restaurant, {
          kind: 'food',
          subtitle: restaurant.cuisine_type,
          idealBlock: key === 'fine_dining' ? 'Dinner pause' : key === 'casual_dining' ? 'Lunch pause' : 'Quick bite',
        });
        if (rec) items.push(rec);
      });
    }
  });
  return items;
}

function flattenBars(guide = {}) {
  const bars = guide?.bars_and_cafes?.bars;
  if (!Array.isArray(bars)) return [];
  return bars
    .map((bar) =>
      toFoodRecommendation(bar, {
        kind: 'nightlife',
        subtitle: bar.vibe || bar.type || 'Bar',
        idealBlock: 'Evening unwind',
      })
    )
    .filter(Boolean);
}

function flattenCoffeeShops(guide = {}) {
  const coffees = guide?.bars_and_cafes?.coffee_shops;
  if (!Array.isArray(coffees)) return [];
  return coffees
    .map((shop) =>
      toFoodRecommendation(shop, {
        kind: 'cafe',
        subtitle: shop.specialty || 'Coffee & pastries',
        idealBlock: 'Coffee break',
        description: shop.description,
      })
    )
    .filter(Boolean);
}

function flattenMarketsAndTours(guide = {}) {
  const items = [];
  const experiences = guide.food_experiences || {};
  ['food_tours', 'cooking_classes', 'markets'].forEach((key) => {
    const list = experiences[key];
    if (!Array.isArray(list)) return;
    list.forEach((entry) => {
      const rec = toFoodRecommendation(entry, {
        kind: key === 'markets' ? 'market' : 'experience',
        subtitle: entry.cuisine || entry.type || key,
        idealBlock: key === 'markets' ? 'Morning stroll' : 'Afternoon session',
      });
      if (rec) items.push(rec);
    });
  });
  return items;
}

function buildFoodPool(cityData) {
  const guide = getCulinaryGuide(cityData);
  const pools = [
    ...flattenRestaurants(guide),
    ...flattenCoffeeShops(guide),
    ...flattenBars(guide),
    ...flattenMarketsAndTours(guide),
  ];

  const seen = new Map();
  const deduped = [];
  pools.forEach((item) => {
    if (!item || !item.name) return;
    const key = item.name.toLowerCase();
    if (seen.has(key)) return;
    seen.set(key, true);
    deduped.push(item);
  });
  return deduped;
}

function neighborhoodsByCategory(neighborhoods = [], categoryKey, threshold = 4) {
  return neighborhoods
    .filter((nb) => (nb.categories?.[categoryKey] ?? 0) >= threshold)
    .map((nb) => ({
      kind: 'neighborhood',
      name: nb.name,
      subtitle: nb.character,
      description:
        nb.appeal?.known_for?.join(', ') ||
        nb.highlights?.attractions?.slice(0, 2).map((item) => item.name).join(', ') ||
        nb.character,
      bestTime: nb.practical_info?.best_time_to_visit,
      location: nb.location?.description,
      cues: nb.appeal?.best_for || [],
    }));
}

function familyFriendlyNeighborhoods(neighborhoods = []) {
  const picks = [];
  neighborhoods.forEach((nb) => {
    const activities = nb.highlights?.activities || [];
    const hasFamilyActivity = activities.some((item) =>
      Array.isArray(item.suitable_for) ? item.suitable_for.includes('Families') || item.suitable_for.includes('Kids') : false
    );
    if (hasFamilyActivity) {
      picks.push({
        kind: 'neighborhood',
        name: nb.name,
        subtitle: 'Easy-going days',
        description:
          activities
            .filter((item) => Array.isArray(item.suitable_for) && item.suitable_for.includes('Families'))
            .map((item) => item.name)
            .slice(0, 3)
            .join(', ') || nb.character,
        bestTime: nb.practical_info?.best_time_to_visit,
        location: nb.location?.description,
        cues: ['Playful stops', 'Kid-approved bites'],
      });
    }
  });
  return picks;
}

function hiddenGemNeighborhoods(neighborhoods = []) {
  return neighborhoods
    .filter((nb) => (nb.categories?.touristy ?? 0) <= 3)
    .map((nb) => ({
      kind: 'neighborhood',
      name: nb.name,
      subtitle: 'Off-the-radar pocket',
      description: nb.character,
      bestTime: nb.practical_info?.best_time_to_visit,
      location: nb.location?.description,
      cues: nb.appeal?.best_for || [],
    }));
}

function dedupeByName(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item?.name) return false;
    const key = item.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildInterestHighlights(interests, cityData) {
  const attractions = getAttractionsArray(cityData);
  const neighborhoods = getNeighborhoodsArray(cityData);
  const culinary = getCulinaryGuide(cityData);

  return interests.map((interest) => {
    let items = [];

    switch (interest) {
      case 'Food & Wine':
        items = flattenRestaurants(culinary);
        break;
      case 'Nightlife':
        items = flattenBars(culinary);
        if (items.length < 3) {
          items = items.concat(neighborhoodsByCategory(neighborhoods, 'nightlife', 4));
        }
        break;
      case 'Fashion & Shopping':
        items = neighborhoodsByCategory(neighborhoods, 'shopping', 4);
        if (items.length < 3) {
          items = items.concat(filterAttractionsByInterest(attractions, interest));
        }
        break;
      case 'Parks & Outdoors':
        items = filterAttractionsByInterest(attractions, interest);
        if (items.length < 3) {
          items = items.concat(neighborhoodsByCategory(neighborhoods, 'green_spaces', 4));
        }
        break;
      case 'Family Friendly':
        items = filterAttractionsByInterest(attractions, interest);
        items = items.concat(familyFriendlyNeighborhoods(neighborhoods));
        break;
      case 'Hidden Gems':
        items = filterAttractionsByInterest(attractions, interest);
        items = items.concat(hiddenGemNeighborhoods(neighborhoods));
        break;
      default:
        items = filterAttractionsByInterest(attractions, interest);
        break;
    }

    const uniquePicks = dedupeByName(items).slice(0, 6);

    return {
      interest,
      items: uniquePicks,
    };
  });
}

function fallbackIconicAttractions(cityData, limit = 12) {
  const attractions = getAttractionsArray(cityData);
  return attractions
    .map((site) => ({ site, score: scoreAttraction(site) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ site }) => enrichWithZoneMetadata(toAttractionRecommendation(site), site));
}

const STYLE_SLOT_TEMPLATES = {
  unhurried: [
    { type: 'attraction', label: 'Late morning anchor' },
    { type: 'food', label: 'Lunch pause' },
    { type: 'attraction', label: 'Afternoon discovery' },
  ],
  balanced: [
    { type: 'attraction', label: 'Morning anchor' },
    { type: 'food', label: 'Lunch stop' },
    { type: 'attraction', label: 'Afternoon discovery' },
    { type: 'food', label: 'Evening table' },
  ],
  energized: [
    { type: 'attraction', label: 'Morning anchor' },
    { type: 'food', label: 'Coffee refuel' },
    { type: 'attraction', label: 'Midday discovery' },
    { type: 'food', label: 'Dinner reservation' },
    { type: 'attraction', label: 'Evening crescendo' },
  ],
};

const STYLE_ZONE_LIMIT = {
  unhurried: 1,
  balanced: 2,
  energized: 3,
};

function availableZones(zoneBuckets) {
  return [...zoneBuckets.entries()].filter(([, items]) => items.length > 0);
}

function getNeighborZoneIds(zoneId) {
  if (!zoneId) return [];
  const zones = loadZoneData();
  const zone = zones.map.get(zoneId);
  if (!zone || !Array.isArray(zone.nearest_zones)) return [];
  return zone.nearest_zones.map((neighbor) => neighbor.id);
}

function chooseNextZone({ preferredZoneId, usedZones, maxZones, zoneBuckets }) {
  const candidates = availableZones(zoneBuckets);
  if (candidates.length === 0) return null;
  const candidateMap = new Map(candidates);

  if (preferredZoneId && candidateMap.get(preferredZoneId)?.length) {
    return preferredZoneId;
  }

  const usedDistinct = usedZones.filter(Boolean);
  const zoneLimitReached = usedDistinct.length >= maxZones;
  const lastUsed = usedDistinct[usedDistinct.length - 1] || preferredZoneId || null;

  if (!zoneLimitReached && lastUsed) {
    const neighbors = getNeighborZoneIds(lastUsed);
    for (const neighborId of neighbors) {
      if (candidateMap.get(neighborId)?.length && !usedDistinct.includes(neighborId)) {
        return neighborId;
      }
    }
  }

  if (!zoneLimitReached) {
    let best = null;
    for (const [id, items] of candidates) {
      if (usedDistinct.includes(id)) continue;
      if (!best || items.length > best.items.length) {
        best = { id, items };
      }
    }
    if (best) return best.id;
  }

  for (const id of usedDistinct) {
    if (candidateMap.get(id)?.length) return id;
  }

  return candidates[0][0];
}

function lookupTravelInfo(fromItem, toItem) {
  if (!fromItem || !toItem) return null;
  const matrix = loadTravelMatrix();
  const row = matrix[fromItem.name];
  const info = row?.[toItem.name];
  if (info) return info;

  const fromCoords = fromItem.coordinates;
  const toCoords = toItem.coordinates;
  if (fromCoords && toCoords) {
    const distanceKm = haversineDistanceKm(fromCoords, toCoords);
    if (distanceKm != null) {
      return {
        distance_km: Number(distanceKm.toFixed(2)),
        walking_minutes: estimateMinutes(distanceKm, DEFAULT_WALK_KMH),
        transit_minutes: estimateMinutes(distanceKm, DEFAULT_TRANSIT_KMH),
        fallback: true,
      };
    }
  }

  return null;
}

function buildDayPlans({ trip, interests, cityData, style }) {
  const start = parseDate(trip.start_date);
  const end = parseDate(trip.end_date);
  const duration = computeTripLength(start, end);
  const styleId = style?.id || 'balanced';
  const slotTemplate = STYLE_SLOT_TEMPLATES[styleId] || STYLE_SLOT_TEMPLATES.balanced;
  const maxZoneMoves = STYLE_ZONE_LIMIT[styleId] ?? 2;

  const attractionPool = [];
  interests.forEach((bucket) => {
    bucket.items.forEach((item) => {
      if (item.kind === 'attraction') {
        attractionPool.push(item);
      }
    });
  });

  if (attractionPool.length < duration * 3) {
    const extras = fallbackIconicAttractions(cityData, duration * 4);
    attractionPool.push(...extras);
  }

  const uniqueAttractions = dedupeByName(attractionPool);
  const attractionZoneBuckets = new Map();
  uniqueAttractions.forEach((item) => {
    const zoneKey = item.zone_id || item.arrondissement || 'unknown';
    if (!attractionZoneBuckets.has(zoneKey)) {
      attractionZoneBuckets.set(zoneKey, []);
    }
    attractionZoneBuckets.get(zoneKey).push(item);
  });

  const foodPool = buildFoodPool(cityData);
  const uniqueFood = dedupeByName(foodPool);
  const foodZoneBuckets = new Map();
  uniqueFood.forEach((item) => {
    const zoneKey = item.zone_id || item.arrondissement || 'unknown';
    if (!foodZoneBuckets.has(zoneKey)) {
      foodZoneBuckets.set(zoneKey, []);
    }
    foodZoneBuckets.get(zoneKey).push(item);
  });

  const pullFromBucket = (zoneId, buckets) => {
    if (!zoneId) return null;
    const bucket = buckets.get(zoneId);
    if (!bucket || bucket.length === 0) return null;
    return bucket.shift();
  };

  const pullAnyFromBucket = (buckets) => {
    const candidates = availableZones(buckets);
    if (candidates.length === 0) return null;
    const [zoneId] = candidates[0];
    return pullFromBucket(zoneId, buckets);
  };

  const days = [];
  let previousZoneId = null;
  let previousStop = null;

  for (let i = 0; i < duration; i++) {
    const dayDate = start ? new Date(start.getTime() + i * MILLISECONDS_IN_DAY) : null;
    const dayLabel = formatDateLabel(dayDate);
    const dayTheme = interests[i % interests.length]?.interest ?? 'Highlights';
    const zonesUsed = [];
    const blocks = [];
    previousStop = null;

    for (const slotDefinition of slotTemplate) {
      const isFoodSlot = slotDefinition.type === 'food';
      const buckets = isFoodSlot ? foodZoneBuckets : attractionZoneBuckets;
      const zoneId = chooseNextZone({
        preferredZoneId: previousZoneId,
        usedZones: zonesUsed,
        maxZones: maxZoneMoves,
        zoneBuckets: buckets,
      });
      let nextItem = zoneId ? pullFromBucket(zoneId, buckets) : pullAnyFromBucket(buckets);
      if (!nextItem) {
        // fall back to the other pool if available (avoid leaving slot empty)
        const fallbackBuckets = isFoodSlot ? attractionZoneBuckets : foodZoneBuckets;
        const fallbackZoneId = chooseNextZone({
          preferredZoneId: previousZoneId,
          usedZones: zonesUsed,
          maxZones: maxZoneMoves,
          zoneBuckets: fallbackBuckets,
        });
        nextItem = fallbackZoneId ? pullFromBucket(fallbackZoneId, fallbackBuckets) : pullAnyFromBucket(fallbackBuckets);
        if (!nextItem) break;
      }

      const effectiveZoneId = nextItem.zone_id || nextItem.arrondissement || zoneId || 'unknown';

      if (effectiveZoneId && !zonesUsed.includes(effectiveZoneId)) {
        zonesUsed.push(effectiveZoneId);
      }
      previousZoneId = effectiveZoneId || previousZoneId;

      let transfer = null;
      if (previousStop) {
        transfer = lookupTravelInfo(previousStop, nextItem);
      }

      blocks.push({
        slot: slotDefinition.label,
        slotType: slotDefinition.type,
        item: nextItem,
        transferMinutes:
          transfer?.walking_minutes ?? transfer?.transit_minutes ?? null,
        longTransfer:
          transfer?.walking_minutes != null ? transfer.walking_minutes > 35 : false,
        transferDistanceKm: transfer?.distance_km ?? null,
        transferFrom: previousStop ? previousStop.name : null,
      });

      previousStop = nextItem;
    }

    if (blocks.length === 0) {
      break;
    }

    const supporting = [];

    const mapPoints = blocks
      .map(({ item }) =>
        item.coordinates && item.kind === 'attraction'
          ? { lat: item.coordinates.lat, lng: item.coordinates.lng, label: item.name }
          : null
      )
      .filter(Boolean);

    days.push({
      date: dayLabel,
      theme: dayTheme,
      blocks,
      supporting,
      mapPoints,
      zones: zonesUsed,
    });
  }

  return days;
}

function deriveBookImmediately(prebookings = {}) {
  const reminders = [];
  if (!prebookings.flights?.booked) {
    reminders.push({
      type: 'travel',
      title: 'Lock in flights',
      note: 'Airfares to Paris spike 6–8 weeks out. Booking now keeps your arrival time aligned with the itinerary windows we built.',
    });
  }
  if (!prebookings.hotel?.booked) {
    reminders.push({
      type: 'hotel',
      title: 'Secure your stay',
      note: 'Anchor your lodging so we can fine-tune walking routes and late-night dining suggestions around your arrondissement.',
    });
  }
  if (!prebookings.activities?.booked) {
    reminders.push({
      type: 'ticket',
      title: 'Reserve key experiences',
      note: 'Iconic Paris tickets (Louvre, Seine cruise, Moulin Rouge) disappear fast—grab slots so we can weave them into the right day.',
    });
  }
  return reminders;
}

function buildSummary({ trip, style, interests, duration }) {
  const interestList = interests.length ? interests.join(', ') : 'Paris highlights';
  const hotelContext = trip.hotel_location ? ` with stays near ${trip.hotel_location}` : '';
  return `We mapped a ${duration}-day Paris escape around your ${interestList} wishlist, matching the plan to your ${style.headline.toLowerCase()} pace${hotelContext}.`;
}

export function buildParisRecommendations(trip, cityData) {
  if (!trip) {
    throw new Error('Trip payload is required to build recommendations.');
  }

  const interests = Array.isArray(trip.interests) && trip.interests.length > 0 ? trip.interests : FALLBACK_INTERESTS;
  const interestBuckets = buildInterestHighlights(interests, cityData);
  const style = getTravelStyleForPace(trip.pace);
  const days = buildDayPlans({ trip, interests: interestBuckets, cityData, style });
  const summary = buildSummary({
    trip,
    style,
    interests,
    duration: days.length,
  });

  return {
    summary,
    interests: interestBuckets,
    travelStyle: style,
    days,
    bookImmediately: deriveBookImmediately(trip.prebookings),
  };
}
