'use client';

import { Thermometer } from 'lucide-react';
import { fmtDate, ACCENT } from './shared';

/** 'YYYY-MM-DD' → 'July' (local-parsed, never throws). */
function monthLabel(dateStr) {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'long' });
}

/**
 * "When you're going" — a compact seasonal context strip echoing the homepage's
 * timing framing ("the right time changes everything"). Built from data already
 * on the itinerary: trip dates + each city's first per-day weather note. Renders
 * nothing when neither is present, so it degrades gracefully on sparse trips.
 */
export default function SeasonStrip({ itinerary, t }) {
  const meta = itinerary?.meta || {};
  const hasDates = !!(meta.startDate && meta.endDate);

  // First weather note per city, in route order.
  const byCity = new Map();
  for (const d of itinerary?.days || []) {
    if (d.isTravelDay) continue;
    const city = d.cityName || d.city;
    if (city && d.weatherNote && !byCity.has(city)) byCity.set(city, d.weatherNote);
  }

  if (!hasDates && byCity.size === 0) return null;
  const month = monthLabel(meta.startDate);

  return (
    <section className={`mb-6 rounded-2xl border px-5 py-4 ${t.panel}`}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>
          When you&rsquo;re going
        </h2>
        {hasDates && (
          <span className={`text-sm font-medium ${t.heading}`}>
            {fmtDate(meta.startDate)} – {fmtDate(meta.endDate)}
            {meta.totalDays ? ` · ${meta.totalDays} days` : ''}
          </span>
        )}
        {month && <span className={`text-sm ${t.muted}`}>· {month}</span>}
      </div>

      {byCity.size > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {[...byCity.entries()].map(([city, note]) => (
            <span
              key={city}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs ring-1 ${t.chip}`}
            >
              <Thermometer className="h-3 w-3 shrink-0" style={{ color: ACCENT }} />
              <span className="font-semibold">{city}</span>
              <span className={t.muted}>{note}</span>
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
