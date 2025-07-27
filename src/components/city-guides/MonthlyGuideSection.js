'use client';
import React, { useState, useEffect } from 'react';
import MonthlyCalendarView from "../monthly-visit-guide/MonthlyCalendarView";

const MonthlyGuideSection = ({ city, cityName, monthlyData, visitCalendar, countryName }) => {
  const [showAllExperiences, setShowAllExperiences] = useState(false);
  
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
  
  // Extract activities
  const getActivities = (data) => {
    let activities = [];
    
    if (data.first_half && data.first_half.unique_experiences) {
      activities = [...activities, ...data.first_half.unique_experiences];
    }
    if (data.second_half && data.second_half.unique_experiences) {
      activities = [...activities, ...data.second_half.unique_experiences];
    }
    
    return activities;
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
  
  // Render activities section
  const renderActivities = (activities) => {
    if (!activities.length) return null;
    
    const displayActivities = showAllExperiences ? activities : activities.slice(0, 6);
    
    return (
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <span className="text-blue-600 mr-2">🎯</span>
          Unique Experiences
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayActivities.map((activity, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <h5 className="font-medium text-gray-800 mb-2">
                {activity.activity || activity.name || activity.title || activity}
              </h5>
              {activity.where && (
                <p className="text-sm text-gray-600 mb-2">📍 {activity.where}</p>
              )}
              {(activity.description || activity.details) && (
                <p className="text-sm text-gray-600 mb-3">{activity.description || activity.details}</p>
              )}
              <div className="flex flex-wrap gap-2">
                {activity.best_time && (
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                    {activity.best_time}
                  </span>
                )}
                {activity.estimated_cost && (
                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                    {activity.estimated_cost}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        {activities.length > 6 && (
          <div className="text-center mt-6">
            <button 
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-lg transition-colors"
              onClick={() => setShowAllExperiences(!showAllExperiences)}
            >
              {showAllExperiences ? 'Show Less' : `See ${activities.length - 6} More Activities`}
            </button>
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
      {/* Combined Today's Date and When to Visit Section */}
      {visitCalendar && Object.keys(visitCalendar).length > 0 && (
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <span className="text-2xl mr-3">📅</span>
              <div>
                <p className="text-sm text-gray-600">Today&apos;s Date</p>
                <p className="font-semibold text-gray-900">{todayFormatted}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Current Month</p>
              <p className="font-semibold text-blue-600">{formatDisplayName(currentMonthName)}</p>
            </div>
          </div>
          
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
          
          {/* Activities */}
          {renderActivities(getActivities(activeData))}
        </div>
      </div>
    </div>
  );
};

export default MonthlyGuideSection;