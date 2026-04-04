'use client';

import React from 'react';
import { ArrowRight } from 'lucide-react';

const TripRouteDisplay = ({ cities, tripDuration }) => {
  // No cities to display
  if (cities.length === 0) {
    return (
      <div className="bg-white rounded-xl p-8 text-center shadow-md">
        <h3 className="text-xl font-medium text-slate-800 mb-4">Your trip is empty</h3>
        <p className="text-slate-600 mb-6">Start by adding destinations to your itinerary</p>
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Explore destinations
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-md mb-8">
      <h3 className="text-xl font-bold text-slate-800 mb-6">Your Trip Route</h3>
      <div className="flex flex-wrap items-center mb-6">
        {cities.map((city, index) => (
          <React.Fragment key={index}>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                {index + 1}
              </div>
              <span className="mt-2 text-sm font-medium text-slate-700">{city.name} {city.flag}</span>
            </div>
            {index < cities.length - 1 && (
              <ArrowRight className="mx-4 text-slate-400" />
            )}
          </React.Fragment>
        ))}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-indigo-50 rounded-lg p-4">
          <h4 className="font-medium text-indigo-800 mb-1">Trip Length</h4>
          <p className="text-sm">{tripDuration > 0 ? `${tripDuration} days` : 'Dates not set'}</p>
        </div>
        
        <div className="bg-indigo-50 rounded-lg p-4">
          <h4 className="font-medium text-indigo-800 mb-1">Countries</h4>
          <p className="text-sm">{[...new Set(cities.map(city => city.country))].join(', ')}</p>
        </div>
        
        <div className="bg-indigo-50 rounded-lg p-4">
          <h4 className="font-medium text-indigo-800 mb-1">Destinations</h4>
          <p className="text-sm">{cities.length} cities</p>
        </div>
      </div>
    </div>
  );
};

export default TripRouteDisplay;