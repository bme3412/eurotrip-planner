import { Moon, Sunrise, Sparkles, Plane } from 'lucide-react';

/**
 * The whole-trip cadence at a glance — the *rhythm* is the product. One row per
 * day with its city, theme, and the touches Olivier would send. The active day
 * is highlighted; clicking a day jumps the rich preview to it.
 */
export default function RhythmTimeline({ days, activeDay, onSelect }) {
  if (!days?.length) return null;
  return (
    <ol className="relative space-y-1.5 border-l border-gray-200 pl-5">
      {days.map((d) => {
        const active = d.dayNumber === activeDay;
        const selectable = !d.isTravelDay;
        return (
          <li key={d.dayNumber} className="relative">
            <span
              className={`absolute -left-[1.42rem] top-3 h-2.5 w-2.5 rounded-full ring-4 ring-[#faf8f3] ${
                active ? 'bg-[#1e63e9]' : d.isTravelDay ? 'bg-gray-300' : 'bg-blue-200'
              }`}
            />
            <button
              type="button"
              disabled={!selectable}
              onClick={() => selectable && onSelect(d.dayNumber)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                active ? 'bg-white shadow-sm ring-1 ring-blue-100' : selectable ? 'hover:bg-white/70' : 'opacity-70'
              }`}
            >
              <div className="w-14 shrink-0">
                <div className="text-xs font-bold text-gray-900">Day {d.dayNumber}</div>
                {d.dateLabel && <div className="text-[10px] text-gray-400">{d.dateLabel.replace(/,.*$/, '')}</div>}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-gray-800">
                  {d.isTravelDay ? 'Travel day' : d.cityName}
                </div>
                <div className="truncate text-xs text-gray-500">
                  {d.isTravelDay ? 'In transit · a light check-in' : d.theme || d.firstActivity?.name || 'Open exploration'}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1 text-gray-300">
                {d.isTravelDay ? (
                  <Plane className="h-3.5 w-3.5" />
                ) : (
                  <>
                    <Sunrise className="h-3.5 w-3.5" />
                    <Sparkles className="h-3.5 w-3.5" />
                    <Moon className="h-3.5 w-3.5" />
                  </>
                )}
              </div>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
