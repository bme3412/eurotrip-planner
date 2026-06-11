/**
 * Grounded LLM curator for one city's days.
 *
 * The deterministic builder (buildItinerary) picks activities by keyword score +
 * proximity clustering and fills fixed slots. This pass keeps the builder's day
 * SCAFFOLD (count, dates, slots, weather notes, events) but lets an LLM choose
 * and sequence WHICH real candidate fills each open slot — producing varied,
 * neighborhood-coherent days with food placed sensibly, plus a theme + summary
 * (so it also subsumes the prose-polish enrich pass for the days it handles).
 *
 * Grounding contract: the model may only reference candidates by their opaque
 * `ref` id (from buildCandidatePool). Code resolves refs → real activity records;
 * unknown/duplicate refs are dropped and backfilled deterministically from the
 * pool. Nothing about a place (name/coords/price/hours/url) comes from the model.
 *
 * Never throws. No API key / disabled / timeout / invalid output / too-sparse a
 * pool → returns null, and the caller keeps the deterministic days.
 */
import { getAnthropicClient } from '@/lib/llm/clients';
import { logLlmUsage } from '@/lib/llm/usageLog';

import { buildCandidatePool } from './candidatePool.js';
import { getSeasonalContext } from './seasonalContext.js';
import { getCityExperiences } from '../data-utils.js';
import { normalizeName } from './buildItinerary.js';

const MODEL = 'claude-sonnet-4-6';
// Selection is higher-value than the prose-polish pass, so it gets a longer
// budget. Calls fan out per-city in parallel, so this is ~the whole pass's
// wall-clock regardless of trip length.
const TIMEOUT_MS = 30_000;
const MIN_SIGHTS = 3; // below this a city isn't worth an LLM call

const SYSTEM_PROMPT = `You are an expert local trip planner composing a day-by-day plan for ONE city, choosing only from a fixed list of real candidate places.

You are given numbered candidate SIGHTS and FOOD venues (each: ref id, name, area/neighborhood, type, typical duration, outdoor flag, opening window) and the day structure to fill (how many sight slots each day has and whether it has a meal slot, plus a seasonal weather note).

RULES:
- Use ONLY ref ids from the provided lists. Never invent or rename a place.
- Fill each day with exactly the requested number of sight refs, in a sensible visiting order, plus one food ref when the day has a meal slot.
- Group each day around one or two neighborhoods to minimize crossing the city. Put nearby places on the same day.
- Vary the days: don't pile all the museums (or all the parks) into one day; balance indoor/outdoor and famous/local.
- Never repeat a ref anywhere in the whole trip.
- Heed each day's weather note: in hot or wet weather lean midday toward indoor sights.
- If the data includes "mustInclude" refs, every one of them MUST appear somewhere in the plan — these are the traveler's non-negotiables.
- If the data includes a "direction" string, it is the traveler's own words about what they want — honor it above the generic rules (e.g. "slow mornings", "more food, fewer museums", "keep day 2 light").
- For each day write a "theme" (2-4 words) and a "summary" (1-2 sentences, ~30 words, second person, present tense, no clichés, no emojis). Ground it in the trip's actual month (given as "month") — never name a different season.

OUTPUT: Return ONLY valid JSON, no prose, exactly:
{"days":[{"day":1,"theme":"...","summary":"...","sights":["a3","a7"],"meal":"f2"}]}`;

/** Classify a built time block within the day scaffold. */
function classifyBlock(block) {
  const a = block.activity || {};
  if (a.isEvent || a.type === 'event') return 'event'; // locked, keep as-is
  if (block.time === 'lunch' || a.type === 'food_recommendation') return 'meal';
  return 'sight';
}

/** Build the compact day structure the model fills. */
function describeDays(days) {
  return days.map((d) => {
    const kinds = (d.timeBlocks || []).map(classifyBlock);
    return {
      day: d.dayNumber,
      sightSlots: kinds.filter((k) => k === 'sight').length,
      meal: kinds.includes('meal'),
      note: d.weatherNote || '',
    };
  });
}

