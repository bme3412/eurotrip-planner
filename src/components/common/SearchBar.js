'use client';

import React from 'react';
import { Search } from 'lucide-react';

const SearchBar = ({ 
  startCity, 
  setStartCity, 
  startDate, 
  setStartDate, 
  endDate, 
  setEndDate, 
  tripDuration, 
  onSearch 
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 mb-12">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Plan Your European Adventure</h2>
      <form onSubmit={onSearch} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
          <div className="md:col-span-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Where would you like to start?
            </label>
            <input
              type="text"
              placeholder="Enter a city"
              value={startCity}
              onChange={(e) => setStartCity(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 transition-colors"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 transition-colors"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 transition-colors"
            />
          </div>

          <div className="md:col-span-2">
            <button 
              type="submit"
              className="w-full bg-indigo-600 text-white py-3 px-4 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
            >
              <Search className="h-5 w-5" />
              <span>Search</span>
            </button>
          </div>
        </div>

        {tripDuration > 0 && (
          <div className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg inline-block">
            <span className="font-medium">{tripDuration} days</span> • Ideal for {Math.min(Math.ceil(tripDuration / 3), 10)} destinations
          </div>
        )}
      </form>
    </div>
  );
};

export default SearchBar;