'use client';
// src/components/city-guides/MonthlyGuideSection.js
import React, { useState, useEffect } from 'react';

const MonthlyGuideSection = ({ cityName, monthlyData }) => {
  // Standard month names
  const standardMonths = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Season names
  const seasons = ['Spring', 'Summer', 'Fall', 'Winter'];

  // Determine if we have monthly or seasonal data
  const hasMonthlyData = Object.keys(monthlyData).some(key => standardMonths.includes(key));
  const hasSeasonalData = Object.keys(monthlyData).some(key => seasons.includes(key));

  // Get available time periods (months or seasons)
  const availablePeriods = Object.keys(monthlyData).sort((a, b) => {
    if (standardMonths.includes(a) && standardMonths.includes(b)) {
      return standardMonths.indexOf(a) - standardMonths.indexOf(b);
    }
    if (seasons.includes(a) && seasons.includes(b)) {
      return seasons.indexOf(a) - seasons.indexOf(b);
    }
    return 0;
  });

  // Set initial active tab to current month or first available period
  const getCurrentMonthName = () => standardMonths[new Date().getMonth()];
  const [activeTab, setActiveTab] = useState(() => {
    const currentMonth = getCurrentMonthName();
    return availablePeriods.includes(currentMonth) ? currentMonth : availablePeriods[0];
  });

  // Render reasons lists
  const renderReasonsList = (items, type) => {
    if (!items || items.length === 0) return null;
    
    return (
      <div className={`p-5 rounded-lg h-full ${type === 'pros' ? 'bg-green-50' : 'bg-amber-50'}`}>
        <h4 className={`font-semibold text-lg mb-3 ${type === 'pros' ? 'text-green-700' : 'text-amber-700'}`}>
          {type === 'pros' ? 'Reasons to Visit' : 'Reasons to Reconsider'}
        </h4>
        <ul className="space-y-3">
          {items.map((item, index) => (
            <li key={index} className="flex">
              <span className={`flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center mt-0.5 mr-3 ${type === 'pros' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                {type === 'pros' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                )}
              </span>
              <div>
                <p className="font-medium text-gray-800">{item.reason}</p>
                {item.details && <p className="text-sm text-gray-600 mt-1">{item.details}</p>}
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  // Render weather information - removed tips section
  const renderWeather = (data) => {
    if (!data || !data.first_half || !data.second_half) {
      if (!data || (!data.weather && !data.temperature)) return null;
      
      return (
        <div className="mt-6 bg-blue-50 rounded-lg p-5">
          <h4 className="font-semibold text-lg text-blue-700 mb-3">Weather</h4>
          <div className="text-gray-700">
            {data.temperature && (
              <p className="mb-2">
                <span className="font-medium">Temperature:</span> {data.temperature}
              </p>
            )}
            {data.weather && (
              <p className="mb-2">
                <span className="font-medium">Conditions:</span> {data.weather}
              </p>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="mt-6 bg-blue-50 rounded-lg p-5">
        <h4 className="font-semibold text-lg text-blue-700 mb-3">Weather</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h5 className="font-medium text-blue-800 mb-2">
              {data.first_half.date_range || 'Early Month'}
            </h5>
            <div className="text-gray-700">
              {data.first_half.weather && data.first_half.weather.average_temperature && (
                <p className="mb-2">
                  <span className="font-medium">Temperature:</span> High: {data.first_half.weather.average_temperature.high}, Low: {data.first_half.weather.average_temperature.low}
                </p>
              )}
              {data.first_half.weather && data.first_half.weather.precipitation && (
                <p className="mb-2">
                  <span className="font-medium">Precipitation:</span> {data.first_half.weather.precipitation}
                </p>
              )}
            </div>
          </div>
          <div>
            <h5 className="font-medium text-blue-800 mb-2">
              {data.second_half.date_range || 'Late Month'}
            </h5>
            <div className="text-gray-700">
              {data.second_half.weather && data.second_half.weather.average_temperature && (
                <p className="mb-2">
                  <span className="font-medium">Temperature:</span> High: {data.second_half.weather.average_temperature.high}, Low: {data.second_half.weather.average_temperature.low}
                </p>
              )}
              {data.second_half.weather && data.second_half.weather.precipitation && (
                <p className="mb-2">
                  <span className="font-medium">Precipitation:</span> {data.second_half.weather.precipitation}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render events and holidays - updated to two columns with improved styling
  const renderEvents = (data) => {
    let events = [];
    
    // Check both first_half and second_half if they exist
    if (data.first_half && data.first_half.events_holidays) {
      events = [...events, ...data.first_half.events_holidays];
    }
    
    if (data.second_half && data.second_half.events_holidays) {
      events = [...events, ...data.second_half.events_holidays];
    }
    
    // Check direct events property
    if (data.events) {
      events = [...events, ...data.events];
    }
    
    // Check events_holidays at root level
    if (data.events_holidays) {
      events = [...events, ...data.events_holidays];
    }
    
    if (events.length === 0) return null;
    
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
                <h5 className="font-semibold text-gray-800">{event.name}</h5>
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
                <h5 className="font-semibold text-gray-800">{event.name}</h5>
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

  // Render unique experiences/activities - improved styling
  const renderExperiences = (data) => {
    let experiences = [];
    
    // Check both first_half and second_half if they exist
    if (data.first_half && data.first_half.unique_experiences) {
      experiences = [...experiences, ...data.first_half.unique_experiences];
    }
    
    if (data.second_half && data.second_half.unique_experiences) {
      experiences = [...experiences, ...data.second_half.unique_experiences];
    }
    
    // Check activities at root level
    if (data.activities) {
      experiences = [...experiences, ...data.activities];
    }
    
    // Check unique_experiences at root level
    if (data.unique_experiences) {
      experiences = [...experiences, ...data.unique_experiences];
    }
    
    if (experiences.length === 0) return null;
    
    const [showAll, setShowAll] = useState(false);
    const displayExperiences = showAll ? experiences : experiences.slice(0, 6);
    
    return (
      <div className="mt-6 bg-indigo-50 rounded-lg p-5">
        <h4 className="font-semibold text-lg text-indigo-700 mb-4">Recommended Activities</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayExperiences.map((exp, index) => (
            <div key={index} className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-indigo-100">
              <div className="flex items-start mb-3">
                <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center mr-3 flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
                <h5 className="font-medium text-indigo-800 leading-tight">{exp.activity}</h5>
              </div>
              {exp.where && (
                <div className="flex items-center mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-500 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  <p className="text-xs text-indigo-600">{exp.where}</p>
                </div>
              )}
              {exp.description && <p className="text-sm text-gray-600 mb-3">{exp.description}</p>}
              <div className="flex flex-wrap mt-auto">
                {exp.best_time && (
                  <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full text-xs mr-2 mb-2 font-medium">
                    {exp.best_time}
                  </span>
                )}
                {exp.estimated_cost && (
                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs mr-2 mb-2 font-medium">
                    {exp.estimated_cost}
                  </span>
                )}
                {exp.weather_dependent !== undefined && (
                  <span className={`${exp.weather_dependent ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'} px-2 py-1 rounded-full text-xs mb-2 font-medium`}>
                    {exp.weather_dependent ? 'Weather dependent' : 'All weather'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        {experiences.length > 6 && (
          <div className="text-center mt-6">
            <button 
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2 rounded-full transition-colors text-sm shadow-sm"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? 'Show Less' : `See ${experiences.length - 6} More Activities`}
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
              {period}
            </button>
          ))}
        </div>
      </div>

      {/* Active tab content */}
      <div>
        <h3 className="text-xl font-bold text-gray-800 mb-4">
          {cityName} in {activeTab}
        </h3>
        
        {monthlyData[activeTab]?.description && (
          <p className="text-gray-700 mb-6">{monthlyData[activeTab].description}</p>
        )}
        
        {monthlyData[activeTab]?.overview && (
          <p className="text-gray-700 mb-6">{monthlyData[activeTab].overview}</p>
        )}
        
        {/* Two-column layout for reasons to visit and reconsider */}
        {(monthlyData[activeTab]?.reasons_to_visit || monthlyData[activeTab]?.reasons_to_reconsider) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              {monthlyData[activeTab]?.reasons_to_visit && renderReasonsList(monthlyData[activeTab].reasons_to_visit, 'pros')}
            </div>
            <div>
              {monthlyData[activeTab]?.reasons_to_reconsider && renderReasonsList(monthlyData[activeTab].reasons_to_reconsider, 'cons')}
            </div>
          </div>
        )}
        
        {renderWeather(monthlyData[activeTab])}
        
        {renderEvents(monthlyData[activeTab])}
        
        {renderExperiences(monthlyData[activeTab])}
      </div>
    </div>
  );
};

export default MonthlyGuideSection;