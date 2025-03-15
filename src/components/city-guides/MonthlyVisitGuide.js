'use client';

import { useState, useEffect } from 'react';
import { Tab } from '@headlessui/react';

// Debug function to help see data structure
const debugMonthData = (monthData) => {
  console.log("Month data structure:", {
    keys: Object.keys(monthData || {}),
    hasReasons: monthData && monthData.reasons_to_visit ? 'yes' : 'no',
    firstLevel: monthData ? Object.keys(monthData).slice(0, 3).join(', ') + '...' : 'none'
  });
};

export default function MonthlyVisitGuide({ monthlyData, currentMonth = 'January' }) {
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  // Log data structure for debugging
  useEffect(() => {
    console.log("Monthly data keys:", Object.keys(monthlyData || {}));
    if (Object.keys(monthlyData || {}).length > 0) {
      const firstMonth = Object.keys(monthlyData)[0];
      debugMonthData(monthlyData[firstMonth]);
    }
  }, [monthlyData]);

  useEffect(() => {
    // If the current month exists in our data, select it by default
    if (monthlyData && monthlyData[currentMonth]) {
      setSelectedMonth(currentMonth);
    } else {
      // Otherwise, select the first available month
      const availableMonths = Object.keys(monthlyData || {});
      if (availableMonths.length > 0) {
        setSelectedMonth(availableMonths[0]);
      }
    }
  }, [monthlyData, currentMonth]);

  // Get the selected month's data
  const selectedMonthData = monthlyData && monthlyData[selectedMonth];

  // Function to render pros and cons badges
  const renderProsConsBadges = (items, type) => {
    if (!items || items.length === 0) return null;
    
    return (
      <div className="space-y-3">
        {items.map((item, index) => (
          <div 
            key={index}
            className={`bg-white rounded-lg shadow-sm p-4 border-l-4 ${
              type === 'pros' ? 'border-green-500' : 'border-red-500'
            }`}
          >
            <h4 className={`font-bold mb-1 ${
              type === 'pros' ? 'text-green-700' : 'text-red-700'
            }`}>
              {item.reason}
            </h4>
            <p className="text-sm text-gray-600">{item.details}</p>
          </div>
        ))}
      </div>
    );
  };

  // Render weather information
  const renderWeatherInfo = (weather) => {
    if (!weather) return null;
    
    return (
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {weather.average_temperature && (
            <div className="flex-1">
              <h4 className="text-sm font-medium text-gray-500 mb-1">Temperature</h4>
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v7.95l3.95 3.95a1 1 0 01-1.414 1.414l-4.242-4.243a1 1 0 01-.293-.707V3a1 1 0 011-1z" clipRule="evenodd" />
                  <path d="M10 18a5 5 0 100-10 5 5 0 000 10z" />
                </svg>
                <span className="font-semibold text-lg">
                  {weather.average_temperature.high} / {weather.average_temperature.low}
                </span>
              </div>
            </div>
          )}
          
          {weather.precipitation && (
            <div className="flex-1">
              <h4 className="text-sm font-medium text-gray-500 mb-1">Precipitation</h4>
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-gray-600">{weather.precipitation}</span>
              </div>
            </div>
          )}
        </div>
        
        {weather.general_tips && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <h4 className="text-sm font-medium text-gray-500 mb-1">Tips</h4>
            <p className="text-sm text-gray-600">{weather.general_tips}</p>
          </div>
        )}
      </div>
    );
  };

  // Render tourism level information
  const renderTourismInfo = (tourism) => {
    if (!tourism) return null;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {tourism.crowds && (
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h4 className="text-sm font-medium text-gray-500 mb-1">Crowd Levels</h4>
            <p className="text-sm text-gray-600">{tourism.crowds}</p>
          </div>
        )}
        
        {tourism.pricing && (
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h4 className="text-sm font-medium text-gray-500 mb-1">Pricing</h4>
            <p className="text-sm text-gray-600">{tourism.pricing}</p>
          </div>
        )}
        
        {tourism.overall_atmosphere && (
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h4 className="text-sm font-medium text-gray-500 mb-1">Atmosphere</h4>
            <p className="text-sm text-gray-600">{tourism.overall_atmosphere}</p>
          </div>
        )}
      </div>
    );
  };

  // Render events information
  const renderEventsInfo = (events) => {
    if (!events || events.length === 0) return null;
    
    return (
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <h4 className="font-semibold text-gray-800 mb-3">Special Events</h4>
        <div className="space-y-3">
          {events.map((event, index) => (
            <div key={index} className="border-b border-gray-100 last:border-none pb-3 last:pb-0">
              <div className="flex justify-between">
                <h5 className="font-medium text-gray-800">{event.name}</h5>
                {event.date && <span className="text-sm text-blue-600">{event.date}</span>}
              </div>
              {event.description && <p className="text-sm text-gray-600 mt-1">{event.description}</p>}
              {event.notes && <p className="text-xs text-gray-500 italic mt-1">{event.notes}</p>}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render unique experiences information
  const renderExperiencesInfo = (experiences) => {
    if (!experiences || experiences.length === 0) return null;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {experiences.map((exp, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
            <div className="flex items-start">
              <div className="bg-blue-100 text-blue-600 rounded-full p-2 mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h5 className="font-medium text-gray-800 mb-1">{exp.activity}</h5>
                {exp.where && <p className="text-sm text-blue-600 mb-2">{exp.where}</p>}
                {exp.description && <p className="text-sm text-gray-600 mb-2">{exp.description}</p>}
                
                <div className="mt-3 pt-2 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs">
                  {exp.best_time && (
                    <div>
                      <span className="text-gray-500">Best time:</span> {exp.best_time}
                    </div>
                  )}
                  {exp.estimated_cost && (
                    <div>
                      <span className="text-gray-500">Cost:</span> {exp.estimated_cost}
                    </div>
                  )}
                  {exp.weather_dependent !== undefined && (
                    <div className="col-span-2">
                      <span className="text-gray-500">Weather dependent:</span> {exp.weather_dependent ? 'Yes' : 'No'}
                    </div>
                  )}
                </div>
                
                {exp.practical_tips && (
                  <div className="mt-2 text-xs text-gray-500 italic">
                    <strong>Tip:</strong> {exp.practical_tips}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Function to get a month's color based on tourism data
  const getMonthColor = (month) => {
    const data = monthlyData && monthlyData[month];
    if (!data) return 'bg-gray-100 text-gray-500';
    
    // Count pro reasons (more is better)
    const proCount = data.reasons_to_visit ? data.reasons_to_visit.length : 0;
    
    // Count con reasons (more is worse)
    const conCount = data.reasons_to_reconsider ? data.reasons_to_reconsider.length : 0;
    
    // Simple ranking (pros - cons)
    const score = proCount - conCount;
    
    if (score >= 3) return 'bg-green-100 text-green-800 border-green-200';  // Excellent time
    if (score >= 1) return 'bg-blue-100 text-blue-800 border-blue-200';     // Good time
    if (score === 0) return 'bg-yellow-100 text-yellow-800 border-yellow-200'; // Neutral
    return 'bg-orange-100 text-orange-800 border-orange-200';               // Not ideal
  };

  if (!monthlyData || Object.keys(monthlyData).length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>No monthly data available for this city.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Months Selector */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Select a month to see when to visit</h3>
        <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-12 gap-2">
          {months.map((month) => {
            const isAvailable = monthlyData && !!monthlyData[month];
            const isSelected = selectedMonth === month;
            let btnClass = 'py-2 px-1 text-center text-sm rounded-md border transition-all duration-200 ';
            
            if (!isAvailable) {
              btnClass += 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60';
            } else if (isSelected) {
              btnClass += 'bg-blue-600 text-white border-blue-600 font-medium';
            } else {
              btnClass += getMonthColor(month);
            }
            
            return (
              <button
                key={month}
                className={btnClass}
                onClick={() => isAvailable && setSelectedMonth(month)}
                disabled={!isAvailable}
              >
                {month.substring(0, 3)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Month Data Display */}
      {selectedMonthData && (
        <div>
          {/* Pros and Cons Section */}
          <div className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Reasons to Visit in {selectedMonth}
                </h3>
                {renderProsConsBadges(selectedMonthData.reasons_to_visit, 'pros')}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  Reasons to Reconsider
                </h3>
                {renderProsConsBadges(selectedMonthData.reasons_to_reconsider, 'cons')}
              </div>
            </div>
          </div>

          {/* Half-Month Tabs */}
          {(selectedMonthData.first_half || selectedMonthData.second_half) && (
            <Tab.Group>
              <Tab.List className="flex space-x-2 rounded-xl bg-blue-50 p-1 mb-4">
                <Tab
                  className={({ selected }) =>
                    `w-full rounded-lg py-2.5 text-sm font-medium leading-5 text-blue-700 ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2 ${
                      selected
                        ? 'bg-white shadow'
                        : 'text-blue-500 hover:bg-white/[0.12] hover:text-blue-700'
                    }`
                  }
                >
                  Early {selectedMonth}
                </Tab>
                <Tab
                  className={({ selected }) =>
                    `w-full rounded-lg py-2.5 text-sm font-medium leading-5 text-blue-700 ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2 ${
                      selected
                        ? 'bg-white shadow'
                        : 'text-blue-500 hover:bg-white/[0.12] hover:text-blue-700'
                    }`
                  }
                >
                  Late {selectedMonth}
                </Tab>
              </Tab.List>
              <Tab.Panels className="mt-2">
                <Tab.Panel className="rounded-xl bg-white p-3">
                  {selectedMonthData.first_half && (
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-md font-semibold text-gray-800 mb-3">
                          {selectedMonthData.first_half.date_range || `${selectedMonth} 1–15`}
                        </h4>
                        
                        {/* Weather Section */}
                        {selectedMonthData.first_half.weather && (
                          <div className="mb-6">
                            <h5 className="text-sm font-semibold text-gray-700 mb-2">Weather</h5>
                            {renderWeatherInfo(selectedMonthData.first_half.weather)}
                          </div>
                        )}
                        
                        {/* Tourism Level Section */}
                        {selectedMonthData.first_half.tourism_level && (
                          <div className="mb-6">
                            <h5 className="text-sm font-semibold text-gray-700 mb-2">Tourism & Crowds</h5>
                            {renderTourismInfo(selectedMonthData.first_half.tourism_level)}
                          </div>
                        )}
                        
                        {/* Events & Holidays Section */}
                        {selectedMonthData.first_half.events_holidays && selectedMonthData.first_half.events_holidays.length > 0 && (
                          <div className="mb-6">
                            <h5 className="text-sm font-semibold text-gray-700 mb-2">Events & Holidays</h5>
                            {renderEventsInfo(selectedMonthData.first_half.events_holidays)}
                          </div>
                        )}
                        
                        {/* Unique Experiences Section */}
                        {selectedMonthData.first_half.unique_experiences && selectedMonthData.first_half.unique_experiences.length > 0 && (
                          <div className="mb-6">
                            <h5 className="text-sm font-semibold text-gray-700 mb-2">Recommended Activities</h5>
                            {renderExperiencesInfo(selectedMonthData.first_half.unique_experiences)}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Tab.Panel>
                <Tab.Panel className="rounded-xl bg-white p-3">
                  {selectedMonthData.second_half && (
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-md font-semibold text-gray-800 mb-3">
                          {selectedMonthData.second_half.date_range || `${selectedMonth} 16–${new Date(new Date().getFullYear(), months.indexOf(selectedMonth) + 1, 0).getDate()}`}
                        </h4>
                        
                        {/* Weather Section */}
                        {selectedMonthData.second_half.weather && (
                          <div className="mb-6">
                            <h5 className="text-sm font-semibold text-gray-700 mb-2">Weather</h5>
                            {renderWeatherInfo(selectedMonthData.second_half.weather)}
                          </div>
                        )}
                        
                        {/* Tourism Level Section */}
                        {selectedMonthData.second_half.tourism_level && (
                          <div className="mb-6">
                            <h5 className="text-sm font-semibold text-gray-700 mb-2">Tourism & Crowds</h5>
                            {renderTourismInfo(selectedMonthData.second_half.tourism_level)}
                          </div>
                        )}
                        
                        {/* Events & Holidays Section */}
                        {selectedMonthData.second_half.events_holidays && selectedMonthData.second_half.events_holidays.length > 0 && (
                          <div className="mb-6">
                            <h5 className="text-sm font-semibold text-gray-700 mb-2">Events & Holidays</h5>
                            {renderEventsInfo(selectedMonthData.second_half.events_holidays)}
                          </div>
                        )}
                        
                        {/* Unique Experiences Section */}
                        {selectedMonthData.second_half.unique_experiences && selectedMonthData.second_half.unique_experiences.length > 0 && (
                          <div className="mb-6">
                            <h5 className="text-sm font-semibold text-gray-700 mb-2">Recommended Activities</h5>
                            {renderExperiencesInfo(selectedMonthData.second_half.unique_experiences)}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Tab.Panel>
              </Tab.Panels>
            </Tab.Group>
          )}
        </div>
      )}
    </div>
  );
}