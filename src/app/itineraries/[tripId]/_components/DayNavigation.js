'use client';

import { GOLD } from '../_lib/constants';

export function DayNavigation({ days, activeDayIndex, onDayClick }) {
  return (
    <div className="sticky top-[64px] z-30 -mx-4 overflow-x-auto border-b border-zinc-800 bg-[#0c0c0e]/95 px-4 py-3 shadow-lg backdrop-blur-lg">
      <div className="flex items-center gap-2">
        <span className="mr-2 shrink-0 text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-600">
          Jump to
        </span>
        {days.map((day, i) => {
          const num = day.dayNumber || i + 1;
          const active = i === activeDayIndex;
          return (
            <button
              key={day.date || i}
              onClick={() => onDayClick(i)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold transition-all"
              style={active
                ? { backgroundColor: GOLD, color: '#000' }
                : { backgroundColor: '#27272a', color: '#71717a' }
              }
            >
              {num}
            </button>
          );
        })}
      </div>
    </div>
  );
}