function describeCandidates(pool) {
  const sights = pool.candidates
    .filter((c) => c.kind === 'sight')
    .map((c) => ({
      ref: c.ref,
      name: c.activity.name,
      type: c.activity.type,
      area: c.neighborhood || undefined,
      dur: c.durationLabel,
      outdoor: c.outdoor || undefined,
      opens: c.hours?.opensAt ?? undefined,
      closes: c.hours?.closesAt ?? undefined,
    }));
  const food = pool.candidates
    .filter((c) => c.kind === 'food')
    .map((c) => ({ ref: c.ref, name: c.activity.name, area: c.neighborhood || undefined, price: c.activity.price || undefined }));
  return { sights, food };
}

/** Pull the first JSON object out of model text, tolerating stray prose. */
function parseJson(text) {
  if (!text) return null;
  try {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end <= start) return null;
    const obj = JSON.parse(text.slice(start, end + 1));
    return obj && typeof obj === 'object' ? obj : null;
  } catch {
    return null;
  }
}

async function callModel(client, userText, usageMeta = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await client.messages.create(
      {
        model: MODEL,
        max_tokens: 2048,
        system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: userText }],
      },
      { signal: controller.signal },
    );
    logLlmUsage({ feature: 'itinerary_curate', model: MODEL, usage: res?.usage, meta: usageMeta });
    const text = res?.content?.find((b) => b.type === 'text')?.text || '';
    return parseJson(text);
  } catch (err) {
    console.warn('[curateCityDays] call skipped:', err?.message || err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Resolve the trip's must-see slugs to candidate refs (same containment match
 * the deterministic scorer uses), so pins can be enforced — not just boosted.
 */
export function mustIncludeRefs(pool, mustSee = []) {
  if (!Array.isArray(mustSee) || !mustSee.length) return [];
  const refs = [];
  for (const c of pool.candidates) {
    if (c.kind !== 'sight') continue;
    const nameSlug = (c.activity?.name || '').toLowerCase().replace(/\s+/g, '-');
    if (mustSee.some((m) => nameSlug.includes(m) || String(m).includes(nameSlug))) refs.push(c.ref);
  }
  return refs;
}

/**
 * Validate + assemble the model's plan onto the deterministic day scaffold.
 * Pure and total — exported for unit testing against adversarial model output.
 *
 * @param {Object} modelPlan - parsed model JSON ({ days: [...] }) or null
 * @param {Array} baseDays - deterministic itinerary days (the scaffold)
 * @param {Object} pool - buildCandidatePool() result
 * @param {Object} [opts] - { mustInclude: ref[] } pins that MUST end up placed
 * @returns {Array} assembled days (always structurally valid)
 */
export function assembleCuratedDays(modelPlan, baseDays, pool, opts = {}) {
  const mustInclude = Array.isArray(opts.mustInclude) ? opts.mustInclude : [];
  const byDay = new Map();
  for (const d of modelPlan?.days || []) {
    if (typeof d?.day === 'number') byDay.set(d.day, d);
  }

  const usedSights = new Set();
  const usedFood = new Set();
  const sightQueue = pool.candidates.filter((c) => c.kind === 'sight');
  const foodQueue = pool.candidates.filter((c) => c.kind === 'food');

  const takeUnusedSight = () => sightQueue.find((c) => !usedSights.has(c.ref)) || null;
  const takeUnusedFood = () => foodQueue.find((c) => !usedFood.has(c.ref)) || null;

  // Every sight placement, in order, so pin enforcement below can swap the
  // least-prominent non-pinned placement.
  const placements = []; // { dayIdx, blockIdx, ref }

  const assembled = baseDays.map((day, dayIdx) => {
    const plan = byDay.get(day.dayNumber) || {};
    const kinds = (day.timeBlocks || []).map(classifyBlock);
    const sightSlots = kinds.filter((k) => k === 'sight').length;

    // Resolve the model's sight refs: valid, of kind sight, not already used.
    const chosen = [];
    for (const ref of Array.isArray(plan.sights) ? plan.sights : []) {
      const cand = pool.byRef.get(ref);
      if (cand && cand.kind === 'sight' && !usedSights.has(ref) && !chosen.includes(cand)) {
        chosen.push(cand);
        if (chosen.length >= sightSlots) break;
      }
    }
    // Backfill any shortfall deterministically from the top unused pool.
    while (chosen.length < sightSlots) {
      const c = takeUnusedSight();
      if (!c || chosen.includes(c)) break;
      usedSights.add(c.ref); // reserve so takeUnusedSight advances
      chosen.push(c);
    }
    chosen.forEach((c) => usedSights.add(c.ref));

    // Resolve the meal ref (food only); backfill from food pool if invalid.
    let mealCand = null;
    const mealRef = plan.meal;
    const m = mealRef && pool.byRef.get(mealRef);
    if (m && m.kind === 'food' && !usedFood.has(mealRef)) mealCand = m;
    else mealCand = takeUnusedFood();
    if (mealCand) usedFood.add(mealCand.ref);

    // Place chosen candidates onto the scaffold slots in order; keep events.
    let si = 0;
    const timeBlocks = (day.timeBlocks || []).map((block, i) => {
      const kind = kinds[i];
      if (kind === 'event') return block; // locked
      if (kind === 'meal') {
        if (!mealCand) return block; // keep deterministic food block
        return { ...block, activity: { ...mealCand.activity } };
      }
      // sight slot
      const cand = chosen[si++];
      if (!cand) return block; // keep deterministic block if pool ran dry
      placements.push({ dayIdx, blockIdx: i, ref: cand.ref });
      return { ...block, activity: { ...cand.activity } };
    });

    return {
      ...day,
      timeBlocks,
      theme: typeof plan.theme === 'string' && plan.theme.trim() ? plan.theme.trim() : day.theme,
      summary: typeof plan.summary === 'string' && plan.summary.trim() ? plan.summary.trim() : day.summary,
      _curated: true,
    };
  });

  // ── Pin enforcement: a must-see is a guarantee, not a suggestion. Any pin
  // the model (or backfill) left out replaces the LAST non-pinned placement,
  // so the most prominent (earliest) picks survive.
  const pinned = new Set(mustInclude);
  const missing = mustInclude.filter((ref) => !usedSights.has(ref) && pool.byRef.get(ref)?.kind === 'sight');
  for (const ref of missing) {
    for (let p = placements.length - 1; p >= 0; p -= 1) {
      const slot = placements[p];
      if (pinned.has(slot.ref)) continue;
      const cand = pool.byRef.get(ref);
      assembled[slot.dayIdx].timeBlocks[slot.blockIdx] = {
        ...assembled[slot.dayIdx].timeBlocks[slot.blockIdx],
        activity: { ...cand.activity },
      };
      usedSights.delete(slot.ref);
      usedSights.add(ref);
      slot.ref = ref;
      break;
    }
  }

  return assembled;
}

/**
 * Curate one city's days with an LLM, grounded in its candidate pool.
 *
 * @param {Object} trip - trip params (city, start_date, end_date, interests, pace…)
 * @param {Object} cityData - from getCityData()
 * @param {Object} baseItinerary - the deterministic buildItinerary() output (scaffold)
 * @returns {Promise<Array|null>} assembled days, or null to keep the deterministic days
 */
export async function curateCityDays(trip, cityData, baseItinerary) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  if (!baseItinerary || !Array.isArray(baseItinerary.days) || baseItinerary.days.length === 0) return null;

  let experiences = null;
  try {
    if (trip.city) experiences = await getCityExperiences(trip.city);
  } catch {
    experiences = null;
  }

  const seasonalContext = baseItinerary.seasonal?.month
    ? getSeasonalContext(cityData, trip.start_date, trip.end_date)
    : null;

  const pool = buildCandidatePool(cityData, { trip, seasonalContext, experiences });
  const sightCount = pool.candidates.filter((c) => c.kind === 'sight').length;
  if (sightCount < MIN_SIGHTS) return null; // sparse city — let deterministic/fallback handle it

  const pins = mustIncludeRefs(pool, trip.must_see);
  const direction = typeof trip.direction === 'string' && trip.direction.trim()
    ? trip.direction.trim().slice(0, 500)
    : null;

  const payload = {
    city: baseItinerary.city || trip.city,
    month: baseItinerary.seasonal?.month || null,
    season: baseItinerary.seasonal?.weatherNote || null,
    interests: Array.isArray(trip.interests) ? trip.interests : [],
    ...(pins.length ? { mustInclude: pins } : {}),
    ...(direction ? { direction } : {}),
    days: describeDays(baseItinerary.days),
    ...describeCandidates(pool),
  };

  const client = getAnthropicClient();
  const modelPlan = await callModel(client, `Plan ${payload.city}. Data:\n${JSON.stringify(payload)}`, {
    city: payload.city,
    days: baseItinerary.days.length,
  });
  if (!modelPlan || !Array.isArray(modelPlan.days)) return null;

  return assembleCuratedDays(modelPlan, baseItinerary.days, pool, { mustInclude: pins });
}

