'use client';
// src/components/city-guides/CityVisitSection.js
import React from 'react';
import MonthlyCalendarView from '../monthly-visit-guide/MonthlyCalendarView';

const CityVisitSection = ({ cityName, countryName, monthlyData }) => {
  // If no monthly data is provided, show empty state
  if (!monthlyData || Object.keys(monthlyData).length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <div className="text-center py-10">
          <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No Visit Calendar Available</h3>
          <p className="mt-2 text-sm text-gray-500">
            We don&apos;t have specific time recommendations for {cityName} yet. 
            Check back later for seasonal information.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
        <h3 className="text-xl font-semibold mb-6">When to Visit {cityName}</h3>
        <MonthlyCalendarView 
          monthlyData={monthlyData}
          initialMonth={new Date().getMonth()}
        />
      </div>
    </div>
  );
};

export default CityVisitSection;