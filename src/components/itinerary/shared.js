/**
 * Shared helpers + theme tokens for the itinerary layout variants.
 * Kept framework-light so all three variants stay consistent.
 */

export const ACCENT = '#c9963c'; // brand gold

export const SLOT_META = {
  early_morning: { label: 'Early', tone: 'text-amber-500', dot: 'bg-amber-400' },
  morning: { label: 'Morning', tone: 'text-amber-500', dot: 'bg-amber-400' },
  late_morning: { label: 'Late morning', tone: 'text-amber-600', dot: 'bg-amber-500' },
  lunch: { label: 'Lunch', tone: 'text-rose-500', dot: 'bg-rose-400' },
  afternoon: { label: 'Afternoon', tone: 'text-sky-500', dot: 'bg-sky-400' },
  late_afternoon: { label: 'Late afternoon', tone: 'text-indigo-500', dot: 'bg-indigo-400' },
  evening: { label: 'Evening', tone: 'text-violet-500', dot: 'bg-violet-400' },
};

export function slotMeta(time) {
  return SLOT_META[(time || '').toLowerCase()] || { label: time || '', tone: 'text-zinc-400', dot: 'bg-zinc-400' };
}

export const TRANSPORT_ICON = { flight: '✈️', train: '🚆', bus: '🚌', ferry: '⛴️', car: '🚗' };

/** Theme token sets for light/dark. */
export function tokens(theme) {
  if (theme === 'dark') {
    return {
      page: 'bg-[#0c0c0e] text-zinc-100',
      panel: 'bg-[#141417] border-zinc-800',
      panelSoft: 'bg-[#101013] border-zinc-800/70',
      border: 'border-zinc-800',
      heading: 'text-white',
      body: 'text-zinc-300',
      muted: 'text-zinc-500',
      chip: 'bg-zinc-800/80 text-zinc-300 ring-zinc-700',
      railBg: 'bg-[#101013]',
      hover: 'hover:bg-zinc-800/50',
    };
  }
  return {
    page: 'bg-[#fafaf7] text-zinc-900',
    panel: 'bg-white border-zinc-200',
    panelSoft: 'bg-white border-zinc-200/80',
    border: 'border-zinc-200',
    heading: 'text-zinc-950',
    body: 'text-zinc-700',
    muted: 'text-zinc-500',
    chip: 'bg-zinc-100 text-zinc-700 ring-zinc-200',
    railBg: 'bg-white',
    hover: 'hover:bg-zinc-50',
  };
}

/** Interleave city days with their travel-day transfers into one ordered list. */
export function buildTimeline(itinerary) {
  return (itinerary.days || []).map((d) => ({ kind: d.isTravelDay ? 'transfer' : 'day', day: d }));
}

/** Group consecutive city days into city segments (skipping travel days). */
export function citySegments(itinerary) {
  const segs = [];
  for (const d of itinerary.days || []) {
    if (d.isTravelDay) { segs.push({ travel: d }); continue; }
    const last = segs[segs.length - 1];
    if (last && last.city === d.cityName) last.days.push(d);
    else segs.push({ city: d.cityName, country: d.country, citySlug: d.city, days: [d] });
  }
  return segs;
}

export function fmtDate(d) {
  if (!d) return '';
  const date = new Date(`${d}T00:00:00`);
  if (Number.isNaN(date.getTime())) return d;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** A photo stand-in: a stable gradient per city (real Google photos plug in later). */
export function cityGradient(slug) {
  const map = {
    berlin: 'linear-gradient(135deg,#2d4a3e,#16241d)',
    krakow: 'linear-gradient(135deg,#8b4513,#4d2810)',
    nice: 'linear-gradient(135deg,#1f6f72,#0f3536)',
  };
  return map[slug] || 'linear-gradient(135deg,#5b5b66,#2b2b33)';
}
