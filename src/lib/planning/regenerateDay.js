/**
 * Regenerate ONE day of a saved trip with free-text steering — "redo this day,
 * slower morning, more food" — without touching the rest of the itinerary.
 *
 * Flow: read the saved day's shape (how many sights, meal or not) → build a
 * fresh single-day scaffold → curate it with the LLM from the city's candidate
 * pool, EXCLUDING places already used on the trip's other days → assign clock
 * times → return a preview plan. Applying is a separate explicit step (the
 * propose→Apply trust ladder): delete the day's activity rows, insert the new
 * ones, update the theme, bump trips.updated_at (which invalidates brief
 * caches downstream).
 */
import { getCityData } from '@/lib/data-utils';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { toDbTimeBlock } from '@/lib/trips/tripsRepository';
import { curateSingleDay } from './curateCityDays.js';
import { assignDayClockTimes } from './assignClockTimes.js';

// Activity statuses that mean "not on the plan anymore" — their names are free
// to reuse, everything else is excluded from the regen pool.
const INACTIVE = new Set(['skipped', 'removed', 'weather_swapped', 'cancelled']);

const SIGHT_TIME_SEQUENCES = {
  1: ['morning'],
  2: ['morning', 'afternoon'],
  3: ['morning', 'late_morning', 'afternoon'],
  4: ['early_morning', 'morning', 'afternoon', 'late_afternoon'],
  5: ['early_morning', 'morning', 'late_morning', 'afternoon', 'late_afternoon'],
};

function isMealActivity(act) {
  return act?.time_block === 'lunch' || act?.type === 'food_recommendation';
}

function activeActivities(dayRow) {
  return (dayRow?.activities || []).filter((a) => a?.name && !INACTIVE.has(a.status));
}

/**
 * Synthesize a builder-shaped single-day scaffold matching the saved day's
 * structure (same number of sight slots, meal kept if it had one). Pure.
 */
export function buildDayScaffold(dayRow, { weatherNote = null } = {}) {
  const acts = activeActivities(dayRow);
  const sightCount = Math.min(5, Math.max(1, acts.filter((a) => !isMealActivity(a)).length || 3));
  const hasMeal = acts.some(isMealActivity) || acts.length === 0;

  const times = SIGHT_TIME_SEQUENCES[sightCount] || SIGHT_TIME_SEQUENCES[3];
  const timeBlocks = [];
  for (const t of times) {
    timeBlocks.push({ time: t });
    // Lunch sits after the late-morning stretch, before 'afternoon'.
    if (hasMeal && (t === 'late_morning' || (t === 'morning' && !times.includes('late_morning')))) {
      timeBlocks.push({ time: 'lunch' });
    }
  }
  if (hasMeal && !timeBlocks.some((b) => b.time === 'lunch')) timeBlocks.push({ time: 'lunch' });

  return {
    dayNumber: dayRow.day_number,
    date: dayRow.date || null,
    cityName: dayRow.city || null,
    weatherNote: weatherNote || '',
    timeBlocks,
  };
}

/** Names already in use on the trip's OTHER days in the same city. Pure. */
export function namesUsedElsewhere(tripRow, dayNumber, city) {
  const names = [];
  for (const d of tripRow?.days || []) {
    if (d.day_number === dayNumber) continue;
    if (city && d.city && d.city !== city) continue;
    for (const a of activeActivities(d)) names.push(a.name);
  }
  return names;
}

/** Curated day → transport-friendly preview plan. Pure. */
export function dayToPlan(day) {
  const blocks = (day.timeBlocks || [])
    .filter((b) => b?.activity?.name)
    .map((b) => ({
      time: b.time || 'morning',
      startTime: b.startTime || b.activity.startTime || null,
      endTime: b.endTime || b.activity.endTime || null,
      name: String(b.activity.name).slice(0, 200),
      type: b.activity.type || null,
      description: b.activity.description ? String(b.activity.description).slice(0, 1000) : null,
      duration: b.activity.duration || null,
      price: b.activity.price || null,
      neighborhood: b.activity.neighborhood || null,
      bookingUrl: b.activity.bookingUrl || null,
      indoor: !!b.activity.indoor,
      coordinates: Array.isArray(b.activity.coordinates) ? b.activity.coordinates : null,
    }));
  return {
    dayNumber: day.dayNumber,
    theme: day.theme || null,
    summary: day.summary || null,
    blocks,
  };
}

/**
 * Build the regenerated-day preview (no writes).
 * @param {object} tripRow - getTripWithDetails row (days[] with activities[])
 * @param {number} dayNumber
 * @param {{direction?: string}} opts - the traveler's free-text steering
 * @returns {Promise<{plan: object} | {error: string}>}
 */
