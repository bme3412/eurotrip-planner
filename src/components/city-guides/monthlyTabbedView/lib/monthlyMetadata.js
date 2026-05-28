// Derived metadata helpers used by the orchestrator to build a month header
// tagline and the "Peak/Shoulder/Low Season" chip.

export function tempString(p) {
  const t = p?.weather?.average_temperature;
  if (!t) return null;
  const high = t.high_celsius ?? t.highC ?? t.high;
  const low = t.low_celsius ?? t.lowC ?? t.low;
  if (!high && !low) return null;
  return `${low ?? ''}${low ? ' – ' : ''}${high ?? ''}`;
}

/**
 * Build a short, positive tagline for the month header.
 *
 * Priority order:
 *   1. Authored `taglines[<monthLabel>]` rotated by day-of-month (deterministic).
 *   2. First reason-to-visit, optionally enriched with events or attractions.
 *   3. Events/attractions alone if no reasons are authored.
 *   4. Temperature ranges from first/second half weather.
 *   5. Generic fallback.
 */
export function generateMonthTagline({ taglines, monthLabel, visitList, monthJson, events, firstHalf, secondHalf, cityName }) {
  if (taglines && monthLabel && Array.isArray(taglines[monthLabel]) && taglines[monthLabel].length > 0) {
    const idx = new Date().getDate() % taglines[monthLabel].length;
    return taglines[monthLabel][idx];
  }

  const topReasons = visitList.map((r) => r?.reason).filter(Boolean);
  const attractions = Array.isArray(monthJson?.unique_experiences)
    ? monthJson.unique_experiences.map((e) => e?.activity).filter(Boolean)
    : [];

  if (topReasons.length > 0) {
    const reason = topReasons[0];
    const extra = events.length > 0
      ? 'plus vibrant local events'
      : attractions.length > 0
        ? `and ${attractions[0].toLowerCase()}`
        : null;
    if (extra) return `${reason} — ${extra} across ${cityName || 'the city'}`;
    return `${reason} — a perfect time to explore ${cityName || 'the city'}`;
  }

  if (events.length > 0 || attractions.length > 0) {
    const lead = events.length > 0 ? 'Festivals and neighborhood happenings' : 'Signature experiences and must‑see sights';
    const tail = attractions.length > 0 ? `like ${attractions.slice(0, 2).join(' and ').toLowerCase()}` : 'to fill your days';
    return `${lead} ${tail}`;
  }

  const early = tempString(firstHalf);
  const late = tempString(secondHalf);
  if (early || late) {
    const range = early && late ? `${early} • ${late}` : (early || late);
    return `Easy sightseeing days (${range}) and plenty of time for cafes, galleries, and evening strolls`;
  }

  return `A welcoming month to uncover ${cityName || 'the city'} — from iconic landmarks to local gems`;
}

/**
 * Derive the "Peak / Shoulder / Low Season" pill from the tourism level,
 * or null if no tourism level is known.
 */
export function getSeasonInfo(tourismLevel) {
  const lvl = typeof tourismLevel === 'number' ? tourismLevel : null;
  if (lvl == null) return null;
  if (lvl >= 8) return { label: 'Peak Season', cls: 'bg-zinc-900 text-white' };
  if (lvl >= 5) return { label: 'Shoulder Season', cls: 'bg-zinc-100 text-zinc-800 ring-1 ring-zinc-200' };
  return { label: 'Low Season', cls: 'bg-zinc-100 text-zinc-800 ring-1 ring-zinc-200' };
}
