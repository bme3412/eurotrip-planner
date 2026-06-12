// Night-before opening-hours check — the T3 watcher that catches the
// "Carnavalet is closed Mondays" class of itinerary bug before it ruins a
// morning. Classification is pure (Google Places "regularOpeningHours" shape
// in, verdict out); the scanner injects the Places fetcher so it's testable
// and no-ops without a key. No LLM anywhere: code owns these facts.

import { buildConciergeContext } from './buildContext';
import { localDateIn, addDays, dayNumberForLocalDate } from './schedule';
import { resolveTimeZone } from '@/components/city-guides/citymap/lib/timezone';

const LATE_OPEN_GRACE_MIN = 30; // opening ≤30min after the slot isn't worth a ping

function toMinutes(hhmm) {
  if (!hhmm || typeof hhmm !== 'string') return null;
  const m = hhmm.match(/^(\d{1,2}):(\d{2})/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

function pad(n) {
  return String(n).padStart(2, '0');
}

/**
 * Classify one stop against Google's regularOpeningHours for a given weekday.
 * @param {object} args
 * @param {object|null} args.openingHours  Places (New) regularOpeningHours: { periods: [{ open: {day,hour,minute}, close: {day,hour,minute} }] }
 * @param {string|null} args.businessStatus  'OPERATIONAL' | 'CLOSED_TEMPORARILY' | 'CLOSED_PERMANENTLY'
 * @param {number} args.weekday  0=Sunday … 6=Saturday (the visit day)
 * @param {string|null} args.plannedTime  'HH:MM' or null
 * @returns {{ status: 'ok'|'closed'|'opens_later'|'unknown', opensAt?: string }}
 */
export function classifyOpening({ openingHours, businessStatus = null, weekday, plannedTime = null }) {
  if (businessStatus === 'CLOSED_TEMPORARILY' || businessStatus === 'CLOSED_PERMANENTLY') {
    return { status: 'closed' };
  }
  const periods = openingHours?.periods;
  if (!Array.isArray(periods) || !periods.length) return { status: 'unknown' };

  // 24/7 venues come back as a single open period with no close.
  if (periods.length === 1 && periods[0]?.open && !periods[0].close) return { status: 'ok' };

  // Windows that cover the visit weekday, in minutes-from-midnight of that day.
  // Overnight periods (close.day !== open.day) spill past 1440.
  const windows = [];
  for (const p of periods) {
    if (!p?.open) continue;
    if (p.open.day === weekday) {
      const start = p.open.hour * 60 + (p.open.minute || 0);
      let end = 24 * 60;
      if (p.close) {
        end = p.close.hour * 60 + (p.close.minute || 0);
        if (p.close.day !== p.open.day) end += 24 * 60;
      }
      windows.push([start, end]);
    } else if (p.close && p.close.day === weekday && p.open.day !== weekday) {
      // Spillover from the previous night (e.g. opens Sat 20:00, closes Sun 02:00).
      windows.push([0, p.close.hour * 60 + (p.close.minute || 0)]);
    }
  }
  if (!windows.length) return { status: 'closed' };

  const planned = toMinutes(plannedTime);
  if (planned == null) return { status: 'ok' }; // open that day; no slot to check against

  if (windows.some(([s, e]) => planned >= s && planned < e)) return { status: 'ok' };

  // Not open at the slot — is it just a late opening worth shifting to?
  const nextOpen = windows
    .map(([s]) => s)
    .filter((s) => s > planned)
    .sort((a, b) => a - b)[0];
  if (nextOpen != null && nextOpen < 24 * 60) {
    if (nextOpen - planned <= LATE_OPEN_GRACE_MIN) return { status: 'ok' };
    return { status: 'opens_later', opensAt: `${pad(Math.floor(nextOpen / 60))}:${pad(nextOpen % 60)}` };
  }
  return { status: 'closed' };
}

/**
 * Scan one trip's TOMORROW for stops that are closed (or open too late) at
 * their planned time. Stops without a google_place_id are skipped — facts
 * only, no guesses.
 *
 * @param {object} trip   normalized trip (getTripWithDetails)
 * @param {object} prefs  concierge_preferences row
 * @param {Date} now
 * @param {object} deps   { fetchPlace(placeId) → { businessStatus, regularOpeningHours } | null }
 * @returns {Promise<null | { tripId, dayNumber, localDate, issues: [{ name, time, status, opensAt? }] }>}
 */
export async function scanTripForHours(trip, prefs = {}, now = new Date(), deps = {}) {
  const { fetchPlace } = deps;
  if (typeof fetchPlace !== 'function') return null;

  const tz = prefs.timezone || resolveTimeZone(trip?.country);
  if (!tz) return null;

  const tomorrow = addDays(localDateIn(tz, now), 1);
  const dayNumber = dayNumberForLocalDate(trip, tomorrow);
  if (dayNumber == null) return null;

  const ctx = buildConciergeContext(trip, { dayNumber });
  const day = ctx.selectedDay;
  const stops = (day?.schedule || []).filter((s) => s.placeId);
  if (!stops.length) return null;

  const weekday = new Date(`${tomorrow}T00:00:00`).getDay();
  const issues = [];
  for (const stop of stops) {
    let place = null;
    try {
      place = await fetchPlace(stop.placeId);
    } catch {
      continue; // quota/network — skip silently, never false-alarm
    }
    if (!place) continue;
    const verdict = classifyOpening({
      openingHours: place.regularOpeningHours,
      businessStatus: place.businessStatus || null,
      weekday,
      plannedTime: stop.time,
    });
    if (verdict.status === 'closed' || verdict.status === 'opens_later') {
      issues.push({ name: stop.name, time: stop.time, status: verdict.status, opensAt: verdict.opensAt || null });
    }
  }

  if (!issues.length) return null;
  return { tripId: trip.id, dayNumber, localDate: tomorrow, issues };
}

/** Deterministic alert copy — code owns these facts, no LLM required. */
export function hoursAlertBody(issues, { cityName = null } = {}) {
  const lines = issues.map((i) =>
    i.status === 'opens_later'
      ? `${i.name} doesn’t open until ${i.opensAt} tomorrow — your plan has it at ${i.time}.`
      : `${i.name} looks closed tomorrow${i.time ? ` (you had it at ${i.time})` : ''}.`
  );
  const lead = cityName ? `Checked tomorrow’s ${cityName} plan against opening hours. ` : '';
  return `${lead}${lines.join(' ')}`.trim();
}
