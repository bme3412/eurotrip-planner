/**
 * Optional realistic clock-time pass for a built itinerary day.
 *
 * The deterministic builder fills fixed time-slot templates (09:00–12:00, …)
 * regardless of how long each stop takes or how far apart they are. Once a day
 * has been proximity-ordered (and, when Google Routes is configured, annotated
 * with per-stop `nextTravel.durationMinutes`), we can do better: walk the day
 * forward from a pace-based anchor, giving each stop a start/end derived from its
 * own duration, the travel time to the next stop, and its opening window.
 *
 * Pure + deterministic. Only `block.startTime` / `block.endTime` change; the
 * `time` slot label (used for DB persistence + UI grouping) is never touched.
 * Guarded by the caller behind ITINERARY_CLOCK_TIMES — off → builder templates.
 */
import { haversine } from './buildItinerary.js';

// Pace anchor: when the day starts (minutes past midnight).
const ANCHOR_BY_PACE = { relaxed: 600, moderate: 570, active: 540 }; // 10:00 / 9:30 / 9:00

const DEFAULT_STOP_MIN = 90;
const MIN_STOP_MIN = 30;
const MAX_STOP_MIN = 240;
const LUNCH_MIN = 60;
const LUNCH_EARLIEST = 12 * 60 + 30; // don't seat lunch before 12:30
const DEFAULT_TRANSIT_MIN = 10; // fallback hop when no routing/coords
const WALK_KMH = 4.8;

/** "1.5h" | "90m" | "1-2 hours" | 90 → minutes (clamped), or default. */
function parseDurationMinutes(duration) {
  if (typeof duration === 'number' && Number.isFinite(duration)) {
    return clampStop(duration);
  }
  if (typeof duration !== 'string') return DEFAULT_STOP_MIN;
  const s = duration.toLowerCase();
  // hours: "1.5h", "2 hours", "1-2 hours" (take the upper bound)
  const hourMatches = [...s.matchAll(/(\d+(?:\.\d+)?)\s*(?:h|hour|hr)/g)];
  if (hourMatches.length) {
    const hrs = Math.max(...hourMatches.map((m) => parseFloat(m[1])));
    return clampStop(Math.round(hrs * 60));
  }
  // minutes: "90m", "90 min"
  const minMatch = s.match(/(\d+)\s*(?:m|min)/);
  if (minMatch) return clampStop(parseInt(minMatch[1], 10));
  // bare range "1-2"
  const range = s.match(/(\d+)\s*[–-]\s*(\d+)/);
  if (range) return clampStop(Math.round(parseInt(range[2], 10) * 60));
  return DEFAULT_STOP_MIN;
}

function clampStop(m) {
  return Math.max(MIN_STOP_MIN, Math.min(MAX_STOP_MIN, m));
}

/** minutes-past-midnight → "9:05" / "14:30" (matches existing template format). */
function fmt(mins) {
  const m = ((Math.round(mins) % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = String(m % 60).padStart(2, '0');
  return `${h}:${mm}`;
}

function latLng(activity) {
  const c = activity?.coordinates;
  if (Array.isArray(c) && c.length === 2 && Number.isFinite(c[0]) && Number.isFinite(c[1])) {
    return { lon: c[0], lat: c[1] };
  }
  return null;
}

/** Travel minutes from this block to the next: prefer routing, else walk estimate from coords. */
function travelToNext(block, nextBlock) {
  const routed = block?.activity?.nextTravel?.durationMinutes;
  if (Number.isFinite(routed) && routed >= 0) return routed;
  const a = latLng(block?.activity);
  const b = latLng(nextBlock?.activity);
  if (a && b) {
    const km = haversine(a.lat, a.lon, b.lat, b.lon);
    return Math.max(5, Math.round((km / WALK_KMH) * 60));
  }
  return DEFAULT_TRANSIT_MIN;
}

/**
 * Reassign clock times across one day's timeBlocks in their current order.
 * @param {Object} day - a built day with timeBlocks[]
 * @param {Object} [opts] - { pace: 'relaxed'|'moderate'|'active' }
 * @returns {Object} a new day with updated block start/end times
 */
export function assignDayClockTimes(day, opts = {}) {
  const blocks = day?.timeBlocks;
  if (!Array.isArray(blocks) || blocks.length === 0) return day;

  const anchor = ANCHOR_BY_PACE[opts.pace] ?? ANCHOR_BY_PACE.moderate;
  let clock = anchor;

  const nextBlocks = blocks.map((block, i) => {
    const activity = block.activity || {};
    const isLunch = block.time === 'lunch' || activity.type === 'food_recommendation';

    if (isLunch) {
      if (clock < LUNCH_EARLIEST) clock = LUNCH_EARLIEST;
    } else if (activity._hours && Number.isFinite(activity._hours.opensAt)) {
      const opensMin = activity._hours.opensAt * 60;
      if (clock < opensMin) clock = opensMin;
    }

    const dur = isLunch ? LUNCH_MIN : parseDurationMinutes(activity.duration);
    const start = clock;
    const end = clock + dur;

    // Advance the cursor by this stop's length plus the hop to the next stop.
    const next = blocks[i + 1];
    const hop = next ? travelToNext(block, next) : 0;
    clock = end + hop;

    // Surface the hop so the UI can show "→ N min walk" even when Google Routes
    // isn't configured (it only annotates nextTravel when it ran). Don't clobber
    // a real routed value.
    const nextActivity = next && hop >= 1 && !activity.nextTravel
      ? { ...activity, nextTravel: { source: 'estimate', travelMode: 'WALK', durationMinutes: hop, distanceMeters: null } }
      : activity;

    return { ...block, activity: nextActivity, startTime: fmt(start), endTime: fmt(end) };
  });

  return { ...day, timeBlocks: nextBlocks };
}

/**
 * Apply clock times across every non-travel day of an itinerary.
 * @param {Object} itinerary
 * @param {Object} [opts] - { pace }
 */
export function assignClockTimes(itinerary, opts = {}) {
  if (!itinerary || !Array.isArray(itinerary.days)) return itinerary;
  const days = itinerary.days.map((day) =>
    day.isTravelDay ? day : assignDayClockTimes(day, opts),
  );
  return { ...itinerary, days };
}
