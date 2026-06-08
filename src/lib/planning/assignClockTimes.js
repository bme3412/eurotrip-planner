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

// Flight-day framing: after landing, clear the airport, transit to the lodging, and
// drop bags before sightseeing; before an outbound flight, leave time to reach the gate.
const ARRIVAL_BUFFER_MIN = 135; // ~2h15 from landing to first activity
const DEPARTURE_BUFFER_MIN = 180; // ~3h before departure to be at the gate (international)
const LATE_ARRIVAL_CUTOFF = 20 * 60; // 20:00 — later than this, no daytime activities

/** "10:35" | "10:35AM" | "10:35 PM" | "10:35:00" → minutes past midnight, or null. */
export function parseClockToMinutes(value) {
  if (typeof value !== 'string') return null;
  const m = value.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])?$/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h > 23 || min > 59) return null;
  const ap = m[3]?.toLowerCase();
  if (ap === 'am' && h === 12) h = 0;
  else if (ap === 'pm' && h !== 12) h += 12;
  return h * 60 + min;
}

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
 * @param {Object} [opts] - { pace: 'relaxed'|'moderate'|'active', earliestStartMinutes }
 *   earliestStartMinutes floors the day's first start (e.g. arrival + transit buffer);
 *   opening-hours/lunch bumps still only push start times later, never before the floor.
 * @returns {Object} a new day with updated block start/end times
 */
export function assignDayClockTimes(day, opts = {}) {
  const blocks = day?.timeBlocks;
  if (!Array.isArray(blocks) || blocks.length === 0) return day;

  const paceAnchor = ANCHOR_BY_PACE[opts.pace] ?? ANCHOR_BY_PACE.moderate;
  let clock = Number.isFinite(opts.earliestStartMinutes)
    ? Math.max(paceAnchor, opts.earliestStartMinutes)
    : paceAnchor;

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
 * Re-anchor a single arrival/departure day's clock times around its booked flight,
 * so the day no longer schedules activities before the traveler has landed (arrival)
 * or after they must leave for the airport (departure). Pure; returns the day
 * unchanged when the flight time can't be parsed.
 *
 * @param {Object} day  a built day carrying `.arrival` (inbound) or `.departure` (outbound)
 * @param {Object} opts { pace, direction: 'arrival'|'departure' }
 */
export function assignFlightDayClockTimes(day, opts = {}) {
  if (opts.direction === 'arrival') {
    const mins = parseClockToMinutes(day?.arrival?.arrivalTime);
    if (mins == null) return day; // graceful: keep the per-city pass result
    const floor = mins + ARRIVAL_BUFFER_MIN;
    // Too late to fit any daytime sightseeing — leave only the arrival banner + check-in.
    if (floor >= LATE_ARRIVAL_CUTOFF) return { ...day, timeBlocks: [] };
    return assignDayClockTimes(day, { pace: opts.pace, earliestStartMinutes: floor });
  }
  if (opts.direction === 'departure') {
    const mins = parseClockToMinutes(day?.departure?.departureTime);
    if (mins == null) return day;
    const latestEnd = mins - DEPARTURE_BUFFER_MIN;
    // Lay the day out normally, then drop trailing stops that would start past the cutoff.
    const laid = assignDayClockTimes(day, { pace: opts.pace });
    const kept = laid.timeBlocks.filter((b) => {
      const start = parseClockToMinutes(b.startTime);
      return start == null || start < latestEnd;
    });
    return { ...laid, timeBlocks: kept };
  }
  return day;
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
