'use client';

import React, { useState, useEffect } from 'react';

// Enhanced color scheme with better explanations
const VISIT_RATINGS = {
  5: {
    color: '#059669', // Dark green
    bgColor: '#d1fae5',
    label: 'Excellent',
    description: 'Perfect weather, fewer crowds, major events',
    priceIndicator: '💚 Best Value',
    explanation: 'Ideal conditions with comfortable weather, manageable crowds, and often lower prices'
  },
  4: {
    color: '#10b981', // Green
    bgColor: '#ecfdf5',
    label: 'Good',
    description: 'Great weather, moderate crowds',
    priceIndicator: '💚 Good Value',
    explanation: 'Very good conditions with pleasant weather and reasonable tourist levels'
  },
  3: {
    color: '#f59e0b', // Amber
    bgColor: '#fffbeb',
    label: 'Average',
    description: 'Mixed conditions, peak crowds',
    priceIndicator: '💰 Peak Prices',
    explanation: 'Standard tourist season with higher prices and crowds, but good weather'
  },
  2: {
    color: '#f97316', // Orange
    bgColor: '#fff7ed',
    label: 'Below Average',
    description: 'Weather issues, high prices',
    priceIndicator: '💰 High Prices',
    explanation: 'Challenging conditions with potential weather issues and premium pricing'
  },
  1: {
    color: '#dc2626', // Red
    bgColor: '#fef2f2',
    label: 'Poor',
    description: 'Avoid if possible',
    priceIndicator: '❌ Avoid',
    explanation: 'Difficult conditions with extreme weather, closures, or major inconveniences'
  }
};

