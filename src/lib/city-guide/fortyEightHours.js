/**
 * Build a New York Times "36 Hours"-style 48-hour itinerary for a city.
 *
 * The narrative is written by Claude, but strictly grounded in the city's own
 * curated data (real attractions, restaurants, cafés and neighborhoods) so the
 * prose reads like a magazine feature without hallucinating places. Returns a
 * structured object the UI renders as a timeline; the API route caches it on
 * disk so each city costs at most one model call per cache window.
 */

import fs from 'node:fs';
import path from 'node:path';
import { getAnthropicClient } from '@/lib/llm/clients';

const MODEL = 'claude-sonnet-4-6';
const TIMEOUT_MS = 45_000;
const CONTENT_ROOT = path.join(process.cwd(), 'content', 'cities');

/** Find the content folder for a city slug by scanning country directories. */
function findCityDir(slug) {
  const target = (slug || '').trim().toLowerCase();
  if (!target) return null;
  let countries = [];
  try {
    countries = fs.readdirSync(CONTENT_ROOT, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch {
    return null;
  }
  for (const country of countries) {
    const dir = path.join(CONTENT_ROOT, country, target);
    if (fs.existsSync(path.join(dir, 'attractions.json'))) return dir;
  }
  return null;
}

function readJson(dir, file) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
  } catch {
    return null;
  }
}

/** Recursively flatten arrays nested inside category objects. */
function flattenItems(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value).flatMap(flattenItems);
  return [];
}

/** Strip markdown emphasis and clamp to a one-line teaser. */
function clean(text, max = 160) {
  if (!text || typeof text !== 'string') return '';
  const stripped = text.replace(/[*_#`]/g, '').replace(/\s+/g, ' ').trim();
  return stripped.length > max ? `${stripped.slice(0, max - 1)}…` : stripped;
}

/**
 * Assemble the compact grounding payload handed to the model — names are the
 * contract: the prompt may only reference places that appear here.
 */
function buildGrounding(dir) {
  const attractionsRaw = readJson(dir, 'attractions.json') || {};
  const sites = attractionsRaw.sites || attractionsRaw.attractions
    || (Array.isArray(attractionsRaw) ? attractionsRaw : []);
  const attractions = sites.slice(0, 24).map((s) => ({
    name: s.name,
    area: s.neighborhood || s.arrondissement || undefined,
    indoor: s.indoor ?? undefined,
    best_time: s.best_time || undefined,
    note: clean(s.appeal || s.description, 140) || undefined,
  })).filter((s) => s.name);

  const culinary = readJson(dir, 'culinary.json') || {};
  const restaurants = flattenItems(culinary.restaurants).slice(0, 16).map((r) => ({
    name: r.name,
    cuisine: r.cuisine_type || r.cuisine || undefined,
    area: r.neighborhood || r.location || r.arrondissement || undefined,
    price: r.price_range || undefined,
    best_time: r.best_time || undefined,
  })).filter((r) => r.name);
  const cafesBars = flattenItems(culinary.bars_and_cafes).slice(0, 12).map((c) => ({
    name: c.name,
    type: c.type || c.cuisine_type || undefined,
    area: c.neighborhood || c.location || undefined,
  })).filter((c) => c.name);

  const hoodsRaw = readJson(dir, 'neighborhoods.json') || {};
  const hoods = (Array.isArray(hoodsRaw) ? hoodsRaw : hoodsRaw.neighborhoods || [])
    .slice(0, 12).map((n) => ({
      name: n.name,
      character: clean(n.character, 120) || undefined,
      vibe: (n.appeal?.atmosphere || []).slice(0, 3),
    })).filter((n) => n.name);

  return { attractions, restaurants, cafesBars, neighborhoods: hoods };
}

const SYSTEM_PROMPT = `You are a travel editor writing a "48 Hours In…" city feature in the voice of the New York Times "36 Hours" column: confident, specific, sensory, and economical. You plan a tight, walkable two-day weekend that flows geographically and by time of day.

HARD RULES:
- Use ONLY place names that appear in the provided data (attractions, restaurants, cafesBars, neighborhoods). Never invent a venue. Copy names exactly.
- Each day has exactly 4 blocks in this order: morning, midday (a lunch/café stop), afternoon, evening (dinner or a night out). 8 blocks total across 2 days.
- At least 3 of the 8 blocks must be food/drink stops drawn from restaurants or cafesBars.
- Group each day around 1–2 neighborhoods so the route is realistic; don't bounce across the city.
- "body" is 2–3 vivid sentences of editorial prose (no bullet lists, no markdown).
- "tip" is one concrete insider line (or null).
- Times read like "9 a.m.", "1 p.m.", "8 p.m.".
- Output a SINGLE JSON object and nothing else.

JSON shape:
{
  "title": "<City> in 48 Hours",
  "intro": "<2–3 sentence editorial hook for the weekend>",
  "days": [
    {
      "label": "Day 1",
      "subtitle": "<short theme, e.g. Right Bank icons & Marais nights>",
      "blocks": [
        { "time": "9 a.m.", "period": "morning", "title": "<headline>", "placeName": "<exact name from data>", "neighborhood": "<area>", "body": "<2-3 sentences>", "tip": "<one line or null>" }
      ]
    },
    { "label": "Day 2", "subtitle": "…", "blocks": [ … ] }
  ]
}`;

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

/** Light validation so a malformed model response surfaces as a miss, not UI garbage. */
function isValidItinerary(it) {
  return it
    && typeof it.intro === 'string'
    && Array.isArray(it.days)
    && it.days.length >= 1
    && it.days.every((d) => Array.isArray(d.blocks) && d.blocks.length > 0);
}

/**
 * Generate the 48-hour itinerary. Returns the structured object, or null when
 * the city has no data / no API key / the model call fails (caller decides how
 * to degrade — typically a friendly empty state, never a crash).
 */
export async function buildFortyEightHours(citySlug, displayName) {
  const dir = findCityDir(citySlug);
  if (!dir) return null;

  // Prefer a committed, precomputed itinerary: instant, no LLM call, and no
  // serverless function-timeout risk. This is how Paris ships in production;
  // regenerate the file with scripts when the underlying city data changes.
  const precomputed = readJson(dir, 'forty-eight-hours.json');
  if (isValidItinerary(precomputed)) {
    precomputed.title = precomputed.title || `${displayName} in 48 Hours`;
    precomputed.city = displayName;
    return precomputed;
  }

  const client = getAnthropicClient();
  if (!client) return null;

  const grounding = buildGrounding(dir);
  if (grounding.attractions.length === 0) return null;

  const userText = `City: ${displayName}\n\nWrite the "${displayName} in 48 Hours" feature using only the data below.\n\nDATA:\n${JSON.stringify(grounding)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await client.messages.create(
      {
        model: MODEL,
        max_tokens: 3072,
        system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: userText }],
      },
      { signal: controller.signal },
    );
    const text = res?.content?.find((b) => b.type === 'text')?.text || '';
    const itinerary = parseJson(text);
    if (!isValidItinerary(itinerary)) return null;
    itinerary.title = itinerary.title || `${displayName} in 48 Hours`;
    itinerary.city = displayName;
    return itinerary;
  } catch (err) {
    console.warn('[48h] generation failed:', err?.message || err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
