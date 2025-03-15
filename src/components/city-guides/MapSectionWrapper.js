'use client';

import React from 'react';
import MapComponent from './MapComponent';

const MapSectionWrapper = ({ city }) => {
  return (
    <div className="mt-8 bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-semibold mb-4">{city} Map</h3>
      <p className="text-sm text-gray-600 mb-4">
        Explore {city}\s neighborhoods, attractions, and landmarks. Click on markers to learn more.
      </p>
      <MapComponent city={city} height={450} />
    </div>
  );
};

export default MapSectionWrapper;