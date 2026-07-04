/**
 * Best-months derivation for the "When to Go" short-answer strip.
 *
 * Works on `visitCalendar.months` — per-month `ranges` where each range
 * covers a set of day numbers with a 1–5 visit score. A month's quality is
 * the day-weighted average of its range scores.
 *
 * Pure data helpers, no React — unit-testable in plain Node.
 */

const MONTH_ORDER = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

/** Day-weighted average score for one month's `ranges`; null when unscored. */
export function monthAverageScore(month) {
  const ranges = Array.isArray(month?.ranges) ? month.ranges : [];
  let weighted = 0;
  let days = 0;
  for (const range of ranges) {
    const count = Array.isArray(range?.days) ? range.days.length : 0;
    if (count === 0 || typeof range?.score !== 'number') continue;
    weighted += range.score * count;
    days += count;
  }
  return days > 0 ? weighted / days : null;
}

/**
 * The months worth leading with, in calendar order.
 *
 * Returns `[{ key, name, avg }]` for months averaging in the top band
 * (>= 4.5). When fewer than `min` qualify the threshold relaxes to "Good"
 * (>= 4), so quieter cities still get an answer. Capped at `max` (best
 * averages win) so the strip stays a short answer, never a second calendar.
 */
export function computeBestMonths(months, { min = 2, max = 6 } = {}) {
  if (!months || typeof months !== 'object') return [];

  const scored = MONTH_ORDER
    .map((key) => {
      const avg = monthAverageScore(months[key]);
      if (avg == null) return null;
      const name = months[key]?.name
        || key.charAt(0).toUpperCase() + key.slice(1);
      return { key, name, avg };
    })
    .filter(Boolean);

  let best = scored.filter((m) => m.avg >= 4.5);
  if (best.length < min) best = scored.filter((m) => m.avg >= 4);
  if (best.length < min) return [];

  if (best.length > max) {
    const keep = new Set(
      [...best].sort((a, b) => b.avg - a.avg).slice(0, max).map((m) => m.key),
    );
    best = best.filter((m) => keep.has(m.key));
  }
  return best;
}
