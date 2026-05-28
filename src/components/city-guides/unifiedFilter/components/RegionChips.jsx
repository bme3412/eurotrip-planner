'use client';

import React from 'react';
import { EURO_REGION_OPTIONS } from '../lib/filterConstants';

export default function RegionChips({ selectedRegion, onRegionChange }) {
  return (
    <div className="pt-3 border-t border-gray-100">
      <div className="flex flex-wrap gap-1.5">
        {EURO_REGION_OPTIONS.map((option) => {
          const isSelected = selectedRegion === option;
          return (
            <button
              key={option}
              onClick={() => onRegionChange(option, 'euro-region')}
              className={`
                px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200
                ${isSelected
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
              `}
              aria-pressed={isSelected}
              aria-label={`Filter by ${option}`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
