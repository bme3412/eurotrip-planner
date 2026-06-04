/**
 * Pure helpers for the "right now" synthesis on the Overview landing.
 *
 * Turns the structured data the guide already ships — the day-level
 * visit-calendar, the current month payload, and the scored experiences —
 * into a single opinionated, date-aware verdict ("Late May in Paris is a good
 * time…"), a short list of top picks, and a one-pick-per-slot day shape.
 *
 * No React, no DOM, no fetch. The "current date" is injected so the output is
 * deterministic and unit-testable.
 */

import { MONTH_NAMES, RATING_LABELS } from './constants';

/** "Early" / "Mid" / "Late" qualifier for a day-of-month. */
function periodOfMonth(day) {
  if (day <= 10) return 'Early';
  if (day <= 20) return 'Mid';
  return 'Late';
}

/** camelCase / snake_case event key → "Title Case" label. */
function humanizeKey(key) {
  return String(key || '')
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Find the calendar range whose `days` array covers `day`. */
function findRange(monthEntry, day) {
  if (!monthEntry?.ranges) return null;
  return monthEntry.ranges.find((r) => Array.isArray(r.days) && r.days.includes(day)) || null;
}

/** Normalise a range's `specialEvents` object into a flat array. */
function extractEvents(range) {
  if (!range) return [];
  if (range.specialEvents && typeof range.specialEvents === 'object') {
    return Object.entries(range.specialEvents).map(([key, value]) => ({
      name: value?.name || humanizeKey(key),
      dates: value?.dates || null,
      location: value?.location || null,
      tips: value?.tips || null,
      impact: value?.impact || null,
    }));
  }
  if (range.event) return [{ name: range.event, dates: null, location: null, tips: null, impact: null }];
  return [];
}

/** Build the weather summary from a month's `weatherDetails`. */
function summariseWeather(weatherDetails) {
  if (!weatherDetails) return null;
  const { lowC, highC, sunset, daylightHours, sunshineHours, rainDays } = weatherDetails;
  const tempLabel =
    lowC !== undefined && highC !== undefined ? `${lowC}–${highC}°C` : null;
  return { lowC, highC, tempLabel, sunset: sunset || null, daylightHours: daylightHours ?? null, sunshineHours: sunshineHours ?? null, rainDays: rainDays ?? null };
}

/**
 * Compose the "right now" verdict for a city on a given date.
 *
 * @param {object}   args
 * @param {object}   args.visitCalendar   the visit-calendar section ({ months })
 * @param {string}   [args.cityDisplayName='this city']
 * @param {Date}     [args.today=new Date()]
 * @returns {object|null} null when the calendar lacks data for today's month.
 */
export function buildRightNow({ visitCalendar, cityDisplayName = 'this city', today = new Date() } = {}) {
  const months = visitCalendar?.months;
  if (!months) return null;

  const monthIndex = today.getMonth();
  const day = today.getDate();
  const monthName = MONTH_NAMES[monthIndex];
  const monthEntry = months[monthName?.toLowerCase()];
  if (!monthEntry) return null;

  const range = findRange(monthEntry, day);
  const rawScore = range?.score;
  const score = typeof rawScore === 'number' ? Math.max(1, Math.min(5, Math.round(rawScore))) : null;
  const scoreLabel = score ? RATING_LABELS[score] : null;
  const isGoodTime = score != null ? score >= 4 : null;

  const crowdLevel = range?.crowdLevel || monthEntry.crowdLevel || null;
  const priceLevel = range?.price || monthEntry.priceLevel || null;
  const weather = summariseWeather(monthEntry.weatherDetails);
  const events = extractEvents(range);
  const periodLabel = `${periodOfMonth(day)} ${monthName}`;

  // One opinionated verdict sentence assembled from the structured signals.
  const goodness =
    score == null ? 'a fine'
      : score >= 5 ? 'a wonderful'
        : score >= 4 ? 'a good'
          : score >= 3 ? 'a workable'
            : 'a tricky';
  const clauses = [`${periodLabel} is ${goodness} time to be in ${cityDisplayName}`];
  if (weather?.tempLabel) {
    const lightBit = weather.sunset ? ` and light until ${weather.sunset}` : '';
    clauses[0] += ` — expect ${weather.tempLabel} days${lightBit}`;
  }
  let verdict = `${clauses[0]}.`;
  if (crowdLevel) verdict += ` Crowds are ${String(crowdLevel).toLowerCase()} right now.`;
  if (events.length) verdict += ` ${events[0].name} is on, so plan around it.`;

  // A short, honest note on what the score weighs. Names only the signals that
  // are actually present so it never implies data the guide doesn't have
  // (scoring coverage is sparse for many cities — see scoring-data-coverage).
  const rationaleFactors = [];
  if (weather?.tempLabel) rationaleFactors.push('weather');
  if (crowdLevel) rationaleFactors.push('crowds');
  if (events.length) rationaleFactors.push('events');
  const scoreRationale =
    score != null && rationaleFactors.length
      ? `Scored on ${
          rationaleFactors.length === 1
            ? rationaleFactors[0]
            : `${rationaleFactors.slice(0, -1).join(', ')} & ${rationaleFactors[rationaleFactors.length - 1]}`
        }`
      : null;

  return {
    monthName,
    periodLabel,
    score,
    scoreLabel,
    scoreRationale,
    isGoodTime,
    crowdLevel,
    priceLevel,
    weather,
    events,
    notes: range?.notes || null,
    considerations: Array.isArray(range?.considerations) ? range.considerations : [],
    verdict,
  };
}

/**
 * Flatten a `{ categories: { Morning: [...], ... } }` experiences payload into
 * a single list sorted by `scores.total_score` (desc), returning the top `n`.
 * Mirrors the flatten/sort in attractions/hooks/useExperienceData.js.
 */
export function flattenTopExperiences(experiencesJson, n = 4) {
  const cats = experiencesJson?.categories;
  if (!cats || typeof cats !== 'object') return [];
  const out = [];
  Object.entries(cats).forEach(([category, arr]) => {
    (Array.isArray(arr) ? arr : []).forEach((item) => {
      if (!item?.name) return;
      out.push({
        name: item.name,
        description: item.description || null,
        category,
        themes: Array.isArray(item.themes) ? item.themes : [],
        arrondissement: item.arrondissement || null,
        best_time: item.best_time || null,
        pricing_tier: item.pricing_tier || null,
        image: item.image || null,
        googlePlaceKey: item.googlePlaceKey || null,
        scoreTotal: typeof item?.scores?.total_score === 'number' ? item.scores.total_score : 0,
      });
    });
  });
  out.sort((a, b) => (b.scoreTotal || 0) - (a.scoreTotal || 0));
  return out.slice(0, Math.max(0, n));
}

/**
 * Pick one opinionated item per time-of-day slot from the experiences payload,
 * preferring the highest-scored item in each category. Falls back across
 * adjacent categories so every slot is filled when possible.
 */
export function buildDayShape(experiencesJson) {
  const all = flattenTopExperiences(experiencesJson, Infinity);
  if (!all.length) return null;

  const pickFrom = (cats, used) => {
    const lower = cats.map((c) => c.toLowerCase());
    return (
      all.find((e) => lower.includes(String(e.category).toLowerCase()) && !used.has(e.name)) || null
    );
  };

  const used = new Set();
  const morning = pickFrom(['Morning'], used);
  if (morning) used.add(morning.name);
  const afternoon = pickFrom(['Midday', 'Afternoon'], used);
  if (afternoon) used.add(afternoon.name);
  const evening = pickFrom(['Evening', 'Night'], used);
  if (evening) used.add(evening.name);

  if (!morning && !afternoon && !evening) return null;
  return { morning, afternoon, evening };
}
