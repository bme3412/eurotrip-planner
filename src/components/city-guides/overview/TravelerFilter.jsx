'use client';

import React from 'react';
import { TRAVELER_OPTIONS, TRAVELER_PILL_LABELS } from './lib/constants';

/**
 * "Best time for: Everyone / Families / Couples / …" filter pills.
 *
 * Props:
 *   • active                — current filter id
 *   • onChange(filterId)    — called when user clicks a pill
 */
export default function TravelerFilter({ active, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-2 py-1.5">
      <span className="text-xs font-medium text-gray-500">Best time for:</span>
      {TRAVELER_OPTIONS.map((type) => (
        <button
          key={type}
          type="button"
          onClick={() => onChange?.(type)}
          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
            active === type
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600'
          }`}
        >
          {TRAVELER_PILL_LABELS[type]}
        </button>
      ))}
    </div>
  );
}
