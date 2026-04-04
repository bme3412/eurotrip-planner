'use client';

import React from 'react';
import { X } from 'lucide-react';

const SelectedCitiesList = ({ cities, removeCity }) => {
  if (cities.length === 0) return null;
  
  return (
    <div className="mb-6">
      <h3 className="text-lg font-medium text-slate-800 mb-3">Your Trip Itinerary</h3>
      <div className="flex flex-wrap gap-2">
        {cities.map((city, index) => (
          <div 
            key={index} 
            className="flex items-center gap-2 bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-100"
          >
            <span className="text-sm font-medium text-indigo-700">
              {index + 1}. {city.name} {city.flag}
            </span>
            <button 
              onClick={() => removeCity(index)}
              className="text-indigo-400 hover:text-indigo-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SelectedCitiesList;