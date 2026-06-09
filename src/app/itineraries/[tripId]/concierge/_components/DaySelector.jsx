'use client';

import { Loader2 } from 'lucide-react';

/**
 * Horizontal day picker for the rich preview. Travel days are shown but not
 * selectable (no first activity to brief). The active day shows a spinner while
 * its briefs are being (re)generated.
 */
export default function DaySelector({ days, activeDay, loading, onSelect }) {
  const real = (days || []).filter((d) => !d.isTravelDay);
  if (real.length <= 1) return null;

  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {real.map((d) => {
        const active = d.dayNumber === activeDay;
        return (
          <button
            key={d.dayNumber}
            type="button"
            onClick={() => !active && onSelect(d.dayNumber)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
              active
                ? 'border-[#1e63e9] bg-[#1e63e9] text-white shadow-sm'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
            }`}
          >
            {active && loading && <Loader2 className="h-3 w-3 animate-spin" />}
            Day {d.dayNumber}
            <span className={active ? 'text-white/70' : 'text-gray-400'}>· {d.cityName}</span>
          </button>
        );
      })}
    </div>
  );
}
