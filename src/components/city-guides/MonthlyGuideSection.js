'use client';
import React, { useState, useEffect } from 'react';
import MonthlyCalendarView from "../monthly-visit-guide/MonthlyCalendarView";

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
      {/* Condensed Date Display */}
      <div className="bg-white rounded-2xl shadow-xl p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-xl mr-2">📅</span>
            <div>
              <p className="text-xs text-gray-600">Today&apos;s Date</p>
              <p className="font-semibold text-gray-900 text-sm">{todayFormatted}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-600">Current Month</p>
            <p className="font-semibold text-blue-600 text-sm">{formatDisplayName(currentMonthName)}</p>
          </div>
        </div>
      </div>

      {/* Expanded When to Visit Section */}
      {visitCalendar && Object.keys(visitCalendar).length > 0 && (
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h3 className="text-lg font-semibold mb-6">When to Visit {cityName.charAt(0).toUpperCase() + cityName.slice(1)}</h3>
          
          {/* All Months Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((monthName, monthIndex) => {
              const monthData = visitCalendar.months[monthName.toLowerCase()];
              if (!monthData) return null;
              
              // Calculate average score for the month
              let totalScore = 0;
              let totalRanges = 0;
              if (monthData.ranges) {
                monthData.ranges.forEach(range => {
                  totalScore += range.score * range.days.length;
                  totalRanges += range.days.length;
                });
              }
              const averageScore = totalRanges > 0 ? Math.round(totalScore / totalRanges) : 3;
              
              // Get rating color and labels
              const RATING_COLORS = {
                5: '#10b981', // Excellent - Soft green
                4: '#34d399', // Good - Light green
                3: '#fbbf24', // Average - Soft amber
                2: '#fb923c', // Below Average - Soft orange
                1: '#ef4444'  // Poor - Soft red
              };
              
              const RATING_LABELS = {
                5: 'Excellent',
                4: 'Good',
                3: 'Average',
                2: 'Below Average',
                1: 'Poor'
              };
              
              const RATING_DESCRIPTIONS = {
                5: 'Perfect conditions, special events, ideal weather, moderate crowds',
                4: 'Very favorable conditions, pleasant weather, manageable crowds',
                3: 'Standard conditions, typical weather, moderate to high tourism',
                2: 'Less ideal conditions, possibly unpleasant weather or very high crowds',
                1: 'Unfavorable conditions, extreme weather, overcrowded or limited activities'
              };
              
              return (
                <div key={`${monthName}-${new Date().getFullYear()}`} className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  {/* Enhanced Month Header */}
                  <div 
                    className="p-3 text-center"
                    style={{ 
                      backgroundColor: `${RATING_COLORS[averageScore]}10`,
                      borderBottom: `3px solid ${RATING_COLORS[averageScore]}` 
                    }}
                  >
                    <div className="text-base font-bold text-gray-800">{monthName} {new Date().getFullYear()}</div>
                    <div className="text-xs font-medium mt-1" style={{ color: RATING_COLORS[averageScore] }}>
                      {RATING_LABELS[averageScore]} time to visit
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {RATING_DESCRIPTIONS[averageScore]}
                    </div>
                    <div className="flex justify-center items-center gap-3 mt-1 text-xs">
                      {monthData.tourismLevel && (
                        <div className="flex items-center">
                          <span className="mr-1">👥</span>
                          <span>Tourism: {monthData.tourismLevel}/10</span>
                        </div>
                      )}
                      {monthData.weatherHighC && monthData.weatherLowC && (
                        <div className="flex items-center">
                          <span className="mr-1">🌡️</span>
                          <span>{monthData.weatherLowC}°-{monthData.weatherHighC}°C</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Activity Types */}
                  {monthData.activityTypes && monthData.activityTypes.length > 0 && (
                    <div className="bg-gray-50 px-2 py-1 border-b border-gray-200">
                      <div className="text-xs font-medium text-gray-600 mb-1">Best Activities:</div>
                      <div className="flex flex-wrap gap-1">
                        {monthData.activityTypes.slice(0, 3).map((activity, idx) => (
                          <span key={idx} className="text-xs bg-white px-1.5 py-0.5 rounded-full border">
                            {activity}
                          </span>
                        ))}
                        {monthData.activityTypes.length > 3 && (
                          <span className="text-xs text-gray-400">+{monthData.activityTypes.length - 3} more</span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Days of Week */}
                  <div className="grid grid-cols-7 text-center text-xs font-medium text-gray-500 bg-gray-50 p-0.5">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                      <div key={i} className="p-0.5">{day}</div>
                    ))}
                  </div>
                  
                  {/* Calendar Days */}
                  <div className="grid grid-cols-7 gap-px p-0.5 bg-white">
                    {(() => {
                      const currentYear = new Date().getFullYear();
                      const daysInMonth = new Date(currentYear, monthIndex + 1, 0).getDate();
                      const firstDayOfMonth = new Date(currentYear, monthIndex, 1).getDay();
                      const days = [];
                      
                      // Add empty days for padding
                      for (let i = 0; i < firstDayOfMonth; i++) {
                        days.push({ type: 'empty' });
                      }
                      
                                             // Add actual days
                       for (let i = 1; i <= daysInMonth; i++) {
                         let dayDetails = monthData.ranges ? monthData.ranges.find(r => r.days.includes(i)) : null;
                         const rating = dayDetails ? dayDetails.score : 3;
                         days.push({
                           type: 'day',
                           dayOfMonth: i,
                           rating,
                           color: RATING_COLORS[rating],
                           special: dayDetails && dayDetails.special,
                           eventData: dayDetails || null
                         });
                       }
                      
                                               return days.map((day, dayIndex) => (
                           day.type === 'empty' ? (
                             <div key={`empty-${dayIndex}`} className="aspect-square" />
                           ) : (
                             <div
                               key={`day-${day.dayOfMonth}`}
                               className={`day-cell aspect-square flex items-center justify-center text-sm rounded-md relative cursor-pointer hover:scale-105 transition-transform ${day.special ? 'hover:ring-2 hover:ring-red-400' : ''}`}
                               style={{ backgroundColor: day.color }}
                               onClick={() => toggleTooltip(day, monthIndex, day.dayOfMonth, day.eventData)}
                             >
                               <span className="font-medium text-white drop-shadow-sm">{day.dayOfMonth}</span>
                               {day.special && (
                                 <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full shadow-sm"></span>
                               )}
                             </div>
                           )
                         ));
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Month Navigation */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="border-b border-gray-200">
          <div className="flex overflow-x-auto scrollbar-none">
            {availablePeriods.map((period) => (
              <button
                key={period}
                className={`whitespace-nowrap px-6 py-4 font-medium text-sm transition-all duration-200 flex-shrink-0 ${
                  activeTab === period
                    ? 'bg-blue-600 text-white border-b-2 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                }`}
                onClick={() => setActiveTab(period)}
              >
                {formatDisplayName(period)}
              </button>
            ))}
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              {cityName.charAt(0).toUpperCase() + cityName.slice(1)} in {formatDisplayName(activeTab)}
            </h3>
            <p className="text-gray-600">
              Discover what makes {formatDisplayName(activeTab)} special in {cityName.charAt(0).toUpperCase() + cityName.slice(1)}
            </p>
          </div>
          
          {/* Reasons to visit/reconsider */}
          {renderReasons(getReasons(activeData))}
        </div>
      </div>

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