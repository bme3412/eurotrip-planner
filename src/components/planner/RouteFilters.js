'use client';

import React from 'react';

const RouteFilters = ({ filters, setFilters }) => {
  const durations = [
    { id: 'short', label: 'Short Trip (3-7 days)' },
    { id: 'medium', label: 'Medium Trip (8-14 days)' },
    { id: 'long', label: 'Long Trip (15+ days)' }
  ];
  
  const travelPaces = [
    { id: 'slow', label: 'Relaxed (fewer destinations)' },
    { id: 'moderate', label: 'Moderate' },
    { id: 'fast', label: 'Fast-paced (many destinations)' }
  ];
  
  const budgetRanges = [
    { id: 'budget', label: 'Budget' },
    { id: 'moderate', label: 'Moderate' },
    { id: 'luxury', label: 'Luxury' }
  ];
  
  const handleDurationChange = (durationId) => {
    setFilters({...filters, duration: durationId });
  };
  
  const handlePaceChange = (paceId) => {
    setFilters({...filters, pace: paceId });
  };
  
  const handleBudgetChange = (budgetId) => {
    setFilters({...filters, budget: budgetId });
  };
  
  return (
    <div className="bg-white rounded-xl shadow-md p-6 mb-8">
      <h3 className="text-lg font-bold text-slate-800 mb-4">Customize Your Route</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <h4 className="text-sm font-medium text-slate-700 mb-2">Trip Duration</h4>
          <div className="space-y-2">
            {durations.map((duration) => (
              <label key={duration.id} className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="duration" 
                  checked={filters.duration === duration.id}
                  onChange={() => handleDurationChange(duration.id)}
                  className="accent-indigo-600"
                />
                <span className="text-sm">{duration.label}</span>
              </label>
            ))}
          </div>
        </div>
        
        <div>
          <h4 className="text-sm font-medium text-slate-700 mb-2">Travel Pace</h4>
          <div className="space-y-2">
            {travelPaces.map((pace) => (
              <label key={pace.id} className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="pace" 
                  checked={filters.pace === pace.id}
                  onChange={() => handlePaceChange(pace.id)}
                  className="accent-indigo-600"
                />
                <span className="text-sm">{pace.label}</span>
              </label>
            ))}
          </div>
        </div>
        
        <div>
          <h4 className="text-sm font-medium text-slate-700 mb-2">Budget</h4>
          <div className="space-y-2">
            {budgetRanges.map((budget) => (
              <label key={budget.id} className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="budget" 
                  checked={filters.budget === budget.id}
                  onChange={() => handleBudgetChange(budget.id)}
                  className="accent-indigo-600"
                />
                <span className="text-sm">{budget.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RouteFilters;