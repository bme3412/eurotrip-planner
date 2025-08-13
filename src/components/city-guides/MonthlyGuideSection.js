'use client';
import React, { useState, useEffect } from 'react';
import MonthlyCalendarView from "../monthly-visit-guide/MonthlyCalendarView";
import SingleMonthView from './SingleMonthView';
import MonthlyTabbedView from './MonthlyTabbedView';

// Dynamic Monthly Content Component for any city
const DynamicMonthlyContent = ({ monthlyData, cityName, countryName }) => {
  // Generate monthly highlights based on the data
  const generateMonthlyHighlights = () => {
    if (!monthlyData || typeof monthlyData !== 'object') return [];
    
    const highlights = [];
    const months = ['january', 'february', 'march', 'april', 'may', 'june', 
                   'july', 'august', 'september', 'october', 'november', 'december'];
    
    months.forEach((month, index) => {
      const monthData = monthlyData[month];
      if (monthData && monthData.events && monthData.events.length > 0) {
        const topEvents = monthData.events.slice(0, 2); // Get top 2 events
        highlights.push({
          month: month.charAt(0).toUpperCase() + month.slice(1),
          monthIndex: index,
          events: topEvents,
          weather: monthData.weather || null,
          tips: monthData.tips || []
        });
      }
    });
    
    return highlights;
  };

  const highlights = generateMonthlyHighlights();

  if (highlights.length === 0) return null;

  return (
    <div className="mt-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-2">
          Year-Round Guide to {cityName}
        </h3>
        <p className="text-gray-600">
          Discover the best times to visit and what makes each month special in {cityName}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {highlights.map((highlight) => (
          <div key={highlight.month} className="bg-white rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center mb-3">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
              <h4 className="font-semibold text-lg text-gray-800">{highlight.month}</h4>
            </div>
            
            {highlight.weather && (
              <div className="mb-3 text-sm text-gray-600">
                <span className="font-medium">Weather:</span> {highlight.weather.description || 'Pleasant'}
                {highlight.weather.temp_range && (
                  <span className="ml-2">({highlight.weather.temp_range})</span>
                )}
              </div>
            )}

            <div className="space-y-2">
              {highlight.events.map((event, idx) => (
                <div key={idx} className="border-l-2 border-blue-200 pl-3 py-1">
                  <div className="font-medium text-sm text-gray-800">{event.event || event.name || event.title}</div>
                  {event.location && (
                    <div className="text-xs text-gray-500">📍 {event.location}</div>
                  )}
                  {event.notes && (
                    <div className="text-xs text-gray-600 mt-1">{event.notes}</div>
                  )}
                </div>
              ))}
            </div>

            {highlight.tips && highlight.tips.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="text-xs text-blue-600 font-medium mb-1">💡 Tip:</div>
                <div className="text-xs text-gray-600">{highlight.tips[0]}</div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500">
          Planning your trip to {cityName}? Each month offers unique experiences and local events.
        </p>
      </div>
    </div>
  );
};

const MonthlyGuideSection = ({ city, cityName, monthlyData, visitCalendar, countryName }) => {
  const [activeTooltip, setActiveTooltip] = useState(null);

  // Add click outside handler to close tooltip
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeTooltip && !event.target.closest('.day-cell')) {
        setActiveTooltip(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeTooltip]);

  // Toggle tooltip display for a day
  const toggleTooltip = (day, monthIndex, dayOfMonth, eventData) => {
    if (day.special) {
      if (activeTooltip && activeTooltip.monthIndex === monthIndex && activeTooltip.dayOfMonth === dayOfMonth) {
        setActiveTooltip(null);
      } else {
        setActiveTooltip({
          monthIndex,
          dayOfMonth,
          event: eventData.event,
          notes: eventData.notes,
          location: eventData.location,
          time: eventData.time,
          price: eventData.price,
          crowdLevel: eventData.crowdLevel
        });
      }
    }
  };
  
  // Get today's date
  const today = new Date();
  const todayFormatted = today.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  // Standard month names
  const standardMonths = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];
  
  // Format display name with proper capitalization
  const formatDisplayName = (name) => {
    return name.charAt(0).toUpperCase() + name.slice(1);
  };
  
  // Get available periods and sort them chronologically
  const availablePeriods = Object.keys(monthlyData).sort((a, b) => {
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();
    
    if (standardMonths.includes(aLower) && standardMonths.includes(bLower)) {
      return standardMonths.indexOf(aLower) - standardMonths.indexOf(bLower);
    }
    return aLower.localeCompare(bLower);
  });
  
  // Set initial active tab to current month if available
  const getCurrentMonthIndex = () => new Date().getMonth();
  const currentMonthName = standardMonths[getCurrentMonthIndex()];
  
  const findInitialTab = () => {
    if (availablePeriods.some(p => p.toLowerCase() === currentMonthName)) {
      return availablePeriods.find(p => p.toLowerCase() === currentMonthName);
    }
    return availablePeriods[0];
  };
  
  const [activeTab, setActiveTab] = useState(findInitialTab);
  
  // Update active tab if data changes
  useEffect(() => {
    if (availablePeriods.length > 0 && !availablePeriods.includes(activeTab)) {
      setActiveTab(availablePeriods[0]);
    }
  }, [availablePeriods, activeTab]);
  
  const activeData = activeTab ? monthlyData[activeTab] : {};
  
  // Extract reasons to visit/reconsider
  const getReasons = (data) => {
    const reasons = { toVisit: [], toReconsider: [] };
    
    if (data.reasons_to_visit && Array.isArray(data.reasons_to_visit)) {
      reasons.toVisit = data.reasons_to_visit;
    }
    if (data.reasons_to_reconsider && Array.isArray(data.reasons_to_reconsider)) {
      reasons.toReconsider = data.reasons_to_reconsider;
    }
    
    return reasons;
  };
  

  
  // Render reasons section
  const renderReasons = (reasons) => {
    if (!reasons.toVisit.length && !reasons.toReconsider.length) return null;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {reasons.toVisit.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-green-800 mb-4 flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              Reasons to Visit
            </h4>
            <ul className="space-y-3">
              {reasons.toVisit.map((reason, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-green-500 mr-3 mt-1">•</span>
                  <div>
                    <span className="font-medium text-green-800">
                      {reason.reason || reason.title || reason}
                    </span>
                    {reason.details && (
                      <p className="text-sm text-green-700 mt-1">{reason.details}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {reasons.toReconsider.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-amber-800 mb-4 flex items-center">
              <span className="text-amber-500 mr-2">⚠</span>
              Things to Consider
            </h4>
            <ul className="space-y-3">
              {reasons.toReconsider.map((reason, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-amber-500 mr-3 mt-1">•</span>
                  <div>
                    <span className="font-medium text-amber-800">
                      {reason.reason || reason.title || reason}
                    </span>
                    {reason.details && (
                      <p className="text-sm text-amber-700 mt-1">{reason.details}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };
  

  
  // If no monthly data available
  if (!monthlyData || Object.keys(monthlyData).length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">📅</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Monthly Guide Coming Soon</h3>
        <p className="text-gray-500">We&apos;re working on detailed monthly guides for {cityName}. Check back soon!</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Tabbed Monthly View – render even if visitCalendar is missing; component will synthesize defaults */}
      <MonthlyTabbedView
        visitCalendar={visitCalendar}
        monthlyData={monthlyData}
        cityName={cityName}
        countryName={countryName}
      />

      {/* Dynamic highlight grid disabled to match streamlined Monthly Guide layout */}

      {/* Enhanced Professional Event Modal */}
      {activeTooltip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][activeTooltip.monthIndex]} {activeTooltip.dayOfMonth}
                </h3>
                <p className="text-sm text-gray-500">Special Event</p>
              </div>
              <button 
                className="text-gray-400 hover:text-gray-600 transition-colors"
                onClick={() => setActiveTooltip(null)}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6">
              <h4 className="text-xl font-medium text-gray-900 mb-4">{activeTooltip.event}</h4>
              <p className="text-gray-600 leading-relaxed mb-4">{activeTooltip.notes}</p>
              
              {/* Event Details */}
              <div className="space-y-3">
                {activeTooltip.location && (
                  <div className="flex items-center">
                    <span className="text-gray-400 mr-3">📍</span>
                    <span className="text-sm text-gray-700">{activeTooltip.location}</span>
                  </div>
                )}
                {activeTooltip.time && (
                  <div className="flex items-center">
                    <span className="text-gray-400 mr-3">🕒</span>
                    <span className="text-sm text-gray-700">{activeTooltip.time}</span>
                  </div>
                )}
                {activeTooltip.price && (
                  <div className="flex items-center">
                    <span className="text-gray-400 mr-3">💰</span>
                    <span className="text-sm text-gray-700">{activeTooltip.price}</span>
                  </div>
                )}
                {activeTooltip.crowdLevel && (
                  <div className="flex items-center">
                    <span className="text-gray-400 mr-3">👥</span>
                    <span className="text-sm text-gray-700">Crowds: {activeTooltip.crowdLevel}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthlyGuideSection;