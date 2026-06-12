// Validated itinerary mutations for the thread agent — the T2 "hands".
//
// The model PROPOSES; this module owns the facts. buildProposal() validates an
// intent against the real trip rows and produces a human-readable diff;
// nothing writes until the traveler taps Apply, and applyProposal() re-runs
// the full validation against a FRESH trip read before executing — so a stale
// or hallucinated proposal can never corrupt an itinerary.
//
// Works on the normalized trip from getTripWithDetails (raw DB rows:
// trip.days[].id / day_number / is_travel_day / activities[].id / time_block /
// start_time / status). Pure builders; the applier takes an injected Supabase
// client (extract-and-inject testable).

export const PROPOSAL_ACTIONS = new Set(['move_activity', 'remove_activity', 'swap_days', 'add_note']);

const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/;
const INACTIVE_STATUSES = new Set(['skipped', 'weather_swapped']);

/** 'HH:MM' (zero-padded) or null. */
export function normalizeTime(t) {
  const m = typeof t === 'string' ? t.trim().match(TIME_RE) : null;
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : null;
}

/** The trip_activities.time_block CHECK only permits these five values. */
export function timeBlockForTime(hhmm) {
  const h = Number(hhmm.slice(0, 2));
  if (h < 11) return 'morning';
  if (h < 13) return 'lunch';
  if (h < 17) return 'afternoon';
  if (h < 21) return 'evening';
  return 'night';
}

export function findDayRow(trip, dayNumber) {
  return (trip?.days || []).find((d) => d.day_number === dayNumber) || null;
}

function activeActivities(day) {
  return (day?.activities || []).filter((a) => a?.name && !INACTIVE_STATUSES.has(a.status));
}

/**
 * Resolve an activity on a day by name — exact (case-insensitive) first, then
 * unique substring. Ambiguity and misses return errors that read well when
 * relayed by the model.
 */
export function resolveActivity(day, nameQuery) {
  const q = typeof nameQuery === 'string' ? nameQuery.trim().toLowerCase() : '';
  if (!q) return { error: 'Which activity? Give its name.' };
  const candidates = activeActivities(day);
  const exact = candidates.filter((a) => a.name.toLowerCase() === q);
  if (exact.length === 1) return { activity: exact[0] };
  const partial = candidates.filter((a) => a.name.toLowerCase().includes(q));
  if (partial.length === 1) return { activity: partial[0] };
  if (partial.length > 1) {
    return { error: `"${nameQuery}" matches several stops: ${partial.map((a) => a.name).join(', ')}. Which one?` };
  }
  return {
    error: `No stop matching "${nameQuery}" on day ${day?.day_number}. That day has: ${candidates.map((a) => a.name).join(', ') || 'nothing scheduled'}.`,
  };
}

function label(day) {
  return `Day ${day.day_number}${day.city ? ` (${day.city})` : ''}`;
}

/**
 * Validate an intent against the trip and produce { proposal } or { error }.
 * The proposal stores the INTENT (not row ids) plus a human diff — apply
 * re-resolves everything against a fresh read.
 *
 * Intents:
 *   move_activity   { dayNumber, activityName, toDayNumber?, toTime? }  (at least one "to")
 *   remove_activity { dayNumber, activityName }
 *   swap_days       { dayNumber, toDayNumber }
 *   add_note        { dayNumber, note }
 */
