/**
 * Optional LLM "polish" pass for a generated itinerary.
 *
 * The deterministic builder (buildItinerary / buildMultiCityItinerary) produces
 * the structure — which attractions, in what order, on which day, with seasonal
 * weather/event awareness. This pass adds the things an algorithm writes poorly:
 * a warm trip-level intro and a vivid 1–2 sentence narrative + theme per day,
 * grounded in the season.
 *
 * Strategy: fan out ONE small call per city (plus a tiny intro call), all in
 * parallel. Wall-clock stays ~one call regardless of trip length, each prompt
 * is small (so output never truncates), and a single city failing doesn't lose
 * the others. A giant single-call version timed out and silently fell back on
 * long multi-city trips.
 *
 * Hard guarantees:
 *  - TEXT ONLY. The model may rewrite intro / per-day theme + summary. It may
 *    NOT add, remove, reorder, or invent activities, prices, or coordinates —
 *    those are merged back by dayNumber and never taken from the model.
 *  - Graceful fallback. No API key, disabled flag, timeout, error, or invalid
 *    output → the original deterministic itinerary is returned unchanged
 *    (per city, so partial success is fine).
 */

import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-sonnet-4-20250514';
// Per-call cap. Calls run in parallel, so this is roughly the whole pass's
// wall-clock budget no matter how many cities there are.
const TIMEOUT_MS = 9_000;
const MAX_DESC = 160;

// Stop types that aren't real attractions — a city made only of these (a city
// without a detailed guide yet) isn't worth an LLM call.
const GENERIC_STOP_TYPES = new Set(['explore', 'neighborhood', 'food_recommendation', 'transport', 'arrival']);

function clip(s, n = MAX_DESC) {
  if (!s) return '';
  const str = String(s);
  return str.length > n ? `${str.slice(0, n - 1)}…` : str;
}

function dayForModel(d) {
  return {
    dayNumber: d.dayNumber,
    date: d.dateLabel || d.date || '',
    weatherNote: d.weatherNote || '',
    stops: (d.timeBlocks || [])
      .map((tb) => tb.activity)
      .filter(Boolean)
      .map((a) => ({ name: a.name, type: a.type, isEvent: a.isEvent || false, desc: clip(a.description) })),
  };
}

/** Group non-travel days by city, in first-appearance order. Curated days are
 * skipped — the curator already wrote their theme + summary. */
function groupDaysByCity(itinerary) {
  const groups = new Map();
  for (const d of itinerary.days || []) {
    if (d.isTravelDay || d._curated) continue;
    const city = d.cityName || d.city || itinerary.city || 'this city';
    if (!groups.has(city)) groups.set(city, []);
    groups.get(city).push(d);
  }
  return groups;
}

function hasRealStops(days) {
  return days.some((d) => (d.timeBlocks || []).some((tb) => tb.activity && !GENERIC_STOP_TYPES.has(tb.activity.type)));
}

const CITY_SYSTEM_PROMPT = `You are a travel copywriter polishing one city's days within a pre-built European itinerary.

You are given the city, and for each day the exact stops chosen and a seasonal weather note. Write engaging copy that fits what is already planned.

RULES:
- Do NOT invent, add, remove, or reorder stops. Write only about the stops provided.
- Use the real stop and event names exactly as given.
- Ground the language in the season (the weatherNote tells you heat, rain, cold, short daylight, or crowds). Reflect it naturally — shaded mornings in a heatwave, cozy indoor evenings in winter.
- Each day "summary": 1–2 sentences (~30 words) describing the arc of the day.
- Each day "theme": a short 2–4 word title (e.g. "Old Town & Riverside").
- No clichés ("hidden gem", "must-see", "unforgettable"). No emojis. Second person, present tense.

OUTPUT: Return ONLY valid JSON, no prose, exactly: {"days":[{"dayNumber":1,"theme":"...","summary":"..."}]}`;

const INTRO_SYSTEM_PROMPT = `You are a travel copywriter. Given a trip's cities and season, write a warm 1–2 sentence intro (second person, present tense, no emojis, no clichés). Ground it in the season when relevant.

OUTPUT: Return ONLY valid JSON, exactly: {"intro":"..."}`;

/**
 * Polish an itinerary's prose with an LLM. Returns the same itinerary shape with
 * refined intro / per-day theme + summary merged in. Never throws.
 *
 * @param {Object} itinerary - output of buildMultiCityItinerary / buildItinerary
 * @param {Object} [trip] - trip params (interests, pace, travelers) for tone
 * @returns {Promise<Object>} the (possibly) enriched itinerary
 */
