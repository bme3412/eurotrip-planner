'use client';

import React from 'react';

/**
 * TimeOfDayNav — sticky bucket navigation for the long experiences list.
 *
 * The experiences payload is authored in time-of-day buckets (Morning …
 * Late Night, plus Day Trips / Hidden Corners / …), but the list renders as
 * one ~100-card scroll. This bar keeps those buckets reachable from anywhere
 * in the list: it sticks just below the guide's tab bar and single-selects a
 * bucket via the existing category-filter state (tap again to clear).
 */
export default function TimeOfDayNav({ buckets, totalCount, active, onSelect }) {
  if (!Array.isArray(buckets) || buckets.length < 2) return null;

  const chipClass = (isActive) =>
    `inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
      isActive
        ? 'bg-blue-600 text-white shadow-sm'
        : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
    }`;

  return (
    // Sits below the guide's fixed tab bar (which is ~60px tall once stuck).
    <div className="sticky top-[64px] z-20" role="group" aria-label="Jump to a time of day">
      <div className="flex flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide rounded-2xl border border-gray-200 bg-white/95 p-2 shadow-sm backdrop-blur">
        <button
          type="button"
          aria-pressed={active == null}
          onClick={() => onSelect(null)}
          className={chipClass(active == null)}
        >
          <span aria-hidden="true">✨</span>
          All
          <span className={`text-xs ${active == null ? 'text-blue-100' : 'text-gray-400'}`}>{totalCount}</span>
        </button>
        {buckets.map((bucket) => {
          const isActive = active === bucket.key;
          return (
            <button
              key={bucket.key}
              type="button"
              aria-pressed={isActive}
              onClick={() => onSelect(isActive ? null : bucket.key)}
              className={chipClass(isActive)}
            >
              <span aria-hidden="true">{bucket.icon}</span>
              {bucket.label}
              <span className={`text-xs ${isActive ? 'text-blue-100' : 'text-gray-400'}`}>{bucket.count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