export function buildProposal(trip, input = {}) {
  const action = input.action;
  if (!PROPOSAL_ACTIONS.has(action)) return { error: `Unknown action: ${action}` };

  const dayNumber = Number(input.dayNumber);
  const day = findDayRow(trip, dayNumber);
  if (!day) return { error: `No day ${input.dayNumber} on this trip.` };

  if (action === 'add_note') {
    const note = typeof input.note === 'string' ? input.note.trim().slice(0, 500) : '';
    if (!note) return { error: 'The note is empty.' };
    return {
      proposal: {
        action,
        intent: { action, dayNumber, note },
        diff: `Add a note to ${label(day)}: “${note}”`,
      },
    };
  }

  if (action === 'swap_days') {
    const toDayNumber = Number(input.toDayNumber);
    const toDay = findDayRow(trip, toDayNumber);
    if (!toDay) return { error: `No day ${input.toDayNumber} on this trip.` };
    if (toDayNumber === dayNumber) return { error: 'Those are the same day.' };
    if (day.is_travel_day || toDay.is_travel_day) return { error: 'Travel days can’t be swapped.' };
    if (day.city !== toDay.city) {
      return { error: `${label(day)} and ${label(toDay)} are in different cities — swapping would strand the plan. Move individual stops instead.` };
    }
    return {
      proposal: {
        action,
        intent: { action, dayNumber, toDayNumber },
        diff: `Swap the plans for ${label(day)} and ${label(toDay)}`,
      },
    };
  }

  // move / remove need a resolvable activity.
  const { activity, error: actErr } = resolveActivity(day, input.activityName);
  if (actErr) return { error: actErr };

  if (action === 'remove_activity') {
    return {
      proposal: {
        action,
        intent: { action, dayNumber, activityName: activity.name },
        diff: `Skip “${activity.name}” on ${label(day)}`,
      },
    };
  }

  // move_activity
  const toTime = input.toTime != null ? normalizeTime(input.toTime) : null;
  if (input.toTime != null && !toTime) return { error: `“${input.toTime}” isn’t a valid time — use HH:MM.` };
  const toDayNumber = input.toDayNumber != null ? Number(input.toDayNumber) : null;
  let toDay = null;
  if (toDayNumber != null) {
    toDay = findDayRow(trip, toDayNumber);
    if (!toDay) return { error: `No day ${input.toDayNumber} on this trip.` };
    if (toDay.is_travel_day) return { error: `Day ${toDayNumber} is a travel day — pick a city day.` };
  }
  if (!toTime && (toDayNumber == null || toDayNumber === dayNumber)) {
    return { error: 'Move it to when? Give a new time, a different day, or both.' };
  }

  const from = `${label(day)}${activity.start_time ? ` ${String(activity.start_time).slice(0, 5)}` : ''}`;
  const toParts = [];
  if (toDay && toDayNumber !== dayNumber) toParts.push(label(toDay));
  if (toTime) toParts.push(toTime);
  return {
    proposal: {
      action,
      intent: { action, dayNumber, activityName: activity.name, toDayNumber, toTime },
      diff: `Move “${activity.name}” from ${from} to ${toParts.join(' ')}`,
    },
  };
}

/**
 * Re-validate an intent against a FRESH trip and execute it. Bumps
 * trips.updated_at explicitly — activity edits don't cascade to the trip row,
 * and the brief cache is keyed on it.
 * @returns {Promise<{ ok: true, summary: string } | { error: string }>}
 */
export async function applyProposal(supabase, trip, intent) {
  const { proposal, error } = buildProposal(trip, intent);
  if (error) return { error };
  const { action } = proposal;
  const i = proposal.intent;

  try {
    if (action === 'add_note') {
      const day = findDayRow(trip, i.dayNumber);
      const notes = day.notes ? `${day.notes}\n${i.note}` : i.note;
      const { error: e } = await supabase.from('trip_days').update({ notes }).eq('id', day.id);
      if (e) throw e;
    } else if (action === 'swap_days') {
      const a = findDayRow(trip, i.dayNumber);
      const b = findDayRow(trip, i.toDayNumber);
      const aIds = (a.activities || []).map((x) => x.id);
      const bIds = (b.activities || []).map((x) => x.id);
      // By explicit id lists, so the two updates can't collide mid-swap.
      if (aIds.length) {
        const { error: e1 } = await supabase.from('trip_activities').update({ trip_day_id: b.id }).in('id', aIds);
        if (e1) throw e1;
      }
      if (bIds.length) {
        const { error: e2 } = await supabase.from('trip_activities').update({ trip_day_id: a.id }).in('id', bIds);
        if (e2) throw e2;
      }
      const { error: e3 } = await supabase.from('trip_days').update({ theme: b.theme }).eq('id', a.id);
      if (e3) throw e3;
      const { error: e4 } = await supabase.from('trip_days').update({ theme: a.theme }).eq('id', b.id);
      if (e4) throw e4;
    } else {
      const day = findDayRow(trip, i.dayNumber);
      const { activity } = resolveActivity(day, i.activityName);
      if (!activity) return { error: 'That stop is no longer on the day — nothing applied.' };

      if (action === 'remove_activity') {
        const { error: e } = await supabase.from('trip_activities').update({ status: 'skipped' }).eq('id', activity.id);
        if (e) throw e;
      } else {
        const updates = {};
        if (i.toTime) {
          updates.start_time = `${i.toTime}:00`;
          updates.time_block = timeBlockForTime(i.toTime);
        }
        if (i.toDayNumber != null && i.toDayNumber !== i.dayNumber) {
          updates.trip_day_id = findDayRow(trip, i.toDayNumber).id;
        }
        const { error: e } = await supabase.from('trip_activities').update(updates).eq('id', activity.id);
        if (e) throw e;
      }
    }

    // Invalidate brief caches + signal "the plan changed" to everything keyed
    // on the trip version.
    const { error: bumpErr } = await supabase
      .from('trips')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', trip.id);
    if (bumpErr) console.error('[concierge/tripActions] updated_at bump failed:', bumpErr.message);

    return { ok: true, summary: proposal.diff };
  } catch (err) {
    console.error('[concierge/tripActions] apply failed:', err?.message);
    return { error: 'The change didn’t save — the itinerary is untouched. Try again in a moment.' };
  }
}