const EnhancedVisitCalendar = ({ cityName, monthlyData }) => {
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [hoveredMonth, setHoveredMonth] = useState(null);

  // Paris-specific monthly ratings based on real data
  const getParisMonthlyRating = (month) => {
    const ratings = {
      'january': { rating: 2, events: ['Winter Sales', 'Fewer Tourists'], weather: 'Cold, 2-7°C', crowds: 'Low' },
      'february': { rating: 2, events: ['Valentine\'s Day', 'Fashion Week'], weather: 'Cold, 3-8°C', crowds: 'Low' },
      'march': { rating: 3, events: ['Spring Begins', 'Cherry Blossoms'], weather: 'Cool, 6-12°C', crowds: 'Moderate' },
      'april': { rating: 4, events: ['Easter', 'Spring Sales'], weather: 'Mild, 8-15°C', crowds: 'Moderate' },
      'may': { rating: 5, events: ['Labor Day', 'Museum Night'], weather: 'Pleasant, 11-19°C', crowds: 'High' },
      'june': { rating: 4, events: ['Music Festival', 'Summer Begins'], weather: 'Warm, 14-22°C', crowds: 'High' },
      'july': { rating: 3, events: ['Bastille Day', 'Paris Plages'], weather: 'Hot, 16-25°C', crowds: 'Very High' },
      'august': { rating: 2, events: ['Summer Sales', 'Locals Away'], weather: 'Hot, 16-25°C', crowds: 'High' },
      'september': { rating: 5, events: ['Fashion Week', 'Heritage Days'], weather: 'Pleasant, 13-20°C', crowds: 'Moderate' },
      'october': { rating: 4, events: ['Nuit Blanche', 'Autumn Colors'], weather: 'Cool, 9-16°C', crowds: 'Moderate' },
      'november': { rating: 3, events: ['Armistice Day', 'Christmas Prep'], weather: 'Cold, 5-11°C', crowds: 'Low' },
      'december': { rating: 3, events: ['Christmas Markets', 'New Year'], weather: 'Cold, 3-8°C', crowds: 'High' }
    };
    return ratings[month.toLowerCase()] || { rating: 3, events: [], weather: '', crowds: '' };
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentMonth = new Date().getMonth();
  const currentMonthName = months[currentMonth].toLowerCase();

  return (
    <div className="space-y-6">
      {/* Header with Legend */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold text-gray-800">Best Time to Visit {cityName}</h3>
            <p className="text-gray-600 mt-1">Find the perfect time for your Paris adventure</p>
          </div>
          <div className="hidden md:flex items-center space-x-2 text-sm text-gray-500">
            <span>💡</span>
            <span>Hover for details</span>
          </div>
        </div>

        {/* Enhanced Legend */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6">
          {Object.entries(VISIT_RATINGS).map(([rating, data]) => (
            <div
              key={rating}
              className="flex items-center p-3 rounded-lg border"
              style={{ backgroundColor: data.bgColor, borderColor: data.color }}
            >
              <div
                className="w-4 h-4 rounded-full mr-3"
                style={{ backgroundColor: data.color }}
              ></div>
              <div>
                <div className="font-semibold text-sm" style={{ color: data.color }}>
                  {data.label}
                </div>
                <div className="text-xs text-gray-600">{data.priceIndicator}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Grid - Airline Ticket Style */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-0">
          {months.map((month, index) => {
            const monthData = getParisMonthlyRating(month);
            const rating = monthData.rating;
            const ratingData = VISIT_RATINGS[rating];
            const isCurrentMonth = month.toLowerCase() === currentMonthName;
            const isSelected = selectedMonth === month;

            return (
              <div
                key={month}
                className={`relative p-4 border-r border-b border-gray-200 transition-all duration-200 cursor-pointer group ${
                  isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                } ${isCurrentMonth ? 'bg-blue-50' : ''}`}
                onClick={() => setSelectedMonth(month)}
                onMouseEnter={() => setHoveredMonth(month)}
                onMouseLeave={() => setHoveredMonth(null)}
              >
                {/* Month Header */}
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-lg text-gray-800">{month}</h4>
                  {isCurrentMonth && (
                    <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                      Current
                    </span>
                  )}
                </div>

                {/* Rating Badge */}
                <div
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mb-3"
                  style={{ 
                    backgroundColor: ratingData.bgColor,
                    color: ratingData.color,
                    border: `1px solid ${ratingData.color}`
                  }}
                >
                  <div
                    className="w-2 h-2 rounded-full mr-2"
                    style={{ backgroundColor: ratingData.color }}
                  ></div>
                  {ratingData.label}
                </div>

                {/* Quick Info */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-gray-600">
                    <span className="mr-2">🌡️</span>
                    <span>{monthData.weather}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <span className="mr-2">👥</span>
                    <span>Crowds: {monthData.crowds}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <span className="mr-2">💰</span>
                    <span>{ratingData.priceIndicator}</span>
                  </div>
                </div>

                {/* Events Preview */}
                {monthData.events.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="text-xs font-medium text-gray-500 mb-1">Key Events:</div>
                    <div className="flex flex-wrap gap-1">
                      {monthData.events.slice(0, 2).map((event, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2 py-1 rounded-full"
                          style={{ 
                            backgroundColor: `${ratingData.color}20`,
                            color: ratingData.color
                          }}
                        >
                          {event}
                        </span>
                      ))}
                      {monthData.events.length > 2 && (
                        <span className="text-xs text-gray-400">+{monthData.events.length - 2} more</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Hover Tooltip */}
                {hoveredMonth === month && (
                  <div className="absolute z-10 top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
                    <h5 className="font-semibold text-gray-800 mb-2">Why {ratingData.label}?</h5>
                    <p className="text-sm text-gray-600 mb-3">{ratingData.explanation}</p>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Weather:</span>
                        <span className="font-medium">{monthData.weather}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Crowds:</span>
                        <span className="font-medium">{monthData.crowds}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Prices:</span>
                        <span className="font-medium">{ratingData.priceIndicator}</span>
                      </div>
                    </div>

                    {monthData.events.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="text-sm font-medium text-gray-700 mb-2">Events & Highlights:</div>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {monthData.events.map((event, idx) => (
                            <li key={idx} className="flex items-center">
                              <span className="w-1 h-1 bg-gray-400 rounded-full mr-2"></span>
                              {event}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Month Details */}
      {selectedMonth && (
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xl font-bold text-gray-800">Details for {selectedMonth}</h4>
            <button
              onClick={() => setSelectedMonth(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {(() => {
            const monthData = getParisMonthlyRating(selectedMonth);
            const ratingData = VISIT_RATINGS[monthData.rating];

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h5 className="font-semibold text-gray-800 mb-3">Visit Rating</h5>
                  <div
                    className="inline-flex items-center px-4 py-2 rounded-lg text-lg font-medium mb-3"
                    style={{ 
                      backgroundColor: ratingData.bgColor,
                      color: ratingData.color,
                      border: `2px solid ${ratingData.color}`
                    }}
                  >
                    <div
                      className="w-3 h-3 rounded-full mr-3"
                      style={{ backgroundColor: ratingData.color }}
                    ></div>
                    {ratingData.label} - {ratingData.description}
                  </div>
                  <p className="text-gray-600">{ratingData.explanation}</p>
                </div>

                <div>
                  <h5 className="font-semibold text-gray-800 mb-3">Practical Information</h5>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-600">Average Temperature</span>
                      <span className="font-medium">{monthData.weather}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-600">Tourist Crowds</span>
                      <span className="font-medium">{monthData.crowds}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-600">Price Level</span>
                      <span className="font-medium">{ratingData.priceIndicator}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default EnhancedVisitCalendar; 