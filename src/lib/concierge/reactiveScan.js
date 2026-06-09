// Per-trip reactive scan: is there a material weather change for the traveler's
// TOMORROW worth a proactive ping? Combines the live forecast + the month's norm +
// the day's plan. Returns the event payload to dispatch, or null. Cheap (one OWM
// fetch, no LLM) so the cron can run it across all active trips.

import { getCityData, getCityVisitCalendar } from '@/lib/data-utils';
import { extractWeather } from '@/app/itineraries/[tripId]/_lib/buildPlan';
import { buildConciergeContext } from '@/lib/concierge/buildContext';
import { resolveTimeZone } from '@/components/city-guides/citymap/lib/timezone';
import { localDateIn, addDays, dayNumberForLocalDate } from '@/lib/concierge/schedule';
import { getForecastForDate } from '@/lib/concierge/weatherLive';
import { assessWeatherChange } from '@/lib/concierge/materiality';

function coordsFor(day, cityData) {
  const a = day?.firstActivity;
  if (Number.isFinite(a?.lat) && Number.isFinite(a?.lng)) return { lat: a.lat, lon: a.lng };
  const c = cityData?.coordinates;
  if (Array.isArray(c) && c.length === 2) return { lon: Number(c[0]), lat: Number(c[1]) }; // [lng,lat]
  if (c && Number.isFinite(c.lat)) return { lat: c.lat, lon: c.lng ?? c.lon };
  return null;
}

/**
 * @returns {Promise<null | { tripId, dayNumber, signal, localDate }>}
 */
export async function scanTripForReactive(trip, prefs = {}, now = new Date()) {
  const tz = prefs.timezone || resolveTimeZone(trip?.country);
  if (!tz) return null;

  const tomorrow = addDays(localDateIn(tz, now), 1);
  const dayNumber = dayNumberForLocalDate(trip, tomorrow);
  if (dayNumber == null) return null; // tomorrow isn't a trip day

  const ctx = buildConciergeContext(trip, { dayNumber });
  const day = ctx.selectedDay;
  if (!day || !(day.schedule || []).length) return null;

  const citySlug = day.city || trip.city || 'paris';
  let cityData = null;
  try { cityData = await getCityData(citySlug); } catch { /* */ }
  const coords = coordsFor(day, cityData);
  if (!coords) return null;

  const forecast = await getForecastForDate({ lat: coords.lat, lon: coords.lon, dateStr: tomorrow });
  if (!forecast) return null; // no OWM key / no data → no reactive

  let monthlyNormal = null;
  try {
    const cal = await getCityVisitCalendar(citySlug);
    monthlyNormal = extractWeather(cal, day.date || tomorrow);
  } catch { /* */ }

  const { material, signal } = assessWeatherChange({ forecast, monthlyNormal, schedule: day.schedule });
  if (!material) return null;

  return { tripId: trip.id, dayNumber, signal, localDate: tomorrow };
}
