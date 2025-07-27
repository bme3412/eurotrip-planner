'use client';
// src/components/city-guides/MonthlyGuideSection.js
import React, { useState, useEffect } from 'react';

const MonthlyGuideSection = ({ city, cityName, monthlyEvents }) => {
  console.log(`MonthlyGuideSection for ${city} with data:`, monthlyEvents);
  
  // State for showing all experiences/activities
  const [showAllExperiences, setShowAllExperiences] = useState(false);
  
  // Standard month names and seasons for organizing tabs
  const standardMonths = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];
  
  const seasons = ['spring', 'summer', 'fall', 'winter'];
  
  // Format display name with proper capitalization
  const formatDisplayName = (name) => {
    return name.charAt(0).toUpperCase() + name.slice(1);
  };
  
  // Get available periods (months/seasons) and sort them in chronological order
  const availablePeriods = Object.keys(monthlyEvents).sort((a, b) => {
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();
    
    // If both are standard months, sort chronologically
    if (standardMonths.includes(aLower) && standardMonths.includes(bLower)) {
      return standardMonths.indexOf(aLower) - standardMonths.indexOf(bLower);
    }
    
    // If both are seasons, sort chronologically
    if (seasons.includes(aLower) && seasons.includes(bLower)) {
      return seasons.indexOf(aLower) - seasons.indexOf(bLower);
    }
    
    // If one is a month and one is a season, put months first
    if (standardMonths.includes(aLower) && seasons.includes(bLower)) {
      return -1;
    }
    
    if (seasons.includes(aLower) && standardMonths.includes(bLower)) {
      return 1;
    }
    
    // Otherwise, alphabetical
    return aLower.localeCompare(bLower);
  });
  
  // Set the initial active tab to current month if available, otherwise first available period
  const getCurrentMonthIndex = () => new Date().getMonth();
  const currentMonthName = standardMonths[getCurrentMonthIndex()];
  
  // Find the current month or closest available month
  const findInitialTab = () => {
    // First try exact current month
    if (availablePeriods.some(p => p.toLowerCase() === currentMonthName)) {
      return availablePeriods.find(p => p.toLowerCase() === currentMonthName);
    }
    
    // Then try the current season
    const seasons = ['spring', 'summer', 'fall', 'winter'];
    const currentMonth = getCurrentMonthIndex();
    let currentSeason;
    
    if (currentMonth >= 2 && currentMonth <= 4) currentSeason = 'spring';
    else if (currentMonth >= 5 && currentMonth <= 7) currentSeason = 'summer';
    else if (currentMonth >= 8 && currentMonth <= 10) currentSeason = 'fall';
    else currentSeason = 'winter';
    
    if (availablePeriods.some(p => p.toLowerCase() === currentSeason)) {
      return availablePeriods.find(p => p.toLowerCase() === currentSeason);
    }
    
    // Otherwise first available tab
    return availablePeriods[0];
  };
  
  const [activeTab, setActiveTab] = useState(findInitialTab);
  
  // Make sure we have a valid active tab if data changes
  useEffect(() => {
    if (availablePeriods.length > 0 && !availablePeriods.includes(activeTab)) {
      setActiveTab(availablePeriods[0]);
    } else if (availablePeriods.length === 0 && Object.keys(monthlyEvents).length > 0) {
       // If monthlyEvents has data but availablePeriods somehow didn't populate, retry finding tab
       setActiveTab(findInitialTab());
    } else if (availablePeriods.length === 0) {
       // Handle case where monthlyEvents is truly empty or null after initial render
       setActiveTab(null); // Or some default state
    }
  }, [availablePeriods, activeTab, monthlyEvents]);
  
  // Get current active data
  const activeData = activeTab ? monthlyEvents[activeTab] : {};
  
  // UTILITY FUNCTIONS TO EXTRACT AND RENDER DIFFERENT DATA TYPES
  
  // 1. Extract a description/overview
  const getDescription = (data) => {
    if (data.description) return data.description;
    if (data.overview) return data.overview;
    if (data.summary) return data.summary;
    if (data.introduction) return data.introduction;
    
    // Try to find any reasonable text field that could be an overview
    const textFields = ['text', 'info', 'details', 'content'];
    for (const field of textFields) {
      if (data[field] && typeof data[field] === 'string') return data[field];
    }
    
    return null;
  };
  
  // 2. Extract weather information
  const getWeatherInfo = (data) => {
    // Case 1: Dedicated weather object with structure
    if (data.weather && typeof data.weather === 'object') {
      return data.weather;
    }
    
    // Case 2: Weather as a string
    if (data.weather && typeof data.weather === 'string') {
      return { description: data.weather };
    }
    
    // Case 3: Temperature and/or precipitation as separate fields
    if (data.temperature || data.precipitation) {
      const weather = {};
      if (data.temperature) weather.temperature = data.temperature;
      if (data.precipitation) weather.precipitation = data.precipitation;
      return weather;
    }
    
    // Case 4: Climate as an alternative field
    if (data.climate) {
      return typeof data.climate === 'object' ? data.climate : { description: data.climate };
    }
    
    // Check for weather in first_half/second_half structure
    if (data.first_half && data.first_half.weather) {
      return {
        first_half: data.first_half.weather,
        second_half: data.second_half?.weather
      };
    }
    
    return null;
  };
  
  // 3. Extract events
  const getEvents = (data) => {
    let events = [];
    
    // Case 1: Direct events array
    if (Array.isArray(data.events)) {
      events = data.events;
    }
    
    // Case 2: Events in first_half/second_half structure
    if (data.first_half && data.first_half.events_holidays) {
      events = [...events, ...data.first_half.events_holidays];
    }
    if (data.second_half && data.second_half.events_holidays) {
      events = [...events, ...data.second_half.events_holidays];
    }
    
    // Case 3: Events as holidays
    if (data.holidays && Array.isArray(data.holidays)) {
      events = [...events, ...data.holidays];
    }
    
    // Case 4: Events as festivals
    if (data.festivals && Array.isArray(data.festivals)) {
      events = [...events, ...data.festivals];
    }
    
    return events;
  };
  
  // 4. Extract activities/experiences
  const getActivities = (data) => {
    let activities = [];
    
    // Case 1: Direct activities array
    if (Array.isArray(data.activities)) {
      activities = data.activities;
    }
    
    // Case 2: Activities in first_half/second_half structure
    if (data.first_half && data.first_half.unique_experiences) {
      activities = [...activities, ...data.first_half.unique_experiences];
    }
    if (data.second_half && data.second_half.unique_experiences) {
      activities = [...activities, ...data.second_half.unique_experiences];
    }
    
    // Case 3: Experiences as alternative field
    if (data.experiences && Array.isArray(data.experiences)) {
      activities = [...activities, ...data.experiences];
    }
    
    // Case 4: Things to do
    if (data.things_to_do && Array.isArray(data.things_to_do)) {
      activities = [...activities, ...data.things_to_do];
    }
    
    return activities;
  };
  
  // 5. Extract reasons to visit/reconsider
  const getReasons = (data) => {
    const reasons = {
      toVisit: [],
      toReconsider: []
    };
    
    // Case 1: Direct reasons structure
    if (data.reasons_to_visit && Array.isArray(data.reasons_to_visit)) {
      reasons.toVisit = data.reasons_to_visit;
    }
    if (data.reasons_to_reconsider && Array.isArray(data.reasons_to_reconsider)) {
      reasons.toReconsider = data.reasons_to_reconsider;
    }
    
    // Case 2: Pros and cons
    if (data.pros && Array.isArray(data.pros)) {
      reasons.toVisit = [...reasons.toVisit, ...data.pros];
    }
    if (data.cons && Array.isArray(data.cons)) {
      reasons.toReconsider = [...reasons.toReconsider, ...data.cons];
    }
    
    return reasons;
  };
  
  // RENDER FUNCTIONS
  
  const renderReasons = (reasons) => {
    if (!reasons.toVisit.length && !reasons.toReconsider.length) return null;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {reasons.toVisit.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-green-800 mb-3 flex items-center">
              <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Reasons to Visit
            </h4>
            <ul className="space-y-2">
              {reasons.toVisit.map((reason, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">✓</span>
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
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-amber-800 mb-3 flex items-center">
              <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Things to Consider
            </h4>
            <ul className="space-y-2">
              {reasons.toReconsider.map((reason, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-amber-500 mr-2 mt-1">⚠</span>
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
  
  const renderWeather = (weather) => {
    if (!weather) return null;
    
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h4 className="text-lg font-semibold text-blue-800 mb-3 flex items-center">
          <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
          </svg>
          Weather & Climate
        </h4>
        
        {weather.first_half && weather.second_half ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h5 className="font-medium text-blue-700 mb-2">First Half</h5>
              {weather.first_half.average_temperature && (
                <p className="text-sm text-blue-600 mb-1">
                  <span className="font-medium">Temperature:</span> {weather.first_half.average_temperature.high} / {weather.first_half.average_temperature.low}
                </p>
              )}
              {weather.first_half.precipitation && (
                <p className="text-sm text-blue-600 mb-1">
                  <span className="font-medium">Precipitation:</span> {weather.first_half.precipitation}
                </p>
              )}
              {weather.first_half.general_tips && (
                <p className="text-sm text-blue-600">
                  <span className="font-medium">Tips:</span> {weather.first_half.general_tips}
                </p>
              )}
            </div>
            <div>
              <h5 className="font-medium text-blue-700 mb-2">Second Half</h5>
              {weather.second_half.average_temperature && (
                <p className="text-sm text-blue-600 mb-1">
                  <span className="font-medium">Temperature:</span> {weather.second_half.average_temperature.high} / {weather.second_half.average_temperature.low}
                </p>
              )}
              {weather.second_half.precipitation && (
                <p className="text-sm text-blue-600 mb-1">
                  <span className="font-medium">Precipitation:</span> {weather.second_half.precipitation}
                </p>
              )}
              {weather.second_half.general_tips && (
                <p className="text-sm text-blue-600">
                  <span className="font-medium">Tips:</span> {weather.second_half.general_tips}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div>
            {weather.temperature && (
              <p className="text-sm text-blue-600 mb-1">
                <span className="font-medium">Temperature:</span> {weather.temperature}
              </p>
            )}
            {weather.precipitation && (
              <p className="text-sm text-blue-600 mb-1">
                <span className="font-medium">Precipitation:</span> {weather.precipitation}
              </p>
            )}
            {weather.description && (
              <p className="text-sm text-blue-600">
                {weather.description}
              </p>
            )}
          </div>
        )}
      </div>
    );
  };
  
  const renderEvents = (events) => {
    if (!events.length) return null;
    
    return (
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
          <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Events & Holidays
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {events.map((event, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <h5 className="font-medium text-gray-800">
                  {event.name || event.title || event}
                </h5>
                {event.date && (
                  <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {event.date}
                  </span>
                )}
              </div>
              {event.description && (
                <p className="text-sm text-gray-600 mb-2">{event.description}</p>
              )}
              {event.notes && (
                <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                  <span className="font-medium">Note:</span> {event.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  const renderActivities = (activities) => {
    if (!activities.length) return null;
    
    const displayActivities = showAllExperiences ? activities : activities.slice(0, 6);
    
    return (
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
          <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
          </svg>
          Unique Experiences & Activities
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayActivities.map((activity, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col">
              <div className="flex items-start mb-3">
                <div className="bg-indigo-100 p-2 rounded-lg mr-3 flex-shrink-0">
                  <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                  </svg>
                </div>
                <h5 className="font-medium text-indigo-800 leading-tight">
                  {activity.activity || activity.name || activity.title || activity}
                </h5>
              </div>
              {activity.where && (
                <div className="flex items-center mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-500 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  <p className="text-xs text-indigo-600">{activity.where || activity.location}</p>
                </div>
              )}
              {(activity.description || activity.details) && (
                <p className="text-sm text-gray-600 mb-3">{activity.description || activity.details}</p>
              )}
              <div className="flex flex-wrap mt-auto">
                {activity.best_time && (
                  <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full text-xs mr-2 mb-2 font-medium">
                    {activity.best_time}
                  </span>
                )}
                {activity.estimated_cost && (
                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs mr-2 mb-2 font-medium">
                    {activity.estimated_cost}
                  </span>
                )}
                {activity.weather_dependent !== undefined && (
                  <span className={`${activity.weather_dependent ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'} px-2 py-1 rounded-full text-xs mb-2 font-medium`}>
                    {activity.weather_dependent ? 'Weather dependent' : 'All weather'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        {activities.length > 6 && (
          <div className="text-center mt-6">
            <button 
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2 rounded-full transition-colors text-sm shadow-sm"
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
        <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Monthly Guide Coming Soon</h3>
                 <p className="text-gray-500">We&apos;re working on detailed monthly guides for {cityName}. Check back soon!</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Enhanced Tab Navigation */}
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
        
        {/* Quick Navigation Pills */}
        <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Quick Jump:</span>
            <div className="flex space-x-2">
              {['january', 'april', 'july', 'october'].map((quarterMonth) => {
                const isAvailable = availablePeriods.some(p => p.toLowerCase() === quarterMonth);
                const isActive = activeTab.toLowerCase() === quarterMonth;
                return isAvailable ? (
                  <button
                    key={quarterMonth}
                    className={`px-3 py-1 text-xs rounded-full transition-colors ${
                      isActive 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                    onClick={() => setActiveTab(quarterMonth)}
                  >
                    {formatDisplayName(quarterMonth)}
                  </button>
                ) : null;
              })}
            </div>
          </div>
        </div>
        
        {/* Active Tab Content */}
        <div className="p-6">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              {cityName} in {formatDisplayName(activeTab)}
            </h3>
            <p className="text-gray-600">
              Discover what makes {formatDisplayName(activeTab)} special in {cityName}
            </p>
          </div>
          
          {/* Description */}
          {getDescription(activeData) && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-gray-700 leading-relaxed">{getDescription(activeData)}</p>
            </div>
          )}
          
          {/* Pros and cons */}
          {renderReasons(getReasons(activeData))}
          
          {/* Weather information */}
          {renderWeather(getWeatherInfo(activeData))}
          
          {/* Events */}
          {renderEvents(getEvents(activeData))}
          
          {/* Activities */}
          {renderActivities(getActivities(activeData))}
        </div>
      </div>
    </div>
  );
};

export default MonthlyGuideSection;