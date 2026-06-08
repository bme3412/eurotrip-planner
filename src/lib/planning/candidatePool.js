/**
 * Shared candidate pool for itinerary generation.
 *
 * Normalizes a city's heterogeneous guide data (attractions, curated
 * experiences, food venues) into one flat, scored, deduped list of candidates,
 * each with a stable opaque `ref` id and a ready-to-place `activity` object.
 *
 * This is the grounding substrate for the LLM curator (curateCityDays): the
 * model only ever references candidates by `ref`; code resolves a ref back to
 * its real `activity` (coords / price / hours / url / type), so the model can
 * sequence the day but cannot invent a place. Scoring reuses the same
 * `scoreAttraction` the deterministic builder uses, so curator and fallback
 * draw from an identically-ranked pool.
 */
import {
  getAttractions,
  getNeighborhoods,
  getCulinary,
  getFoodEntries,
  scoreAttraction,
  isOutdoor,
  parseOpeningHours,
  normalizeName,
} from './buildItinerary.js';

/** A site's suggested duration as a label like "1.5h"; falls back to 90 min. */
function durationLabel(site) {
  const hrs = site?.ratings?.suggested_duration_hours;
  if (Number.isFinite(hrs) && hrs > 0) return `${hrs}h`;
  const mins = site?.duration_minutes;
  if (Number.isFinite(mins) && mins > 0) return `${Math.round((mins / 60) * 10) / 10}h`;
  return '1.5h';
}

function coordsOf(site) {
  const lat = site.latitude ?? site.lat ?? null;
  const lon = site.longitude ?? site.lon ?? null;
  if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon };
  return null;
}

/** Build the placeable activity object for an attraction/experience candidate. */
function attractionActivity(site, c, parsedHours) {
  return {
    name: site.name,
    type: site.type || 'Attraction',
    description: site.description || '',
    duration: durationLabel(site),
    price: site.price_range || 'Check locally',
    coordinates: c ? [c.lon, c.lat] : null,
    bookingUrl: site.official_url || site.website || site.booking_url || site.ticket_url || null,
    neighborhood: site.neighborhood || site.district || site.arrondissement || null,
    outdoor: isOutdoor(site),
    _hours: parsedHours,
    _provenance: site._provenance || 'attraction',
  };
}

/** Build the placeable activity object for a food candidate (placed at meals). */
function foodActivity(food, c) {
  const bits = [];
  if (food.cuisine_type) bits.push(food.cuisine_type);
  if (food.atmosphere) bits.push(food.atmosphere);
  if (Array.isArray(food.signature_dishes) && food.signature_dishes.length) {
    bits.push(`Known for ${food.signature_dishes.slice(0, 2).join(', ')}`);
  }
  return {
    name: food.name,
    type: 'food_recommendation',
    description: food.description || bits.join('. ') || '',
    duration: '1h',
    price: food.price_range || null,
    coordinates: c ? [c.lon, c.lat] : null,
    bookingUrl: food.booking_url || null,
    neighborhood: food.neighborhood || food.location || null,
    michelinStars: food.michelin_stars || null,
    bookingRequired: !!food.reservation_needed,
    _provenance: 'culinary',
  };
}

/** Crude 0–100 score for a food venue so the pool can rank/cap meals. */
function scoreFood(food, interests) {
  let score = 30;
  if (food.michelin_stars) score += food.michelin_stars * 15;
  if (Array.isArray(food.signature_dishes)) score += Math.min(10, food.signature_dishes.length * 3);
  if (interests.includes('Food & Drink') || interests.includes('Food & Wine')) score += 15;
  return score;
}

/** Pull experience items out of the {categories:{Morning:[...]}} shape. */
function flattenExperiences(experiences) {
  const cats = experiences?.categories;
  if (!cats || typeof cats !== 'object') return [];
  return Object.values(cats).flat().filter((x) => x && x.name);
}

