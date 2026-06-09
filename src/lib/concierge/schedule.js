// Pure, timezone-aware scheduling logic for the concierge cadence. Given a trip
// (with nested days), its preferences, and "now" in UTC, decide which of the three
// daily beats are due this hour in the trip's LOCAL time — respecting quiet hours.
// No I/O; unit-testable.

import { resolveTimeZone, cityHourIn } from '@/components/city-guides/citymap/lib/timezone';

// Default local hour each beat fires at. Evening brief is the night BEFORE, so it
// targets tomorrow's day; morning + wind-down target the same (current) day.
export const BEAT_HOURS = {
  evening_brief: 20,
  morning_wakeup: 8,
  wind_down: 21,
};

export const ALL_BEATS = Object.keys(BEAT_HOURS);

/** Local calendar date ("YYYY-MM-DD") in an IANA zone. */
export function localDateIn(tz, now = new Date()) {
  if (!tz) return null;
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(now);
  } catch {
    return null;
  }
}

/** Add `n` days to a "YYYY-MM-DD" string (UTC math, calendar-safe). */
export function addDays(dateStr, n) {
  const [y, m, d] = String(dateStr).split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

function toMinutes(hhmm, fallback) {
  const m = String(hhmm || '').match(/^(\d{1,2}):(\d{2})/);
  if (!m) return fallback;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Is a given local hour inside the quiet window (which may wrap midnight)? */
export function isQuietHour(hour, quietStart = '21:30', quietEnd = '07:30') {
  const start = toMinutes(quietStart, 1290);
  const end = toMinutes(quietEnd, 450);
  const t = hour * 60;
  return start <= end ? t >= start && t < end : t >= start || t < end;
}

/** Map a local date to the trip's day_number, or null if outside the trip. */
export function dayNumberForLocalDate(trip, dateStr) {
  for (const d of trip?.days || []) {
    const dDate = typeof d.date === 'string' ? d.date.slice(0, 10) : null;
    if (dDate && dDate === dateStr) return d.day_number ?? d.dayNumber ?? null;
  }
  return null;
}

/**
 * Which beats are due for this trip in the current local hour.
 * @returns Array<{ type, dayNumber, localDate }>
 */
export function dueBeats(trip, prefs = {}, now = new Date()) {
  const tz = prefs.timezone || resolveTimeZone(trip?.country);
  if (!tz) return [];
  const hour = cityHourIn(tz, now);
  const localDate = localDateIn(tz, now);
  if (hour == null || !localDate) return [];

  const out = [];
  for (const type of ALL_BEATS) {
    if (BEAT_HOURS[type] !== hour) continue;
    if (isQuietHour(hour, prefs.quiet_start, prefs.quiet_end)) continue;
    // Evening brief sets up TOMORROW; the others are for today.
    const targetDate = type === 'evening_brief' ? addDays(localDate, 1) : localDate;
    const dayNumber = dayNumberForLocalDate(trip, targetDate);
    if (dayNumber == null) continue; // no trip day on that date → skip
    out.push({ type, dayNumber, localDate });
  }
  return out;
}
