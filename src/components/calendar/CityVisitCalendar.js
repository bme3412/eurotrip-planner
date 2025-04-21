'use client';

import React, { useState, useEffect } from 'react';

// Constants for UI elements
const RATING_LABELS = {
  5: 'Excellent',
  4: 'Good',
  3: 'Average',
  2: 'Below Average',
  1: 'Poor'
};

const RATING_COLORS = {
  5: '#4ade80', // Green
  4: '#86efac', // Light green
  3: '#fde047', // Yellow
  2: '#fdba74', // Orange
  1: '#f87171'  // Red
};

// Helper function to get month name - defined before it's used
const getMonthName = (monthNum) => {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return monthNames[monthNum - 1]; // Convert 1-based to 0-based index
};

const CityVisitCalendar = ({ city, cityData = null }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState(null);
  const [view, setView] = useState('calendar'); // calendar, best, worst
  const [calendarData, setCalendarData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const processCalendarData = () => {
      setLoading(true);
      try {
        // Use the cityData if provided directly
        if (cityData && cityData.monthlyEvents) {
          setCalendarData({
            cityName: city,
            months: cityData.monthlyEvents
          });
          setError(null);
          setLoading(false);
          return;
        }
        
        // If no cityData provided, fetch it manually
        const fetchCalendarData = async () => {
          try {
            // Normalize the city name to lowercase
            const normalizedCity = city.toLowerCase();
            
            // Get the country for the city
            const countryMap = {
              'paris': 'France',
              'nice': 'France',
              'amsterdam': 'Netherlands',
              'berlin': 'Germany',
              'barcelona': 'Spain',
              'rome': 'Italy',
              'vienna': 'Austria',
              'brussels': 'Belgium',
              'copenhagen': 'Denmark',
              'dublin': 'Ireland',
              'innsbruck': 'Austria',
              'salzburg': 'Austria',
              'antwerp': 'Belgium'
              // Add other cities as needed
            };
            
            const country = countryMap[normalizedCity];
            
            if (!country) {
              throw new Error(`Country not found for city: ${normalizedCity}`);
            }
            
            // Reorder the possible paths so the city-specific JSON files are checked first
            const possiblePaths = [
              `/data/${country}/${normalizedCity}/${normalizedCity}-visit-calendar.json`,
              `/data/${country}/${normalizedCity}/${normalizedCity}_visit_calendar.json`,
              `/data/${country}/${normalizedCity}/monthly`
            ];
            
            let data = null;
            
            // Try to load data from a visit calendar JSON file first
            for (const path of possiblePaths) {
              if (path.endsWith('.json')) {
                try {
                  const response = await fetch(path);
                  if (response.ok) {
                    data = await response.json();
                    break;
                  }
                } catch (e) {
                  console.log(`Failed to load from ${path}: ${e.message}`);
                }
              }
            }
            
            // If we failed to load a single JSON file, try to load monthly data
            if (!data) {
              const monthlyData = {};
              
              // List of months we'll try to fetch
              const months = [
                'january', 'february', 'march', 'april', 'may', 'june',
                'july', 'august', 'september', 'october', 'november', 'december',
                'spring', 'summer', 'fall', 'winter'
              ];
              
              // Try to fetch each month
              for (const month of months) {
                try {
                  const response = await fetch(`/data/${country}/${normalizedCity}/monthly/${month}.json`);
                  if (response.ok) {
                    const monthData = await response.json();
                    
                    // Handle different data structures
                    if (monthData[month.charAt(0).toUpperCase() + month.slice(1)]) {
                      monthlyData[month] = monthData[month.charAt(0).toUpperCase() + month.slice(1)];
                    } else {
                      monthlyData[month] = monthData;
                    }
                  }
                } catch (e) {
                  console.log(`Failed to load ${month}: ${e.message}`);
                }
              }
              
              // If we found any monthly data, use it
              if (Object.keys(monthlyData).length > 0) {
                data = {
                  cityName: normalizedCity,
                  months: monthlyData
                };
              } else {
                throw new Error(`No monthly data found for ${normalizedCity}`);
              }
            }
            
            setCalendarData(data);
            setError(null);
          } catch (error) {
            console.error('Error loading calendar data:', error);
            setError(error.message);
            setCalendarData(null);
          } finally {
            setLoading(false);
          }
        };
        
        fetchCalendarData();
      } catch (error) {
        console.error('Error processing calendar data:', error);
        setError(error.message);
        setLoading(false);
      }
    };
    
    processCalendarData();
  }, [city, cityData]);
  
  // Early return if still loading
  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  // Show error message if there was an error
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
        <p className="text-red-600">{error}</p>
        <p className="text-sm text-gray-600 mt-2">
          Try exploring other sections of the city guide for more information.
        </p>
      </div>
    );
  }
  
  // Check if we have valid calendar data
  if (!calendarData || !calendarData.months || Object.keys(calendarData.months).length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
        <p className="text-amber-600">No visit calendar information available for {city}.</p>
        <p className="text-sm text-gray-600 mt-2">
          We&apos;re working on adding more detailed seasonal information.
        </p>
      </div>
    );
  }
  
  // Get data for the selected month
  const getMonthData = (monthNum) => {
    const monthName = getMonthName(monthNum).toLowerCase();
    
    // Check if we have data for this month
    if (!calendarData.months[monthName]) {
      // Try to find seasonal data instead
      const seasons = {
        'winter': [12, 1, 2],
        'spring': [3, 4, 5],
        'summer': [6, 7, 8],
        'fall': [9, 10, 11]
      };
      
      // Find which season this month belongs to
      for (const [season, months] of Object.entries(seasons)) {
        if (months.includes(monthNum) && calendarData.months[season]) {
          return {
            ...calendarData.months[season],
            isSeasonal: true,
            seasonName: season
          };
        }
      }
      
      return null;
    }
    
    return calendarData.months[monthName];
  };
  
  // Get the current month's data
  const currentMonthData = getMonthData(selectedMonth);
  
  // Check if month has data
  const hasMonthData = (monthNum) => {
    return getMonthData(monthNum) !== null;
  };
  
  // Format date for display
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  // Get rating class based on the crowding level or quality
  const getRatingClass = (rating) => {
    if (!rating) return 'bg-gray-200 text-gray-800';
    
    // Normalize rating to a scale of 1-5
    let normalizedRating;
    
    if (typeof rating === 'string') {
      const lowercaseRating = rating.toLowerCase();
      if (lowercaseRating.includes('excellent') || lowercaseRating.includes('best')) {
        normalizedRating = 5;
      } else if (lowercaseRating.includes('good')) {
        normalizedRating = 4;
      } else if (lowercaseRating.includes('average') || lowercaseRating.includes('moderate')) {
        normalizedRating = 3;
      } else if (lowercaseRating.includes('below') || lowercaseRating.includes('poor')) {
        normalizedRating = 2;
      } else if (lowercaseRating.includes('avoid') || lowercaseRating.includes('worst')) {
        normalizedRating = 1;
      } else {
        normalizedRating = 3; // Default to average
      }
    } else if (typeof rating === 'number') {
      // If rating is a number between 1-10, convert to 1-5
      if (rating >= 1 && rating <= 10) {
        normalizedRating = Math.ceil(rating / 2);
      } else {
        normalizedRating = Math.min(Math.max(rating, 1), 5); // Ensure between 1-5
      }
    } else {
      normalizedRating = 3; // Default to average
    }
    
    // Map rating to color classes
    switch (normalizedRating) {
      case 5: return 'bg-green-100 text-green-800';
      case 4: return 'bg-green-50 text-green-600';
      case 3: return 'bg-yellow-100 text-yellow-800';
      case 2: return 'bg-orange-100 text-orange-800';
      case 1: return 'bg-red-100 text-red-800';
      default: return 'bg-gray-200 text-gray-800';
    }
  };
  
  // Determine crowding level from month data
  const getCrowdingLevel = (monthData) => {
    if (!monthData) return 'N/A';
    
    if (monthData.crowding) {
      return monthData.crowding;
    }
    
    if (monthData.tourism_level) {
      return monthData.tourism_level;
    }
    
    if (monthData.tourismLevel) {
      return monthData.tourismLevel;
    }
    
    if (monthData.crowd_level) {
      return monthData.crowd_level;
    }
    
    // Try to infer from description
    const description = monthData.description || monthData.overview || '';
    if (description.toLowerCase().includes('crowd')) {
      if (description.toLowerCase().includes('high crowd')) return 'High';
      if (description.toLowerCase().includes('low crowd')) return 'Low';
      if (description.toLowerCase().includes('moderate crowd')) return 'Medium';
    }
    
    return 'Varies';
  };
  
  // Get the city name with proper capitalization
  const displayCityName = city.charAt(0).toUpperCase() + city.slice(1);
  
  return (
    <div className="bg-white p-6 rounded-xl">
      {/* Month selection */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-4">Select a month to visit {displayCityName}</h3>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-2">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
            <button
              key={month}
              onClick={() => setSelectedMonth(month)}
              className={`py-2 px-1 text-sm rounded-md transition ${
                selectedMonth === month
                  ? 'bg-blue-600 text-white font-medium'
                  : hasMonthData(month)
                  ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {getMonthName(month).substring(0, 3)}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar content */}
      {currentMonthData ? (
        <div>
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-bold text-blue-900">
                {getMonthName(selectedMonth)} in {displayCityName}
                {currentMonthData.isSeasonal && (
                  <span className="ml-2 text-sm font-normal text-blue-700">
                    ({currentMonthData.seasonName.charAt(0).toUpperCase() + currentMonthData.seasonName.slice(1)} Season)
                  </span>
                )}
              </h3>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRatingClass(getCrowdingLevel(currentMonthData))}`}>
                {typeof getCrowdingLevel(currentMonthData) === 'string' 
                  ? `${getCrowdingLevel(currentMonthData)} Season`
                  : `Crowd Level: ${getCrowdingLevel(currentMonthData)}/10`}
              </span>
            </div>
            <p className="text-blue-800">
              {currentMonthData.overview || currentMonthData.description || currentMonthData.notes || 'Experience the unique charm of this month.'}
            </p>
          </div>

          {/* Pros and Cons */}
          {(currentMonthData.pros || currentMonthData.cons) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {currentMonthData.pros && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="text-green-800 font-medium mb-2">Highlights</h4>
                  <ul className="space-y-2">
                    {Array.isArray(currentMonthData.pros) ? (
                      currentMonthData.pros.map((pro, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-green-500 mr-2">✓</span>
                          <span className="text-green-900">{pro}</span>
                        </li>
                      ))
                    ) : (
                      <li className="flex items-start">
                        <span className="text-green-500 mr-2">✓</span>
                        <span className="text-green-900">{currentMonthData.pros}</span>
                      </li>
                    )}
                  </ul>
                </div>
              )}
              
              {currentMonthData.cons && (
                <div className="bg-red-50 p-4 rounded-lg">
                  <h4 className="text-red-800 font-medium mb-2">Considerations</h4>
                  <ul className="space-y-2">
                    {Array.isArray(currentMonthData.cons) ? (
                      currentMonthData.cons.map((con, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-red-500 mr-2">✗</span>
                          <span className="text-red-900">{con}</span>
                        </li>
                      ))
                    ) : (
                      <li className="flex items-start">
                        <span className="text-red-500 mr-2">✗</span>
                        <span className="text-red-900">{currentMonthData.cons}</span>
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Weather */}
          {(currentMonthData.weather || currentMonthData.temperature || 
             (currentMonthData.weatherHighC && currentMonthData.weatherLowC)) && (
            <div className="mb-6">
              <h4 className="text-lg font-medium mb-3">Weather</h4>
              <div className="bg-gray-50 p-4 rounded-lg">
                {currentMonthData.weather && (
                  <p className="text-gray-700">{currentMonthData.weather}</p>
                )}
                {(currentMonthData.temperature || 
                  (currentMonthData.weatherHighC !== undefined && currentMonthData.weatherLowC !== undefined)) && (
                  <div className="mt-3 grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-gray-500">Average High</span>
                      <p className="font-medium text-gray-900">
                        {currentMonthData.temperature?.high !== undefined
                          ? `${currentMonthData.temperature.high}°C`
                          : currentMonthData.weatherHighC !== undefined
                            ? `${currentMonthData.weatherHighC}°C`
                            : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Average Low</span>
                      <p className="font-medium text-gray-900">
                        {currentMonthData.temperature?.low !== undefined
                          ? `${currentMonthData.temperature.low}°C`
                          : currentMonthData.weatherLowC !== undefined
                            ? `${currentMonthData.weatherLowC}°C`
                            : 'N/A'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Events */}
          {(currentMonthData.events || 
            (currentMonthData.ranges && currentMonthData.ranges.some(range => range.special))) && (
            <div className="mb-6">
              <h4 className="text-lg font-medium mb-3">Notable Events</h4>
              <ul className="space-y-3">
                {Array.isArray(currentMonthData.events) ? (
                  currentMonthData.events.map((event, index) => (
                    <li key={index} className="bg-purple-50 p-3 rounded-lg">
                      <div className="font-medium text-purple-900">
                        {event.name || event.title || `Event ${index + 1}`}
                      </div>
                      {event.description && (
                        <p className="text-sm text-purple-800 mt-1">{event.description}</p>
                      )}
                      {event.date && (
                        <p className="text-xs text-purple-700 mt-1">{event.date}</p>
                      )}
                    </li>
                  ))
                ) : currentMonthData.events ? (
                  <li className="bg-purple-50 p-3 rounded-lg">
                    <p className="text-purple-800">{currentMonthData.events}</p>
                  </li>
                ) : currentMonthData.ranges ? (
                  currentMonthData.ranges
                    .filter(range => range.special)
                    .map((range, index) => (
                      <li key={index} className="bg-purple-50 p-3 rounded-lg">
                        <div className="font-medium text-purple-900">
                          {range.event || `Special Event ${index + 1}`}
                        </div>
                        {range.notes && (
                          <p className="text-sm text-purple-800 mt-1">{range.notes}</p>
                        )}
                        <p className="text-xs text-purple-700 mt-1">
                          {Array.isArray(range.days) && range.days.length === 1 
                            ? `Day ${range.days[0]}`
                            : Array.isArray(range.days) && range.days.length > 1
                              ? `Days ${range.days[0]}-${range.days[range.days.length-1]}`
                              : ''}
                        </p>
                      </li>
                    ))
                ) : null}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {currentMonthData.recommendations && (
            <div>
              <h4 className="text-lg font-medium mb-3">Recommendations</h4>
              <div className="bg-indigo-50 p-4 rounded-lg">
                <p className="text-indigo-800">{currentMonthData.recommendations}</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500">
            No detailed information available for {getMonthName(selectedMonth)} in {displayCityName}.
          </p>
        </div>
      )}
    </div>
  );
};

export default CityVisitCalendar;
