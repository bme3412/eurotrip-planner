/**
 * Seasonal context for itinerary generation.
 *
 * The city guides carry rich per-month data under `cityData.monthly` (loaded by
 * getCityData → loadMonthlyData). Each month file looks like:
 *
 *   { "July": {
 *       reasons_to_visit: [...], reasons_to_reconsider: [...],
 *       first_half:  { date_range, weather, tourism_level, events_holidays, unique_experiences },
 *       second_half: { ... }
 *   } }
 *
 * This module normalizes that into a flat object the generator can reason about,
 * plus boolean risk flags (heat / cold / rain / short daylight) that drive
 * weather-aware attraction selection and pacing.
 */

import { getDaylightHours } from '@/lib/daylight';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

/** Parse a YYYY-MM-DD (or Date) into a local Date, or null. */
function parseDate(v) {
  if (!v) return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v === 'string') {
    const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** First integer found in a string like "25°C" / "-3°C" → number, or null. */
function parseTemp(s) {
  const m = String(s ?? '').match(/-?\d+/);
  return m ? parseInt(m[0], 10) : null;
}

/**
 * Pull the month object out of cityData.monthly for a given 0-based month index,
 * unwrapping the capitalized-month wrapper key (`{ "July": {...} }`).
 */
function getMonthEntry(monthly, monthIndex) {
  if (!monthly || monthIndex == null) return null;
  const name = MONTH_NAMES[monthIndex];
  const raw = monthly[name];
  if (!raw || typeof raw !== 'object') return null;
  // Direct shape (already unwrapped)
  if (raw.first_half || raw.second_half || raw.reasons_to_visit) return raw;
  // Wrapped shape: { "July": {...} } — take the first object value
  const inner = raw[Object.keys(raw)[0]];
  return inner && typeof inner === 'object' ? inner : raw;
}

/** Try to extract a day-of-month (1-31) from an event date string. */
function parseEventDay(dateStr) {
  if (!dateStr) return null;
  // "July 14, 2025" / "July 14" / "14 July" / "Jul 14"
  const m = String(dateStr).match(/\b(\d{1,2})\b/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  return day >= 1 && day <= 31 ? day : null;
}

function normalizeEvents(half) {
  const list = Array.isArray(half?.events_holidays) ? half.events_holidays : [];
  return list.map((e) => ({
    name: e.name || e.event || '',
    date: e.date || '',
    day: parseEventDay(e.date),
    description: e.description || '',
    notes: e.notes || '',
  })).filter((e) => e.name);
}

function normalizeExperiences(half) {
  const list = Array.isArray(half?.unique_experiences) ? half.unique_experiences : [];
  return list.map((x) => ({
    activity: x.activity || x.name || '',
    where: x.where || '',
    description: x.description || '',
    bestTime: x.best_time || null,
    estimatedCost: x.estimated_cost || null,
    weatherDependent: x.weather_dependent === true,
    practicalTips: x.practical_tips || null,
  })).filter((x) => x.activity);
}

/**
 * Build a normalized seasonal context for a city + trip window.
 *
 * @param {Object} cityData - result of getCityData() (has .monthly, .country)
 * @param {string|Date} startDate
 * @param {string|Date} endDate
 * @returns {Object|null} normalized seasonal context, or null when no monthly data
 */
export function getSeasonalContext(cityData, startDate, endDate) {
  const start = parseDate(startDate);
  if (!start) return null;

  const monthIndex = start.getMonth();
  const monthName = MONTH_NAMES[monthIndex];
  const country = cityData?.country || null;

  const entry = getMonthEntry(cityData?.monthly, monthIndex);

  // Choose first vs second half by the trip's start day-of-month.
  const dayOfMonth = start.getDate();
  const half = dayOfMonth <= 15
    ? (entry?.first_half || entry?.second_half)
    : (entry?.second_half || entry?.first_half);

  const highC = parseTemp(half?.weather?.average_temperature?.high);
  const lowC = parseTemp(half?.weather?.average_temperature?.low);
  const precipitation = half?.weather?.precipitation || null;
  const weatherTips = half?.weather?.general_tips || null;
  const crowds = half?.tourism_level?.crowds || null;
  const pricing = half?.tourism_level?.pricing || null;

  // Merge events/experiences from BOTH halves when the trip spans the whole
  // month boundary; otherwise just the chosen half. Keep it simple: if start and
  // end land in different halves, union them.
  const end = parseDate(endDate);
  const spansBothHalves = end && (start.getDate() <= 15) !== (end.getDate() <= 15)
    && start.getMonth() === end.getMonth();
  const events = spansBothHalves
    ? [...normalizeEvents(entry?.first_half), ...normalizeEvents(entry?.second_half)]
    : normalizeEvents(half);
  const uniqueExperiences = spansBothHalves
    ? [...normalizeExperiences(entry?.first_half), ...normalizeExperiences(entry?.second_half)]
    : normalizeExperiences(half);

  const daylightHours = getDaylightHours(monthIndex, country);

  // ── Risk flags (drive weather-aware selection + pacing) ──
  const rainText = String(precipitation || '').toLowerCase();
  const rainRisk = /rain|shower|wet|precipitat|drizzle/.test(rainText)
    && !/light|rare|unlikely|infrequent|not frequent|minimal|dry|low\b/.test(rainText);

  const flags = {
    heatRisk: highC != null && highC >= 30,
    coldRisk: highC != null && highC <= 6,
    rainRisk,
    shortDaylight: daylightHours != null && daylightHours < 10,
  };

  return {
    month: monthName,
    monthIndex,
    country,
    dateRange: half?.date_range || null,
    weather: { highC, lowC, precipitation, tips: weatherTips },
    crowds,
    pricing,
    atmosphere: half?.tourism_level?.overall_atmosphere || null,
    events,
    uniqueExperiences,
    reasonsToVisit: Array.isArray(entry?.reasons_to_visit) ? entry.reasons_to_visit : [],
    reasonsToReconsider: Array.isArray(entry?.reasons_to_reconsider) ? entry.reasons_to_reconsider : [],
    daylightHours,
    flags,
  };
}

/**
 * Cheap, synchronous seasonal hint for the CONVERSATION layer (no city files
 * loaded). Uses only the trip month + the cities' latitudes/countries already
 * in tripState, plus the daylight band. Returns a one-liner the agent can weave
 * into prose, and a suggested pace — never a question to interrogate the user.
 *
 * @param {Object} tripState
 * @returns {{ line: string, suggestedPace: string|null, monthIndex: number }|null}
 */
export function getSeasonalHintFromState(tripState) {
  const d = tripState?.dates || {};
  let monthIndex = null;
  if (d.startDate) {
    const m = String(d.startDate).match(/^\d{4}-(\d{2})/);
    if (m) monthIndex = parseInt(m[1], 10) - 1;
  } else if (d.flexibleMonth) {
    const m = String(d.flexibleMonth).match(/^\d{4}-(\d{2})/);
    if (m) monthIndex = parseInt(m[1], 10) - 1;
  }
  if (monthIndex == null || monthIndex < 0 || monthIndex > 11) return null;

  const cities = tripState?.route?.cities || [];
  const lats = cities.map(c => c.latitude).filter(v => typeof v === 'number');
  const southern = lats.some(l => l < 43);
  const northern = lats.some(l => l > 55);
  const country = cities.find(c => c.country)?.country;
  const daylight = getDaylightHours(monthIndex, country);

  const isSummer = monthIndex >= 5 && monthIndex <= 7;   // Jun–Aug
  const isWinter = monthIndex === 11 || monthIndex <= 1; // Dec–Feb
  const isPeak = monthIndex >= 5 && monthIndex <= 7;     // Jun–Aug crowds

  const bits = [];
  let suggestedPace = null;
  if (isSummer && southern) {
    bits.push('peak midday heat likely — favor a relaxed pace with shaded/indoor afternoons');
    suggestedPace = 'relaxed';
  }
  if (isWinter && (northern || daylight != null)) {
    bits.push(`short daylight (~${daylight ?? 8}h) and cold — front-load outdoor sights, keep evenings indoor`);
  }
  if (!isSummer && !isWinter) {
    bits.push('shoulder-season weather is variable — keep flexible indoor backups');
  }
  if (isPeak) bits.push('high season for crowds — book marquee sights ahead');

  if (!bits.length) return null;
  return { line: `${MONTH_LABELS[monthIndex]}: ${bits.join('; ')}.`, suggestedPace, monthIndex };
}

/**
 * One-line human summary of the seasonal context, e.g.
 * "Jul: ~25°C, high crowds, watch for heat". Used by the agent to weave a
 * single relevant tradeoff into conversation (no interrogation).
 */
export function summarizeSeasonalContext(ctx) {
  if (!ctx) return null;
  const parts = [];
  const monthShort = ctx.month ? ctx.month.charAt(0).toUpperCase() + ctx.month.slice(1, 3) : '';
  if (ctx.weather?.highC != null) parts.push(`~${ctx.weather.highC}°C`);
  if (ctx.crowds) {
    const c = ctx.crowds.toLowerCase();
    if (c.includes('high') || c.includes('busy') || c.includes('peak')) parts.push('high crowds');
    else if (c.includes('low') || c.includes('quiet') || c.includes('calm')) parts.push('light crowds');
  }
  const risks = [];
  if (ctx.flags.heatRisk) risks.push('heat');
  if (ctx.flags.coldRisk) risks.push('cold');
  if (ctx.flags.rainRisk) risks.push('rain');
  if (ctx.flags.shortDaylight) risks.push('short days');
  if (risks.length) parts.push(`watch for ${risks.join(' & ')}`);
  const topEvent = ctx.events?.[0]?.name;
  if (topEvent) parts.push(topEvent);
  return `${monthShort}: ${parts.join(', ')}`;
}
