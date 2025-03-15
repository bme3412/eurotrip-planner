// src/components/city-guides/MonthlyEvents.js
'use client';

import React, { useState } from 'react';

const MonthlyEvents = ({ monthlyData }) => {
  const months = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december',
    'spring', 'summer', 'fall', 'winter'
  ];
  
  // Filter available months that exist in data
  const availableMonths = months.filter(month => monthlyData[month]);
  
  // Get current month (correctly using toLocaleLowerCase)
  const currentDate = new Date();
  const currentMonthName = currentDate.toLocaleString('en-US', { month: 'long' }).toLowerCase();
  
  // Default to current month or first available
  const [selectedMonth, setSelectedMonth] = useState(
    monthlyData[currentMonthName] ? currentMonthName : (availableMonths[0] || 'january')
  );
  
  // No data available
  if (availableMonths.length === 0) {
    return (
      <div className="bg-gray-50 p-6 rounded-lg text-center">
        <p className="text-gray-500">No monthly event data available for this city.</p>
      </div>
    );
  }
  
  const formatMonthLabel = (month) => {
    return month.charAt(0).toUpperCase() + month.slice(1);
  };
  
  // Get the current month's data
  const currentMonthData = monthlyData[selectedMonth] || {};
  
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-6">
        {availableMonths.map(month => (
          <button
            key={month}
            onClick={() => setSelectedMonth(month)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors
              ${selectedMonth === month 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            {formatMonthLabel(month)}
          </button>
        ))}
      </div>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6">
          <h3 className="text-xl font-semibold mb-4">
            {formatMonthLabel(selectedMonth)} in {currentMonthData.city || 'the city'}
          </h3>
          
          {currentMonthData.overview && (
            <div className="mb-6">
              <p className="text-gray-700">{currentMonthData.overview}</p>
            </div>
          )}
          
          {currentMonthData.weather && (
            <div className="mb-6 p-4 bg-blue-50 rounded-md">
              <h4 className="font-medium text-blue-800 mb-1 flex items-center">
                <span className="mr-2">🌤️</span>
                Weather
              </h4>
              <p className="text-gray-700">{currentMonthData.weather}</p>
              
              {currentMonthData.temperature && (
                <div className="mt-2 flex flex-wrap gap-4">
                  <div className="text-sm">
                    <span className="font-medium">Average High:</span> {currentMonthData.temperature.high}°C
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Average Low:</span> {currentMonthData.temperature.low}°C
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Events section */}
          {currentMonthData.events && currentMonthData.events.length > 0 && (
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                <span className="mr-2">🎭</span>
                Events & Festivals
              </h4>
              <ul className="space-y-3">
                {currentMonthData.events.map((event, index) => (
                  <li key={index} className="bg-gray-50 p-3 rounded-md">
                    <h5 className="font-medium">{event.name}</h5>
                    {event.date && <p className="text-sm text-gray-600 mt-1">📅 {event.date}</p>}
                    {event.description && <p className="text-sm mt-1">{event.description}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Activities section */}
          {currentMonthData.activities && currentMonthData.activities.length > 0 && (
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                <span className="mr-2">🚶</span>
                Recommended Activities
              </h4>
              <ul className="space-y-2">
                {currentMonthData.activities.map((activity, index) => (
                  <li key={index} className="flex items-start">
                    <span className="inline-block bg-green-100 text-green-800 rounded-full w-6 h-6 flex items-center justify-center mr-2 mt-0.5">
                      {index + 1}
                    </span>
                    <div>
                      {typeof activity === 'string' ? (
                        <p>{activity}</p>
                      ) : (
                        <>
                          <p className="font-medium">{activity.name}</p>
                          {activity.description && <p className="text-sm mt-1">{activity.description}</p>}
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Tips section */}
          {currentMonthData.tips && currentMonthData.tips.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                <span className="mr-2">💡</span>
                Traveler Tips
              </h4>
              <ul className="space-y-2">
                {currentMonthData.tips.map((tip, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-yellow-500 mr-2">•</span>
                    <p className="text-gray-700">{tip}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* If no structured content is available */}
          {!currentMonthData.events && !currentMonthData.activities && !currentMonthData.tips && !currentMonthData.overview && (
            <div className="text-center py-6">
              <p className="text-gray-500">Detailed information for {formatMonthLabel(selectedMonth)} is not available.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MonthlyEvents;