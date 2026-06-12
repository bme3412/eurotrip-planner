// Deterministic context for the concierge preview. Code owns the FACTS (times,
// weather, depart-by, cadence, the day scaffold); the LLM only writes the voice.
// Shared by the brief route and the "ask Olivier" route.

import { buildPlanFromNormalizedDays } from '@/app/itineraries/[tripId]/_lib/buildPlan';
import { accommodationsByCity, getBookings, pickInbound } from '@/lib/planning/tripBookings';

export function timeToMinutes(hhmm) {
  if (!hhmm || typeof hhmm !== 'string') return null;
  const m = hhmm.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function minutesToTime(mins) {
  if (mins == null || Number.isNaN(mins)) return null;
  const m = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/** Trim a stored time ("12:50:00") to "12:50"; null-safe. */
export function trimTime(t) {
  if (!t || typeof t !== 'string') return null;
  const m = t.match(/^(\d{1,2}):(\d{2})/);
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : null;
}

/** Human pace label from the trip's numeric or string pace. */
export function paceLabel(pace) {
  if (pace == null) return null;
  if (typeof pace === 'string') return pace;
  if (pace <= 2) return 'relaxed';
  if (pace <= 4) return 'moderate';
  return 'active';
}

/** Coarse weather read used for status lines + golden-hour framing. */
export function weatherConditions(w) {
  if (!w) return { label: 'settled skies', emoji: '☀️', wet: false };
  const rainDays = w.rainDays ?? 0;
  const sun = w.sunshineHours ?? 7;
  if (rainDays >= 14) return { label: 'showers likely', emoji: '🌧️', wet: true };
  if (rainDays >= 10) return { label: 'a few passing showers', emoji: '⛅', wet: true };
  if (sun >= 7) return { label: 'clear skies', emoji: '☀️', wet: false };
  return { label: 'mixed skies', emoji: '⛅', wet: false };
}

function crowdHint(monthIndex) {
  // No live popular-times here; a light seasonal heuristic keeps it honest.
  if (monthIndex >= 5 && monthIndex <= 7) return 'busier by midday';
  if (monthIndex === 11 || monthIndex <= 1) return 'quiet streets';
  return 'light early crowds';
}

/** Pretty status line for a brief, e.g. "☀️ 23° · sunrise 05:45 · light crowds". */
export function metaLine(w, monthIndex) {
  const c = weatherConditions(w);
  const parts = [];
  if (w?.highC != null) parts.push(`${c.emoji} ${Math.round(w.highC)}°`);
  if (w?.sunrise) parts.push(`sunrise ${w.sunrise}`);
  parts.push(crowdHint(monthIndex));
  return parts.join(' · ');
}

/** Rough, friendly timezone label per city (preview-grade). */
function timezoneLabel(cityName) {
  const c = (cityName || '').toLowerCase();
  const uk = ['london', 'edinburgh', 'dublin'];
  const east = ['athens', 'helsinki', 'bucharest', 'istanbul', 'kyiv', 'riga', 'tallinn', 'vilnius'];
  if (uk.some((x) => c.includes(x))) return 'UK time';
  if (east.some((x) => c.includes(x))) return 'Eastern European time';
  return 'Central European time';
}

/** A day's stops as the brief/schedule components consume them. */
function mapSchedule(timeBlocks) {
  return (timeBlocks || [])
    .filter((b) => b.activity?.name)
    .map((b) => ({
      time: trimTime(b.startTime),
      name: b.activity.name,
      neighborhood: b.activity.neighborhood || null,
      type: b.activity.type || null,
      indoor: b.activity.indoor ?? null,
      lat: b.activity.latitude ?? null,
      lng: b.activity.longitude ?? null,
      placeId: b.activity.googlePlaceId || null,
    }));
}

/** Full first-activity record (banner + route map need place/geo fields). */
function mapFirstActivity(timeBlocks) {
  const fb = (timeBlocks || []).find((b) => b.activity?.name) || null;
  if (!fb) return null;
  const act = fb.activity;
  return {
    name: act.name,
    startTime: trimTime(fb.startTime),
    neighborhood: act.neighborhood || null,
    type: act.type || null,
    placeId: act.googlePlaceId || null,
    lat: act.latitude ?? null,
    lng: act.longitude ?? null,
  };
}

/**
 * Build the full deterministic context bundle.
 * @returns { plan, meta, days, personalization, selectedDay }
 */
export function buildConciergeContext(trip, { dayNumber } = {}) {
  const plan = buildPlanFromNormalizedDays(trip);
  const allDays = plan.days || [];
  const realDays = allDays.filter((d) => !d.isTravelDay);

  // Country per day: the day's own column, else the trip's cities[] entry for
  // that slug, else the trip-level country (single-country trips).
  const countryBySlug = {};
  if (Array.isArray(trip.cities)) {
    for (const c of trip.cities) {
      if (c?.id && c.country) countryBySlug[c.id] = c.country;
    }
  }
  const countryFor = (d) => d?.country || (d?.city && countryBySlug[d.city]) || trip.country || null;

  // Ordered unique cities across the trip.
  const cities = [];
  for (const d of allDays) {
    if (d.isTravelDay || !d.cityName) continue;
    if (!cities.some((c) => c.name === d.cityName)) cities.push({ name: d.cityName, city: d.city, country: countryFor(d) });
  }
  const anchorName = cities[0]?.name || trip.city || 'your city';

  // Real bookings up-front so the day scaffold can carry per-day hotel names.
  const flights = trip.trip_state ? getBookings(trip.trip_state) : [];
  const inbound = pickInbound(flights);
  const acc = trip.trip_state ? accommodationsByCity(trip.trip_state) : {};

  // Day scaffold for the selector + rhythm timeline — and, since it carries the
  // full deterministic day (schedule, depart-by, hotel), the client can render
  // any day instantly while the LLM prose is still being written.
  const days = allDays.map((d) => {
    const firstActivity = mapFirstActivity(d.timeBlocks);
    const startMin = timeToMinutes(firstActivity?.startTime);
    return {
      dayNumber: d.dayNumber,
      date: d.date || null,
      dateLabel: d.dateLabel || null,
      cityName: d.cityName || anchorName,
      city: d.city || null,
      country: countryFor(d),
      theme: d.theme || null,
      isTravelDay: !!d.isTravelDay,
      touchCount: d.isTravelDay ? 1 : 3,
      firstActivity,
      schedule: mapSchedule(d.timeBlocks),
      departBy: startMin != null ? minutesToTime(startMin - 30) : null,
      hotelName: (d.city && acc[d.city]?.name) || null,
    };
  });

  const dailyTouches = 3;
  const totalTouches = realDays.length * dailyTouches;

  const meta = {
    cityName: anchorName,
    country: cities[0] ? trip.country : trip.country || null,
    cities: cities.map((c) => c.name),
    // Full destination records (name + slug + country) for persona resolution.
    destinations: cities.map((c) => ({ name: c.name, city: c.city || null, country: c.country || null })),
    totalDays: allDays.length,
    totalRealDays: realDays.length,
    cadence: { dailyTouches, totalTouches, timezone: timezoneLabel(anchorName) },
  };

  // Personalization pulled from data we already hold.
  const firstCitySlug = cities[0]?.city;
  const personalization = {
    pace: paceLabel(trip.pace),
    interests: Array.isArray(trip.interests) ? trip.interests.slice(0, 6) : [],
    arrival: inbound ? { fromCity: inbound.fromCity || null, date: inbound.arrivalDate || null } : null,
    hotelName: (firstCitySlug && acc[firstCitySlug]?.name) || null,
  };

  // The selected (or first real) day, with the facts a brief needs.
  const rawDay =
    (dayNumber != null && allDays.find((d) => d.dayNumber === dayNumber && !d.isTravelDay)) ||
    realDays[0] ||
    allDays[0] ||
    null;

  let selectedDay = null;
  if (rawDay) {
    const firstActivity = mapFirstActivity(rawDay.timeBlocks);
    const startMin = timeToMinutes(firstActivity?.startTime);
    const departBy = startMin != null ? minutesToTime(startMin - 30) : null;
    // index of this day among real days, to name "tomorrow".
    const idx = realDays.findIndex((d) => d.dayNumber === rawDay.dayNumber);
    const nextRealDay = idx >= 0 ? realDays[idx + 1] : null;
    const isFirstRealDay = realDays[0]?.dayNumber === rawDay.dayNumber;

    selectedDay = {
      dayNumber: rawDay.dayNumber,
      date: rawDay.date || null,
      dateLabel: rawDay.dateLabel || null,
      cityName: rawDay.cityName || anchorName,
      city: rawDay.city || firstCitySlug || null,
      country: countryFor(rawDay),
      theme: rawDay.theme || null,
      firstActivity,
      departBy,
      // The whole day's stops — proves Olivier read the itinerary, not just
      // the first line. Ordered as stored; times trimmed to HH:MM.
      schedule: mapSchedule(rawDay.timeBlocks),
      // Real bookings to ground the brief: hotel always, inbound flight on day 1.
      hotelName: (rawDay.city && acc[rawDay.city]?.name) || personalization.hotelName || null,
      arrival: isFirstRealDay && inbound ? { fromCity: inbound.fromCity || null, date: inbound.arrivalDate || null } : null,
      nextCity: nextRealDay?.cityName || null,
      nextCitySlug: nextRealDay?.city || null,
      nextCountry: nextRealDay ? countryFor(nextRealDay) : null,
      nextTheme: nextRealDay?.theme || null,
    };
  }

  return { plan, meta, days, personalization, selectedDay };
}