export async function regenerateDayPlan(tripRow, dayNumber, { direction = null } = {}) {
  const dayRow = (tripRow?.days || []).find((d) => d.day_number === dayNumber);
  if (!dayRow) return { error: `No day ${dayNumber} on this trip.` };
  if (dayRow.is_travel_day) return { error: 'Travel days can’t be regenerated — they’re shaped by the journey.' };

  const citySlug = (dayRow.city || tripRow.city || '').toLowerCase();
  if (!citySlug) return { error: 'This day has no city to plan from.' };

  let cityData = null;
  try {
    cityData = await getCityData(citySlug);
  } catch { /* handled below */ }
  if (!cityData) return { error: 'No guide data for this city yet — try editing stops individually.' };

  const trip = {
    city: citySlug,
    start_date: tripRow.start_date,
    end_date: tripRow.end_date,
    interests: Array.isArray(tripRow.interests) ? tripRow.interests : [],
    pace: Number.isFinite(tripRow.pace) ? tripRow.pace : 50,
    budget: tripRow.budget || 'moderate',
    must_see: Array.isArray(tripRow.must_see) ? tripRow.must_see : [],
  };

  const scaffold = buildDayScaffold(dayRow);
  const excludeNames = namesUsedElsewhere(tripRow, dayNumber, dayRow.city);

  const curated = await curateSingleDay(trip, cityData, {
    dayScaffold: scaffold,
    excludeNames,
    direction,
  });
  if (!curated) return { error: 'Couldn’t redo this day right now — try again in a moment.' };

  // Realistic clock times for the new sequence (best-effort).
  let timed = curated;
  try {
    timed = assignDayClockTimes(curated, { pace: trip.pace <= 35 ? 'relaxed' : trip.pace >= 70 ? 'active' : 'moderate' });
  } catch { /* keep template times */ }

  return { plan: dayToPlan(timed || curated) };
}

/**
 * Apply a previously previewed plan: replace the day's activities, set the
 * theme, bump trips.updated_at. The caller has already verified write access.
 * @returns {Promise<{ok: true, summary: string} | {error: string}>}
 */
export async function applyRegeneratedDay(tripRow, dayNumber, plan) {
  const dayRow = (tripRow?.days || []).find((d) => d.day_number === dayNumber);
  if (!dayRow) return { error: `No day ${dayNumber} on this trip.` };

  const blocks = Array.isArray(plan?.blocks)
    ? plan.blocks.filter((b) => b && typeof b.name === 'string' && b.name.trim())
    : [];
  if (!blocks.length) return { error: 'The new plan is empty — nothing applied.' };

  const supabase = await getSupabaseAdmin();
  try {
    const { error: delErr } = await supabase.from('trip_activities').delete().eq('trip_day_id', dayRow.id);
    if (delErr) throw delErr;

    const rows = blocks.map((b, j) => ({
      trip_day_id: dayRow.id,
      time_block: toDbTimeBlock(b.time),
      sort_order: j,
      start_time: b.startTime || null,
      end_time: b.endTime || null,
      name: String(b.name).slice(0, 200),
      type: b.type || null,
      description: b.description ? String(b.description).slice(0, 2000) : null,
      duration_minutes: null,
      price_range: b.price || null,
      latitude: Array.isArray(b.coordinates) ? b.coordinates[1] ?? null : null,
      longitude: Array.isArray(b.coordinates) ? b.coordinates[0] ?? null : null,
      neighborhood: b.neighborhood || null,
      booking_required: !!b.bookingUrl,
      booking_url: b.bookingUrl || null,
      indoor: !!b.indoor,
      status: 'planned',
    }));
    const { error: insErr } = await supabase.from('trip_activities').insert(rows);
    if (insErr) throw insErr;

    if (plan.theme || plan.summary) {
      const updates = {};
      if (plan.theme) updates.theme = String(plan.theme).slice(0, 120);
      const { error: dayErr } = await supabase.from('trip_days').update(updates).eq('id', dayRow.id);
      if (dayErr) throw dayErr;
    }

    // Invalidate brief caches + anything keyed on the trip version.
    const { error: bumpErr } = await supabase
      .from('trips')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', tripRow.id);
    if (bumpErr) console.error('[regenerateDay] updated_at bump failed:', bumpErr.message);

    return { ok: true, summary: `Day ${dayNumber} regenerated — ${blocks.length} stops${plan.theme ? ` · ${plan.theme}` : ''}` };
  } catch (err) {
    console.error('[regenerateDay] apply failed:', err?.message);
    return { error: 'The new day didn’t save — the itinerary is untouched. Try again in a moment.' };
  }
}
