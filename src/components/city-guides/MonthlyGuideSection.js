'use client';
// src/components/city-guides/MonthlyGuideSection.js
import React, { useState, useEffect } from 'react';

const MonthlyGuideSection = ({ city, cityName, monthlyData }) => {
  console.log(`MonthlyGuideSection for ${city} with data:`, monthlyData);
  
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
  const availablePeriods = Object.keys(monthlyData).sort((a, b) => {
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
    }
  }, [availablePeriods, activeTab]);
  
  // Get current active data
  const activeData = monthlyData[activeTab] || {};
  
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
    
    // Case 1: Events as an array of objects with name/description
    if (data.events && Array.isArray(data.events)) {
      if (data.events.length > 0) {
        // Check if events are objects or strings
        if (typeof data.events[0] === 'object') {
          events = [...events, ...data.events];
        } else if (typeof data.events[0] === 'string') {
          // Convert string events to objects
          events = [...events, ...data.events.map(e => ({ name: e }))]
        }
      }
    }
    
    // Case 2: Events in first_half/second_half structure
    if (data.first_half && data.first_half.events) {
      const firstHalfEvents = Array.isArray(data.first_half.events) 
        ? data.first_half.events 
        : [data.first_half.events];
        
      events = [...events, ...firstHalfEvents.map(e => typeof e === 'string' ? { name: e } : e)];
    }
    
    if (data.second_half && data.second_half.events) {
      const secondHalfEvents = Array.isArray(data.second_half.events) 
        ? data.second_half.events 
        : [data.second_half.events];
        
      events = [...events, ...secondHalfEvents.map(e => typeof e === 'string' ? { name: e } : e)];
    }
    
    // Case 3: events_holidays field
    if (data.events_holidays && Array.isArray(data.events_holidays)) {
      events = [...events, ...data.events_holidays];
    }
    
    // Case 4: festivals field
    if (data.festivals && Array.isArray(data.festivals)) {
      events = [...events, ...data.festivals.map(f => typeof f === 'string' ? { name: f } : f)];
    }
    
    return events.length > 0 ? events : null;
  };
  
  // 4. Extract activities/experiences
  const getActivities = (data) => {
    let activities = [];
    
    // Case 1: Direct activities array
    if (data.activities && Array.isArray(data.activities)) {
      activities = [...activities, ...data.activities.map(a => {
        if (typeof a === 'string') return { activity: a };
        if (a.name && !a.activity) return { ...a, activity: a.name };
        return a;
      })];
    }
    
    // Case 2: Unique experiences array
    if (data.unique_experiences && Array.isArray(data.unique_experiences)) {
      activities = [...activities, ...data.unique_experiences.map(e => {
        if (typeof e === 'string') return { activity: e };
        if (e.name && !e.activity) return { ...e, activity: e.name };
        return e;
      })];
    }
    
    // Case 3: Things to do array
    if (data.things_to_do && Array.isArray(data.things_to_do)) {
      activities = [...activities, ...data.things_to_do.map(t => {
        if (typeof t === 'string') return { activity: t };
        if (t.name && !t.activity) return { ...t, activity: t.name };
        return t;
      })];
    }
    
    // Case 4: Recommendations array
    if (data.recommendations && Array.isArray(data.recommendations)) {
      activities = [...activities, ...data.recommendations.map(r => {
        if (typeof r === 'string') return { activity: r };
        if (r.name && !r.activity) return { ...r, activity: r.name };
        return r;
      })];
    }
    
    // Case 5: first_half/second_half structure
    if (data.first_half && data.first_half.unique_experiences) {
      activities = [...activities, ...data.first_half.unique_experiences.map(e => {
        if (typeof e === 'string') return { activity: e };
        return e;
      })];
    }
    
    if (data.second_half && data.second_half.unique_experiences) {
      activities = [...activities, ...data.second_half.unique_experiences.map(e => {
        if (typeof e === 'string') return { activity: e };
        return e;
      })];
    }
    
    return activities.length > 0 ? activities : null;
  };
  
  // 5. Extract pros/cons or reasons to visit/avoid
  const getReasons = (data) => {
    const reasons = {
      pros: [],
      cons: []
    };
    
    // Case 1: Direct pros/cons arrays
    if (data.pros && Array.isArray(data.pros)) {
      reasons.pros = data.pros.map(p => typeof p === 'string' ? { reason: p } : p);
    }
    
    if (data.cons && Array.isArray(data.cons)) {
      reasons.cons = data.cons.map(c => typeof c === 'string' ? { reason: c } : c);
    }
    
    // Case 2: Reasons to visit/reconsider
    if (data.reasons_to_visit && Array.isArray(data.reasons_to_visit)) {
      reasons.pros = data.reasons_to_visit;
    }
    
    if (data.reasons_to_reconsider && Array.isArray(data.reasons_to_reconsider)) {
      reasons.cons = data.reasons_to_reconsider;
    }
    
    // Case 3: Advantages/disadvantages
    if (data.advantages && Array.isArray(data.advantages)) {
      reasons.pros = data.advantages.map(a => typeof a === 'string' ? { reason: a } : a);
    }
    
    if (data.disadvantages && Array.isArray(data.disadvantages)) {
      reasons.cons = data.disadvantages.map(d => typeof d === 'string' ? { reason: d } : d);
    }
    
    return reasons.pros.length > 0 || reasons.cons.length > 0 ? reasons : null;
  };
  
  // RENDERING FUNCTIONS
  
  // Render pros and cons
  const renderReasons = (reasons) => {
    if (!reasons) return null;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {reasons.pros.length > 0 && (
          <div className="p-5 rounded-lg bg-green-50">
            <h4 className="font-semibold text-lg mb-3 text-green-700">
              Reasons to Visit
            </h4>
            <ul className="space-y-3">
              {reasons.pros.map((item, index) => (
                <li key={index} className="flex">
                  <span className="flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center mt-0.5 mr-3 bg-green-100 text-green-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                  <div>
                    <p className="font-medium text-gray-800">{item.reason || item.text || item}</p>
                    {item.details && <p className="text-sm text-gray-600 mt-1">{item.details}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {reasons.cons.length > 0 && (
          <div className="p-5 rounded-lg bg-amber-50">
            <h4 className="font-semibold text-lg mb-3 text-amber-700">
              Reasons to Reconsider
            </h4>
            <ul className="space-y-3">
              {reasons.cons.map((item, index) => (
                <li key={index} className="flex">
                  <span className="flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center mt-0.5 mr-3 bg-amber-100 text-amber-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </span>
                  <div>
                    <p className="font-medium text-gray-800">{item.reason || item.text || item}</p>
                    {item.details && <p className="text-sm text-gray-600 mt-1">{item.details}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };
  
  // Render weather information
  const renderWeather = (weather) => {
    if (!weather) return null;
    
    // Simple weather with just a description
    if (weather.description) {
      return (
        <div className="mt-6 bg-blue-50 rounded-lg p-5">
          <h4 className="font-semibold text-lg text-blue-700 mb-3">Weather</h4>
          <p className="text-gray-700">{weather.description}</p>
          
          {(weather.temperature || weather.precipitation) && (
            <div className="mt-3 pt-3 border-t border-blue-100 grid grid-cols-1 md:grid-cols-2 gap-4">
              {weather.temperature && (
                <div>
                  <p className="font-medium text-blue-800">Temperature</p>
                  <p className="text-gray-700">{weather.temperature}</p>
                </div>
              )}
              
              {weather.precipitation && (
                <div>
                  <p className="font-medium text-blue-800">Precipitation</p>
                  <p className="text-gray-700">{weather.precipitation}</p>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }
    
    // More complex weather with first_half/second_half
    if (weather.first_half) {
      return (
        <div className="mt-6 bg-blue-50 rounded-lg p-5">
          <h4 className="font-semibold text-lg text-blue-700 mb-3">Weather</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h5 className="font-medium text-blue-800 mb-2">
                {weather.first_half.date_range || 'Early Month'}
              </h5>
              <div className="text-gray-700">
                {weather.first_half.average_temperature && (
                  <p className="mb-2">
                    <span className="font-medium">Temperature:</span> {' '}
                    {typeof weather.first_half.average_temperature === 'object' ? (
                      <>High: {weather.first_half.average_temperature.high}, Low: {weather.first_half.average_temperature.low}</>
                    ) : (
                      String(weather.first_half.average_temperature)
                    )}
                  </p>
                )}
                {weather.first_half.precipitation && (
                  <p className="mb-2">
                    <span className="font-medium">Precipitation:</span> {' '}
                    {typeof weather.first_half.precipitation === 'string' ? 
                      weather.first_half.precipitation : 
                      JSON.stringify(weather.first_half.precipitation)}
                  </p>
                )}
                {weather.first_half.description && (
                  <p className="mb-2">{weather.first_half.description}</p>
                )}
              </div>
            </div>
            
            {weather.second_half && (
              <div>
                <h5 className="font-medium text-blue-800 mb-2">
                  {weather.second_half.date_range || 'Late Month'}
                </h5>
                <div className="text-gray-700">
                  {weather.second_half.average_temperature && (
                    <p className="mb-2">
                      <span className="font-medium">Temperature:</span> {' '}
                      {typeof weather.second_half.average_temperature === 'object' ? (
                        <>High: {weather.second_half.average_temperature.high}, Low: {weather.second_half.average_temperature.low}</>
                      ) : (
                        String(weather.second_half.average_temperature)
                      )}
                    </p>
                  )}
                  {weather.second_half.precipitation && (
                    <p className="mb-2">
                      <span className="font-medium">Precipitation:</span> {' '}
                      {typeof weather.second_half.precipitation === 'string' ? 
                        weather.second_half.precipitation : 
                        JSON.stringify(weather.second_half.precipitation)}
                    </p>
                  )}
                  {weather.second_half.description && (
                    <p className="mb-2">{weather.second_half.description}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }
    
    // Generic weather object with unknown structure
    return (
      <div className="mt-6 bg-blue-50 rounded-lg p-5">
        <h4 className="font-semibold text-lg text-blue-700 mb-3">Weather</h4>
        <div className="text-gray-700">
          {Object.entries(weather).map(([key, value]) => {
            // Skip first_half/second_half as we handle those separately
            if (key === 'first_half' || key === 'second_half') return null;
            
            // Format the key for display
            const displayKey = key.split('_').map(word => 
              word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
            
            // Format the value based on type
            let displayValue;
            if (typeof value === 'object') {
              displayValue = JSON.stringify(value);
            } else {
              displayValue = value;
            }
            
            return (
              <p key={key} className="mb-2">
                <span className="font-medium">{displayKey}:</span> {displayValue}
              </p>
            );
          })}
        </div>
      </div>
    );
  };
  
  // Render events and holidays
  const renderEvents = (events) => {
    if (!events || events.length === 0) return null;
    
    // Split events for two columns
    const middleIndex = Math.ceil(events.length / 2);
    const leftColumnEvents = events.slice(0, middleIndex);
    const rightColumnEvents = events.slice(middleIndex);
    
    return (
      <div className="mt-6 bg-purple-50 rounded-lg p-5">
        <h4 className="font-semibold text-lg text-purple-700 mb-4">Events & Holidays</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            {leftColumnEvents.map((event, index) => (
              <div key={index} className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                <h5 className="font-semibold text-gray-800">{event.name || event.title || event.event}</h5>
                {event.date && <p className="text-sm text-purple-700 mt-1 font-medium">{event.date}</p>}
                {event.description && <p className="text-sm text-gray-600 mt-2">{event.description}</p>}
                {event.notes && (
                  <div className="mt-2 pt-2 border-t border-purple-100">
                    <p className="text-xs text-gray-500 italic">{event.notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="space-y-4">
            {rightColumnEvents.map((event, index) => (
              <div key={index} className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                <h5 className="font-semibold text-gray-800">{event.name || event.title || event.event}</h5>
                {event.date && <p className="text-sm text-purple-700 mt-1 font-medium">{event.date}</p>}
                {event.description && <p className="text-sm text-gray-600 mt-2">{event.description}</p>}
                {event.notes && (
                  <div className="mt-2 pt-2 border-t border-purple-100">
                    <p className="text-xs text-gray-500 italic">{event.notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };
  
  // Render activities/experiences
  const renderActivities = (activities) => {
    if (!activities || activities.length === 0) return null;
    
    // Limit displayed activities based on state
    const displayActivities = showAllExperiences ? activities : activities.slice(0, 6);
    
    return (
      <div className="mt-6 bg-indigo-50 rounded-lg p-5">
        <h4 className="font-semibold text-lg text-indigo-700 mb-4">Recommended Activities</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayActivities.map((activity, index) => (
            <div key={index} className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-indigo-100">
              <div className="flex items-start mb-3">
                <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center mr-3 flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
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
  
  return (
    <div>
      {/* Tab navigation */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex overflow-x-auto scrollbar-none py-2">
          {availablePeriods.map((period) => (
            <button
              key={period}
              className={`whitespace-nowrap px-4 py-2 font-medium text-sm rounded-t-lg mr-2 transition ${
                activeTab === period
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              onClick={() => setActiveTab(period)}
            >
              {formatDisplayName(period)}
            </button>
          ))}
        </div>
      </div>

      {/* Active tab content */}
      <div>
        <h3 className="text-xl font-bold text-gray-800 mb-4">
          {cityName} in {formatDisplayName(activeTab)}
        </h3>
        
        {/* Description */}
        {getDescription(activeData) && (
          <p className="text-gray-700 mb-6">{getDescription(activeData)}</p>
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
  );
};

export default MonthlyGuideSection;