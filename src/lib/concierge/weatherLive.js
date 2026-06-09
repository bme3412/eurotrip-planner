// Live weather source for the reactive layer. Pulls tomorrow's forecast from
// OpenWeatherMap (the same provider + threshold shape as infra/handlers/weather.js)
// and reduces it to the morning/afternoon precipitation signal the materiality
// check needs. No-ops (returns null) without OPENWEATHERMAP_API_KEY, so the whole
// reactive path degrades gracefully.

const OWM_BASE = 'https://api.openweathermap.org/data/2.5';

/** Reduce the 3-hourly forecast list to the entries for a single date. */
function forDate(list, dateStr) {
  const items = (list || []).filter((i) => i.dt_txt?.startsWith(dateStr));
  if (!items.length) return null;
  const morning = items.find((i) => i.dt_txt?.includes('09:00')) || items[0];
  const afternoon = items.find((i) => i.dt_txt?.includes('15:00')) || items[items.length - 1];
  const pick = (i) => ({
    pop: i.pop ?? 0, // probability of precipitation, 0..1
    condition: i.weather?.[0]?.main || null, // Rain / Clear / Thunderstorm / Snow…
    description: i.weather?.[0]?.description || null,
    tempC: i.main?.temp ?? null,
  });
  return { date: dateStr, morning: pick(morning), afternoon: pick(afternoon) };
}

/**
 * Tomorrow's (or any date's) forecast for a coordinate.
 * @returns {Promise<null | { date, morning, afternoon }>}
 */
export async function getForecastForDate({ lat, lon, dateStr }) {
  const key = process.env.OPENWEATHERMAP_API_KEY;
  if (!key || !Number.isFinite(lat) || !Number.isFinite(lon) || !dateStr) return null;
  try {
    const res = await fetch(
      `${OWM_BASE}/forecast?lat=${lat}&lon=${lon}&appid=${key}&units=metric&cnt=40`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return forDate(data.list, dateStr);
  } catch (err) {
    console.error('[concierge/weatherLive] fetch failed:', err?.message);
    return null;
  }
}
