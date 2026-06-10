'use client';

import { useEffect, useRef } from 'react';
import { Loader2, Plane, Check } from 'lucide-react';

/** "Jun 19, 2026" / "2026-06-19" → "Jun 19". Null-safe. */
function shortDate(day) {
  if (day?.dateLabel) {
    const m = day.dateLabel.match(/^([A-Za-z]{3,9} \d{1,2})/);
    if (m) return m[1];
  }
  if (day?.date) {
    const d = new Date(`${day.date}T00:00:00`);
    if (!Number.isNaN(d.getTime())) {
      return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(d);
    }
  }
  return null;
}

/**
 * Horizontal day picker for the rich preview. Every day appears so the
 * numbering never skips: travel days render as non-selectable ✈ markers
 * pointing at the next city (selecting one server-side would silently fall
 * back to the first real day). A dot marks days already loaded — those switch
 * instantly. The active day shows a spinner while its briefs are written.
 */
export default function DaySelector({ days, activeDay, loading, onSelect, loadedDays }) {
  const all = days || [];
  const activeRef = useRef(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' });
  }, [activeDay]);

  if (all.filter((d) => !d.isTravelDay).length <= 1) return null;

  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {all.map((d, i) => {
        const date = shortDate(d);

        if (d.isTravelDay) {
          // The city you wake up in next — the first different city after this day.
          const nextCity = all.slice(i + 1).find((n) => !n.isTravelDay)?.cityName || null;
          return (
            <span
              key={d.dayNumber}
              aria-disabled="true"
              title="Travel day — Olivier sends one check-in"
              className="flex shrink-0 flex-col items-start rounded-2xl border border-dashed border-gray-300 bg-gray-50/60 px-3.5 py-1.5 text-xs font-semibold text-gray-400"
            >
              <span className="flex items-center gap-1.5">
                <Plane className="h-3 w-3" />
                Day {d.dayNumber}
                {nextCity && <span className="font-medium">→ {nextCity}</span>}
              </span>
              {date && <span className="text-[10px] font-medium text-gray-300">{date}</span>}
            </span>
          );
        }

        const active = d.dayNumber === activeDay;
        const ready = !active && loadedDays?.has(d.dayNumber);
        return (
          <button
            key={d.dayNumber}
            ref={active ? activeRef : null}
            type="button"
            onClick={() => !active && onSelect(d.dayNumber)}
            className={`flex shrink-0 flex-col items-start rounded-2xl border px-3.5 py-1.5 text-xs font-semibold transition ${
              active
                ? 'border-[#1e63e9] bg-[#1e63e9] text-white shadow-sm'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
            }`}
          >
            <span className="flex items-center gap-1.5">
              {active && loading && <Loader2 className="h-3 w-3 animate-spin" />}
              Day {d.dayNumber}
              <span className={active ? 'text-white/70' : 'text-gray-400'}>· {d.cityName}</span>
              {ready && <Check className="h-3 w-3 text-emerald-500" aria-label="Ready" />}
            </span>
            {date && (
              <span className={`text-[10px] font-medium ${active ? 'text-white/60' : 'text-gray-400'}`}>{date}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