/**
 * Re-curate ONE day of an existing trip with free-text steering — the engine
 * behind "redo this day". The pool excludes places already used on the trip's
 * OTHER days (no duplicates), and the traveler's direction rides into the
 * prompt verbatim. Same grounding contract; returns the assembled day or null.
 *
 * @param {Object} trip - { city, start_date, end_date, interests, pace, budget, must_see }
 * @param {Object} cityData - from getCityData()
 * @param {Object} args
 * @param {Object} args.dayScaffold - a builder-shaped day ({ dayNumber, date, timeBlocks, weatherNote })
 * @param {string[]} [args.excludeNames] - activity names already used on other days
 * @param {string|null} [args.direction] - the traveler's words for this day
 * @returns {Promise<Object|null>} the assembled day, or null on any failure
 */
export async function curateSingleDay(trip, cityData, { dayScaffold, excludeNames = [], direction = null }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !dayScaffold) return null;

  let experiences = null;
  try {
    if (trip.city) experiences = await getCityExperiences(trip.city);
  } catch {
    experiences = null;
  }

  const seasonalContext = getSeasonalContext(cityData, trip.start_date, trip.end_date);
  const fullPool = buildCandidatePool(cityData, { trip, seasonalContext, experiences });

  // Drop candidates already placed on the trip's other days (refs stay stable).
  const excluded = new Set(excludeNames.map((n) => normalizeName(n) || String(n).trim().toLowerCase()));
  const candidates = fullPool.candidates.filter((c) => {
    const key = normalizeName(c.activity?.name) || (c.activity?.name || '').trim().toLowerCase();
    return !excluded.has(key);
  });
  const pool = { ...fullPool, candidates, byRef: new Map(candidates.map((c) => [c.ref, c])) };

  if (pool.candidates.filter((c) => c.kind === 'sight').length < MIN_SIGHTS) return null;

  const pins = mustIncludeRefs(pool, trip.must_see);
  const w = seasonalContext?.weather;
  const seasonNote = w
    ? [w.highC != null ? `high ~${w.highC}°C` : null, w.precipitation || null].filter(Boolean).join(', ') || null
    : null;
  const payload = {
    city: cityData?.cityName || cityData?.name || trip.city,
    month: seasonalContext?.month || null,
    season: seasonNote,
    interests: Array.isArray(trip.interests) ? trip.interests : [],
    ...(pins.length ? { mustInclude: pins } : {}),
    ...(direction ? { direction: String(direction).trim().slice(0, 500) } : {}),
    days: describeDays([dayScaffold]),
    ...describeCandidates(pool),
  };

  const client = getAnthropicClient();
  const modelPlan = await callModel(
    client,
    `Re-plan day ${dayScaffold.dayNumber} of ${payload.city} only. Data:\n${JSON.stringify(payload)}`,
    { city: payload.city, days: 1, regen: true },
  );
  if (!modelPlan || !Array.isArray(modelPlan.days)) return null;

  const [day] = assembleCuratedDays(modelPlan, [dayScaffold], pool, { mustInclude: pins });
  return day || null;
}
