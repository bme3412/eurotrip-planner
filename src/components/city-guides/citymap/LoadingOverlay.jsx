'use client';

import React from 'react';

/**
 * Full-bleed loading spinner shown while the Mapbox style/map is loading.
 */
export default function LoadingOverlay() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-80 backdrop-blur-sm">
      <div className="flex flex-col items-center">
        <div className="h-12 w-12 rounded-full border-4 border-blue-600 border-t-transparent animate-spin mb-3" />
        <div className="text-lg font-medium text-blue-600">Loading map...</div>
      </div>
    </div>
  );
}
