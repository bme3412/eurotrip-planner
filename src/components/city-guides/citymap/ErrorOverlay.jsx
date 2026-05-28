'use client';

import React from 'react';

/**
 * Full-bleed error card shown when Mapbox fails to initialise or render.
 */
export default function ErrorOverlay({ message }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-90">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md">
        <h3 className="text-lg font-bold text-red-600 mb-2">Map Error</h3>
        <p className="text-gray-700">{message}</p>
        <p className="text-gray-500 mt-2 text-sm">Please refresh the page to try again.</p>
      </div>
    </div>
  );
}