/**
 * Build the candidate pool for a city.
 *
 * @param {Object} cityData - from getCityData()
 * @param {Object} [opts]
 * @param {Object} [opts.trip] - { interests, must_see, start_date }
 * @param {Object} [opts.seasonalContext]
 * @param {Object} [opts.experiences] - from getCityExperiences() (optional, 17 cities)
 * @param {number} [opts.limit] - cap on attraction/experience candidates
 * @returns {{ candidates: Array, byRef: Map, attractions: Array, food: Array }}
 */
export function buildCandidatePool(cityData, opts = {}) {
  const trip = opts.trip || {};
  const interests = Array.isArray(trip.interests) ? trip.interests : [];
  const mustSee = Array.isArray(trip.must_see) ? trip.must_see : [];
  const season = opts.seasonalContext
    ? { seasonalContext: opts.seasonalContext, flags: opts.seasonalContext.flags || {} }
    : {};
  const startDate = trip.start_date ? new Date(`${trip.start_date}T00:00:00`) : null;
  const limit = opts.limit ?? 28;

  const seen = new Set();
  const attractions = [];

  const addSighting = (site, baseScore, provenance) => {
    if (!site?.name) return;
    const key = normalizeName(site.name) || site.name.trim().toLowerCase();
    if (key && seen.has(key)) return;
    if (key) seen.add(key);
    const c = coordsOf(site);
    const parsedHours = parseOpeningHours(site, startDate);
    const tagged = { ...site, _provenance: site._provenance || provenance };
    attractions.push({
      score: baseScore,
      outdoor: isOutdoor(site),
      hours: parsedHours,
      neighborhood: site.neighborhood || site.district || site.arrondissement || null,
      durationLabel: durationLabel(site),
      activity: attractionActivity(tagged, c, parsedHours),
    });
  };

  // Curated attractions (primary signal, real significance scores).
  for (const site of getAttractions(cityData)) {
    addSighting(site, scoreAttraction(site, interests, mustSee, season), 'attraction');
  }

  // Curated experiences (bonus; only ~17 cities). Score off total_score.
  for (const x of flattenExperiences(opts.experiences)) {
    const total = x?.scores?.total_score;
    const base = Number.isFinite(total) ? total * 10 : 45;
    const interestBoost = interests.some((i) =>
      (x.themes || []).some((th) => String(th).toLowerCase().includes(String(i).toLowerCase().split(' ')[0])),
    ) ? 15 : 0;
    addSighting({ ...x, type: x.type || (x.themes && x.themes[0]) || 'experience' }, base + interestBoost, 'experience');
  }

  attractions.sort((a, b) => b.score - a.score);
  const topAttractions = attractions.slice(0, limit);

  // Food venues (placed at meal slots, ranked separately).
  const foodSeen = new Set();
  const food = [];
  for (const f of getFoodEntries(getCulinary(cityData))) {
    if (!f?.name) continue;
    const key = normalizeName(f.name) || f.name.trim().toLowerCase();
    if (key && foodSeen.has(key)) continue;
    if (key) foodSeen.add(key);
    food.push({
      score: scoreFood(f, interests),
      neighborhood: f.neighborhood || f.location || null,
      activity: foodActivity(f, coordsOf(f)),
    });
  }
  food.sort((a, b) => b.score - a.score);
  const topFood = food.slice(0, Math.max(12, limit / 2));

  // Assign stable refs and index by ref.
  const candidates = [];
  const byRef = new Map();
  topAttractions.forEach((cand, i) => {
    const ref = `a${i + 1}`;
    const entry = { ref, kind: 'sight', ...cand };
    candidates.push(entry);
    byRef.set(ref, entry);
  });
  topFood.forEach((cand, i) => {
    const ref = `f${i + 1}`;
    const entry = { ref, kind: 'food', ...cand };
    candidates.push(entry);
    byRef.set(ref, entry);
  });

  return { candidates, byRef, attractions: topAttractions, food: topFood };
}
