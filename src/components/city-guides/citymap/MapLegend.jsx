'use client';

import React from 'react';

const LEGEND_ITEMS = [
  ['bg-green-500', 'Free'],
  ['bg-sky-500', 'Budget'],
  ['bg-amber-500', 'Moderate'],
  ['bg-red-500', 'Expensive'],
];

/**
 * Bottom-right legend explaining the priority-colour scheme used by markers.
 */
export default function MapLegend() {
  return (
    <div className="absolute bottom-4 right-4 z-20 bg-white/95 backdrop-blur-md border border-gray-200 rounded-xl shadow-xl p-4 max-w-xs">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">Map Legend</h3>
      <div className="space-y-2 text-xs">
        {LEGEND_ITEMS.map(([colorClass, label]) => (
          <div key={label} className="flex items-center">
            <div className={`w-3 h-3 rounded-full ${colorClass} mr-2`} />
            <span>{label}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-2 border-t border-gray-200">
        <p className="text-xs text-gray-600">Bigger pin = more iconic landmark</p>
      </div>
    </div>
  );
}
