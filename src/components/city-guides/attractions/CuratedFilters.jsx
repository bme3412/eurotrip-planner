'use client';

import React from 'react';
import { CURATED_FILTERS } from './lib/constants';

/**
 * The pill row at the top of the attractions tab. Single-select.
 */
export default function CuratedFilters({ active, onSelect }) {
  const activeFilter = CURATED_FILTERS.find((f) => f.id === active);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-3 sm:p-5">
      {/* Single scrollable row on phones so the list stays above the fold;
          wraps normally from sm: up. Matches the tab bar's scroll pattern. */}
      <div className="flex flex-nowrap overflow-x-auto scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap sm:overflow-visible gap-2">
        {CURATED_FILTERS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => onSelect(filter.id)}
            className={`group flex shrink-0 items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 ${
              active === filter.id
                ? 'bg-gray-900 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title={filter.description}
          >
            <span className={`text-base transition-transform duration-200 ${active === filter.id ? 'scale-110' : 'group-hover:scale-110'}`}>
              {filter.icon}
            </span>
            <span>{filter.label}</span>
          </button>
        ))}
      </div>

      {active !== 'all' && activeFilter && (
        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="text-lg">{activeFilter.icon}</span>
            <span>{activeFilter.description}</span>
          </div>
        </div>
      )}
    </div>
  );
}
