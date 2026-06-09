// "Did anything material change for tomorrow?" — the cheap classifier that gates
// the expensive reactive alert. Pure + conservative: Olivier only speaks up when
// the change is real and actionable, never for noise. Unit-testable.

import { timeToMinutes } from '@/lib/concierge/buildContext';

const RAIN_POP = 0.6;            // forecast probability that counts as "rain"
const SEVERE = ['Thunderstorm', 'Snow'];

/** Is there a daytime (10:00–18:00) stop on this day that rain would spoil? */
function hasDaytimeOutdoorPlan(schedule) {
  for (const s of schedule || []) {
    const min = timeToMinutes(s.time);
    if (min != null && min >= 600 && min <= 1080) return s; // 10:00–18:00
  }
  return null;
}

/**
 * Decide whether tomorrow's forecast is a material change worth a proactive ping.
 * @param {object} args
 * @param {object} args.forecast       from getForecastForDate ({ morning, afternoon })
 * @param {object} [args.monthlyNormal] visit-calendar weatherDetails (rainDays…)
 * @param {Array}  [args.schedule]     the day's stops
 * @returns {{ material: boolean, signal?: object }}
 */
export function assessWeatherChange({ forecast, monthlyNormal, schedule }) {
  if (!forecast) return { material: false };

  const m = forecast.morning || {};
  const a = forecast.afternoon || {};
  const severe = SEVERE.includes(m.condition) || SEVERE.includes(a.condition);
  const wetMorning = (m.pop ?? 0) >= RAIN_POP;
  const wetAfternoon = (a.pop ?? 0) >= RAIN_POP;
  if (!severe && !wetMorning && !wetAfternoon) return { material: false };

  // Only surface if the day actually has an outdoor daytime plan to protect…
  const at = hasDaytimeOutdoorPlan(schedule);
  if (!at) return { material: false };

  // …and only if it's a genuine departure from the month's norm (don't ping a
  // traveler in a rainy month that it might rain). rainDays >= 16 ≈ "expected wet".
  const normallyWet = (monthlyNormal?.rainDays ?? 0) >= 16;
  if (normallyWet && !severe) return { material: false };

  const window = wetAfternoon || (a.pop ?? 0) >= (m.pop ?? 0) ? 'afternoon' : 'morning';
  const block = window === 'afternoon' ? a : m;
  return {
    material: true,
    signal: {
      kind: severe ? 'severe' : 'rain',
      window,
      pop: Math.round((block.pop ?? 0) * 100),
      condition: block.condition,
      description: block.description,
      atActivity: at.name,
      atTime: at.time,
    },
  };
}
