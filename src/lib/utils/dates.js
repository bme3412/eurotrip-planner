/**
 * Shared, client-safe date helpers for the trip planner UI.
 *
 * The key job here is `parseLocalDate`: a bare "YYYY-MM-DD" passed to
 * `new Date()` is interpreted as UTC midnight, which rolls back to the previous
 * day (and sometimes month) in any timezone behind UTC. That shifted the month
 * used for daylight/weather/season in the results UI for every US user. Always
 * route date-only strings through here.
 */

import { MONTHS_SHORT } from '@/lib/constants/months';

/** Parse a date input to a Date at LOCAL midnight (no UTC shift for YYYY-MM-DD). */
export function parseLocalDate(input) {
  if (!input) return null;
  if (input instanceof Date) return input;
  if (typeof input === 'string') {
    const m = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Local month index (0-11) for a date input, or null. */
export function getLocalMonthIndex(input) {
  const d = parseLocalDate(input);
  return d ? d.getMonth() : null;
}

/** "Jun 1 – Jun 8" from a {start,end} pair (strings or Dates). Null if incomplete. */
export function formatDateRange(start, end) {
  const s = parseLocalDate(start);
  const e = parseLocalDate(end);
  if (!s || !e) return null;
  const fmt = (d) => `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
  return `${fmt(s)} – ${fmt(e)}`;
}

/** Whole nights between start and end. Null if incomplete. */
export function getNights(start, end) {
  const s = parseLocalDate(start);
  const e = parseLocalDate(end);
  if (!s || !e) return null;
  return Math.max(0, Math.round((e - s) / 86400000));
}
