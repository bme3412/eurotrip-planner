'use client';

import React from 'react';

export default function ActiveFilterPills({
  selectedRegion,
  selectedCountries,
  onRegionChange,
  onCountryChange,
}) {
  const showRegionPill =
    selectedRegion !== 'All' && selectedRegion !== 'All Regions';
  const showAny = showRegionPill || selectedCountries.length > 0;

  if (!showAny) return null;

  return (
    <div className="mt-4 pt-3 border-t border-gray-100">
      <div className="flex flex-wrap gap-2">
        {showRegionPill && (
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm bg-blue-100 text-blue-800">
            Region: {selectedRegion}
            <button
              onClick={() => onRegionChange('All Regions', 'euro-region')}
              className="ml-2 hover:text-blue-600"
            >
              ×
            </button>
          </span>
        )}
        {selectedCountries.map((country) => (
          <span
            key={country}
            className="inline-flex items-center px-3 py-1.5 rounded-full text-sm bg-green-100 text-green-800"
          >
            {country}
            <button
              onClick={() => onCountryChange(country)}
              className="ml-2 hover:text-green-600"
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
