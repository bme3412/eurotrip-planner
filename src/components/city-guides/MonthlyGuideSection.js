'use client';
import React, { useState, useEffect } from 'react';
import MonthlyCalendarView from "../monthly-visit-guide/MonthlyCalendarView";

// New component for condensed 12-month overview
const CondensedYearView = ({ monthlyData, cityName, visitCalendar }) => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Get month data from visit calendar
  const getMonthData = (monthName) => {
    if (!visitCalendar || !visitCalendar.months) return null;
    return visitCalendar.months[monthName.toLowerCase()];
  };

  // Get day details from the calendar data
  const getDayDetails = (day, monthData) => {
    if (!monthData || !monthData.ranges) return null;
    const range = monthData.ranges.find(r => r.days.includes(day));
    if (!range) return null;
    return {
      score: range.score,
      special: range.special || false
    };
  };

  // Rating colors to match the main calendar
  const RATING_COLORS = {
    5: '#10b981', // Excellent - Soft green
    4: '#34d399', // Good - Light green
    3: '#fbbf24', // Average - Soft amber
    2: '#fb923c', // Below Average - Soft orange
    1: '#ef4444'  // Poor - Soft red
  };

  // Generate calendar for a specific month
  const generateMonthCalendar = (monthIndex) => {
    const currentYear = new Date().getFullYear();
    const monthData = getMonthData(months[monthIndex]);
    const daysInMonth = new Date(currentYear, monthIndex + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentYear, monthIndex, 1).getDay();
    const days = [];
    
    // Add empty days for padding
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push({ type: 'empty' });
    }
    
    // Add actual days
    for (let i = 1; i <= daysInMonth; i++) {
      let dayDetails = monthData ? getDayDetails(i, monthData) : null;
      const rating = dayDetails ? dayDetails.score : 3;
      days.push({
        type: 'day',
        dayOfMonth: i,
        rating,
        color: RATING_COLORS[rating],
        special: dayDetails && dayDetails.special
      });
    }
    
    return {
      monthName: months[monthIndex],
      days
    };
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {months.map((_, monthIndex) => {
          const calendar = generateMonthCalendar(monthIndex);
          return (
            <div key={monthIndex} className="border rounded-lg overflow-hidden">
              {/* Month Header */}
              <div className="bg-gray-50 p-2 text-center border-b">
                <div className="text-xs font-medium text-gray-700">
                  {calendar.monthName.substring(0, 3)}
                </div>
              </div>
              
              {/* Days of Week */}
              <div className="grid grid-cols-7 text-center text-xs font-medium text-gray-500 bg-gray-50">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                  <div key={i} className="p-1">{day}</div>
                ))}
              </div>
              
              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-px">
                {calendar.days.map((day, dayIndex) => (
                  day.type === 'empty' ? (
                    <div key={`empty-${dayIndex}`} className="aspect-square" />
                  ) : (
                    <div
                      key={`day-${day.dayOfMonth}`}
                      className="aspect-square flex items-center justify-center text-xs relative"
                      style={{ backgroundColor: day.color }}
                    >
                      <span className="text-white font-medium">{day.dayOfMonth}</span>
                      {day.special && (
                        <span className="absolute top-0.5 right-0.5 w-1 h-1 bg-red-500 rounded-full"></span>
                      )}
                    </div>
                  )
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const MonthlyGuideSection = ({ city, cityName, monthlyData, visitCalendar, countryName }) => {
  
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

      {/* 12-Month Overview */}
      <CondensedYearView monthlyData={monthlyData} cityName={cityName} visitCalendar={visitCalendar} />

      {/* Detailed 3-Month Calendar */}
      {visitCalendar && Object.keys(visitCalendar).length > 0 && (
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">When to Visit {cityName.charAt(0).toUpperCase() + cityName.slice(1)}</h3>
          <MonthlyCalendarView
            monthlyData={visitCalendar}
            initialMonth={new Date().getMonth()}
            city={cityName}
            country={countryName}
          />
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
    </div>
  );
};

export default MonthlyGuideSection;