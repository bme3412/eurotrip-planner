import React from 'react';

/**
 * Header row for the monthly tab: title, optional season chip, and the
 * 12-pill month selector. Marks the current calendar month with a small blue
 * dot when it isn't the active selection.
 */
export default function MonthSelector({ months, selectedIdx, nowIdx, seasonInfo, onSelect }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex items-center gap-3">
        {/* Eyebrow, not a heading — the month h2 below ("June in Paris") is
            the section's real title. Mirrors the calendar card's eyebrow. */}
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600">
          Monthly guide
        </p>
        {seasonInfo && (
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${seasonInfo.cls}`}>
            {seasonInfo.label}
          </span>
        )}
      </div>

      <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
        <nav className="flex gap-1 min-w-max">
          {months.map((mm) => {
            const isSelected = selectedIdx === mm.idx;
            const isCurrentMonth = mm.idx === nowIdx;
            return (
              <button
                key={mm.idx}
                onClick={() => onSelect(mm.idx)}
                className={`relative px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                  isSelected
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {mm.name.slice(0, 3)}
                {isCurrentMonth && !isSelected && (
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