export async function enrichItineraryLLM(itinerary, trip = {}) {
  if (!itinerary || !Array.isArray(itinerary.days)) return itinerary;
  if (process.env.ITINERARY_LLM_ENRICH === 'false') return itinerary;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return itinerary;

  const groups = [...groupDaysByCity(itinerary).entries()].filter(([, days]) => hasRealStops(days));
  // Even with nothing to polish per-city (e.g. every city was curated), still
  // write the trip-level intro when there's at least one real or curated day.
  const anyRealDay = (itinerary.days || []).some(
    (d) => !d.isTravelDay && (d._curated || hasRealStops([d])),
  );
  if (groups.length === 0 && !anyRealDay) return itinerary;

  const client = new Anthropic({ apiKey });
  const cityNames = (itinerary.cities || []).map((c) => c.name).filter(Boolean);
  const tone = {
    interests: trip.interests || [],
    pace: trip.pace || 'balanced',
    withChildren: !!(trip.travelers && trip.travelers.hasChildren),
  };

  // One small call per city + one tiny intro call, all in parallel. allSettled
  // so a single failure (timeout/invalid) just leaves that city deterministic.
  const cityCalls = groups.map(([city, days]) => enrichCity(client, city, days, tone));
  const introCall = enrichIntro(client, cityNames, itinerary, tone);
  const [introResult, ...cityResults] = await Promise.allSettled([introCall, ...cityCalls]);

  // Merge per-day text, keyed by dayNumber.
  const byDay = new Map();
  for (const r of cityResults) {
    const parsed = r.status === 'fulfilled' ? r.value : null;
    for (const d of parsed?.days || []) {
      if (typeof d?.dayNumber === 'number') byDay.set(d.dayNumber, d);
    }
  }

  const days = itinerary.days.map((day) => {
    if (day.isTravelDay) return day;
    const e = byDay.get(day.dayNumber);
    if (!e) return day;
    return {
      ...day,
      theme: typeof e.theme === 'string' && e.theme.trim() ? e.theme.trim() : day.theme,
      summary: typeof e.summary === 'string' && e.summary.trim() ? e.summary.trim() : day.summary,
      _aiPolished: true,
    };
  });

  const intro = introResult.status === 'fulfilled' && typeof introResult.value?.intro === 'string'
    ? introResult.value.intro.trim()
    : itinerary.intro;

  return { ...itinerary, days, intro: intro || itinerary.intro };
}

/** One city's polish call. Resolves to parsed JSON or null (never throws). */
async function enrichCity(client, city, days, tone) {
  const payload = { city, trip: tone, days: days.map(dayForModel) };
  // Small, bounded output: a couple of fields per day.
  const maxTokens = Math.min(2048, 200 + days.length * 160);
  const parsed = await callModel(client, CITY_SYSTEM_PROMPT, `Polish ${city}. Data:\n${JSON.stringify(payload)}`, maxTokens);
  return parsed && Array.isArray(parsed.days) ? parsed : null;
}

/** Trip-level intro call. Resolves to parsed JSON or null (never throws). */
async function enrichIntro(client, cityNames, itinerary, tone) {
  const firstCityDay = (itinerary.days || []).find((d) => !d.isTravelDay && d.weatherNote);
  const payload = {
    cities: cityNames,
    nights: itinerary.meta?.totalCityDays ?? null,
    season: firstCityDay?.weatherNote || null,
    interests: tone.interests,
  };
  const parsed = await callModel(client, INTRO_SYSTEM_PROMPT, `Write the intro. Data:\n${JSON.stringify(payload)}`, 200);
  return parsed && typeof parsed.intro === 'string' ? parsed : null;
}

/** Single Anthropic call with its own timeout + JSON parse. Resolves null on any failure. */
async function callModel(client, systemPrompt, userText, maxTokens) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await client.messages.create(
      {
        model: MODEL,
        max_tokens: maxTokens,
        // Static instructions cache across the parallel calls and repeat runs.
        system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: userText }],
      },
      { signal: controller.signal },
    );
    const text = res?.content?.find((b) => b.type === 'text')?.text || '';
    return parseModelJson(text);
  } catch (err) {
    console.warn('[enrichItineraryLLM] call skipped:', err?.message || err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Pull the first JSON object out of the model text, tolerating stray prose. */
function parseModelJson(text) {
  if (!text) return null;
  try {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return null;
    const obj = JSON.parse(text.slice(start, end + 1));
    return obj && typeof obj === 'object' ? obj : null;
  } catch {
    return null;
  }
}
