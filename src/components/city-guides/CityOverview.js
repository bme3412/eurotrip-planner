'use client';
import React, { useState, useEffect } from 'react';
import { getCityDisplayName, getCityNickname, getCityDescription } from '@/utils/cityDataUtils';

const CityOverview = ({ overview, cityName, visitCalendar, monthlyData }) => {
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
  // Get dynamic city information
  const displayName = getCityDisplayName(cityName, overview);
  const nickname = getCityNickname(overview);
  const description = getCityDescription(overview, cityName);
  
  // Get city icon based on name
  const getCityIcon = (cityName) => {
    const cityNameLower = cityName.toLowerCase();
    
    if (cityNameLower.includes('paris')) return "✨";
    if (cityNameLower.includes('rome')) return "🏛️";
    if (cityNameLower.includes('barcelona')) return "🏰";
    if (cityNameLower.includes('amsterdam')) return "🚲";
    if (cityNameLower.includes('berlin')) return "🕊️";
    if (cityNameLower.includes('venice')) return "🛶";
    if (cityNameLower.includes('lisbon')) return "🌅";
    if (cityNameLower.includes('pamplona')) return "🐂";
    
    return "✨";
  };

  const cityIcon = getCityIcon(cityName);
  
  // Toggle tooltip display for a day
  const toggleTooltip = (day, monthIndex, dayOfMonth) => {
    if (day.special) {
      if (activeTooltip && activeTooltip.monthIndex === monthIndex && activeTooltip.dayOfMonth === dayOfMonth) {
        setActiveTooltip(null);
      } else {
        setActiveTooltip({
          monthIndex,
          dayOfMonth,
          event: day.event,
          notes: day.notes,
          weather: day.weather,
          crowdLevel: day.crowdLevel,
          price: day.price
        });
      }
    }
  };
  
  // Extract data from overview
  const practicalInfo = overview?.practical_info;
  const population = overview?.population;
  const sections = overview?.sections || [];
  const whyVisit = overview?.why_visit;
  const seasonalNotes = overview?.seasonal_notes;
  
  // Enhanced description with more engaging content
  const enhancedDescription = overview?.brief_description 
    ? overview.brief_description
    : `${cityName} is a beautiful city waiting to be discovered. With its rich history, vibrant culture, and welcoming atmosphere, it offers visitors an unforgettable experience.`;
  
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-2xl overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative p-8 md:p-12 text-white">
          <div className="flex items-center mb-4">
            <span className="text-4xl mr-3">{cityIcon}</span>
            <div>
              <h1 className="text-3xl md:text-5xl font-bold mb-2">{displayName}</h1>
              {nickname && (
                <p className="text-xl md:text-2xl opacity-90">{nickname}</p>
              )}
            </div>
          </div>
          <p className="text-lg md:text-xl opacity-95 leading-relaxed max-w-4xl">
            {enhancedDescription}
          </p>
        </div>
      </div>







      {/* 12-Month Calendar Container */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Best Time to Visit</h2>
        
        {/* Color Legend */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-6 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center">
            <div className="w-6 h-3 rounded mr-2" style={{backgroundColor: '#10b981'}}></div>
            <span className="text-xs text-gray-700 font-medium">Perfect Time</span>
          </div>
          <div className="flex items-center">
            <div className="w-6 h-3 rounded mr-2" style={{backgroundColor: '#34d399'}}></div>
            <span className="text-xs text-gray-700 font-medium">Great Weather</span>
          </div>
          <div className="flex items-center">
            <div className="w-6 h-3 rounded mr-2" style={{backgroundColor: '#fbbf24'}}></div>
            <span className="text-xs text-gray-700 font-medium">Decent Visit</span>
          </div>
          <div className="flex items-center">
            <div className="w-6 h-3 rounded mr-2" style={{backgroundColor: '#fb923c'}}></div>
            <span className="text-xs text-gray-700 font-medium">Consider Carefully</span>
          </div>
          <div className="flex items-center">
            <div className="w-6 h-3 rounded mr-2" style={{backgroundColor: '#ef4444'}}></div>
            <span className="text-xs text-gray-700 font-medium">Avoid if Possible</span>
          </div>
        </div>
        
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 12 }, (_, monthIndex) => {
            const months = [
              'January', 'February', 'March', 'April', 'May', 'June',
              'July', 'August', 'September', 'October', 'November', 'December'
            ];
            const currentYear = new Date().getFullYear();
            const daysInMonth = new Date(currentYear, monthIndex + 1, 0).getDate();
            const firstDayOfMonth = new Date(currentYear, monthIndex, 1).getDay();
            const days = [];
            
            // Rating colors to match the main calendar
            const RATING_COLORS = {
              5: '#10b981', // Excellent - Soft green
              4: '#34d399', // Good - Light green
              3: '#fbbf24', // Average - Soft amber
              2: '#fb923c', // Below Average - Soft orange
              1: '#ef4444'  // Poor - Soft red
            };
            
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
              
              // Get weather from monthly data if available
              let weather = null;
              if (monthData.weatherHighC && monthData.weatherLowC) {
                weather = `${monthData.weatherLowC}-${monthData.weatherHighC}°C`;
              } else {
                // Try to extract from notes
                const weatherMatch = range.notes.match(/\((\d+-\d+°C)\)/);
                weather = weatherMatch ? weatherMatch[1] : null;
              }
              
              // Extract crowd info from notes with better patterns
              const crowdPatterns = [
                /(crowded|busy|fewer crowds|manageable crowds|peak tourism|high tourism|reduced crowds)/i,
                /(low crowds|moderate crowds|high crowds)/i
              ];
              let crowdLevel = null;
              for (const pattern of crowdPatterns) {
                const match = range.notes.match(pattern);
                if (match) {
                  crowdLevel = match[1];
                  break;
                }
              }
              
              // Extract price info from notes with better patterns
              const pricePatterns = [
                /(free|paid|lower prices|higher prices|sales)/i,
                /(expensive|cheap|affordable)/i
              ];
              let price = null;
              for (const pattern of pricePatterns) {
                const match = range.notes.match(pattern);
                if (match) {
                  price = match[1];
                  break;
                }
              }
              
              return {
                score: range.score,
                special: range.special || false,
                event: range.special ? range.event : null,
                notes: range.notes || '',
                weather: weather,
                crowdLevel: crowdLevel,
                price: price
              };
            };
            
            // Add empty days for padding
            for (let i = 0; i < firstDayOfMonth; i++) {
              days.push({ type: 'empty' });
            }
            
            // Add actual days with data from visit calendar
            for (let i = 1; i <= daysInMonth; i++) {
              const monthData = getMonthData(months[monthIndex]);
              let dayDetails = monthData ? getDayDetails(i, monthData) : null;
              const rating = dayDetails ? dayDetails.score : 3;
              days.push({
                type: 'day',
                dayOfMonth: i,
                rating,
                color: RATING_COLORS[rating],
                special: dayDetails && dayDetails.special,
                event: dayDetails && dayDetails.event,
                notes: dayDetails && dayDetails.notes,
                weather: dayDetails && dayDetails.weather,
                crowdLevel: dayDetails && dayDetails.crowdLevel,
                price: dayDetails && dayDetails.price
              });
            }
            
            return (
              <div key={monthIndex} className="border rounded-lg overflow-hidden">
                {/* Month Header */}
                <div className="bg-gray-50 p-2 text-center border-b">
                  <div className="text-xs font-medium text-gray-700">
                    {months[monthIndex].substring(0, 3)}
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
                  {days.map((day, dayIndex) => (
                    day.type === 'empty' ? (
                      <div key={`empty-${dayIndex}`} className="aspect-square" />
                    ) : (
                      <div
                        key={`day-${day.dayOfMonth}`}
                        className={`day-cell aspect-square flex items-center justify-center text-xs relative cursor-pointer hover:scale-105 transition-transform ${day.special ? 'hover:ring-2 hover:ring-red-400' : ''}`}
                        style={{ backgroundColor: day.color }}
                        onClick={() => toggleTooltip(day, monthIndex, day.dayOfMonth)}
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

      {/* Things to Do Section */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 mb-3">Things to Do</h2>
        <div className="columns-1 md:columns-2 gap-3 space-y-3">
          {(() => {
            // Try to get dynamic data from monthly files
            if (monthlyData && Object.keys(monthlyData).length > 0) {
              const currentMonth = new Date().toLocaleString('en-US', { month: 'long' });
              const monthData = monthlyData[currentMonth];
              if (monthData && monthData.things_to_do) {
                return monthData.things_to_do.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between py-2 px-3 border border-gray-100 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors break-inside-avoid mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 text-sm truncate">{activity.activity}</h3>
                      <p className="text-xs text-gray-600 mt-0.5 line-clamp-1">{activity.optimal_time}</p>
                    </div>
                    <span className="text-xs text-blue-600 font-medium ml-2 flex-shrink-0">{activity.cost}</span>
                  </div>
                ));
              }
            }
            
            // Fallback to static Paris data
            return [
              {
                activity: "Ice Skate at Hôtel de Ville",
                optimal_time: "January - outdoor skating rink with city hall backdrop",
                cost: "€8"
              },
              {
                activity: "Take a Cooking Class in Le Marais",
                optimal_time: "February - learn French cuisine in historic district",
                cost: "€80-€120"
              },
              {
                activity: "Visit the Catacombs",
                optimal_time: "March - underground tunnels with millions of bones",
                cost: "€14"
              },
              {
                activity: "Picnic at Luxembourg Gardens",
                optimal_time: "April - spring blooms and palace views",
                cost: "Free"
              },
              {
                activity: "Climb Arc de Triomphe",
                optimal_time: "May - panoramic views of 12 radiating avenues",
                cost: "€13"
              },
              {
                activity: "Bike Along the Seine",
                optimal_time: "June - riverside paths with iconic landmarks",
                cost: "€15"
              },
              {
                activity: "Attend a Classical Concert at Sainte-Chapelle",
                optimal_time: "July - music in the stunning Gothic chapel",
                cost: "€45"
              },
              {
                activity: "Explore the Covered Passages",
                optimal_time: "August - historic shopping arcades with hidden cafes",
                cost: "Free"
              },
              {
                activity: "Take a Seine River Dinner Cruise",
                optimal_time: "September - gourmet meal with illuminated city views",
                cost: "€80-€150"
              },
              {
                activity: "Visit the Musée Rodin Gardens",
                optimal_time: "October - outdoor sculptures in autumn colors",
                cost: "€12"
              },
              {
                activity: "Shop at Marché aux Puces",
                optimal_time: "November - world's largest antique market",
                cost: "Free"
              },
              {
                activity: "See the Eiffel Tower Sparkle",
                optimal_time: "December - hourly light show from dusk to dawn",
                cost: "Free"
              }
            ].map((activity, index) => (
              <div key={index} className="flex items-center justify-between py-2 px-3 border border-gray-100 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors break-inside-avoid mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 text-sm truncate">{activity.activity}</h3>
                  <p className="text-xs text-gray-600 mt-0.5 line-clamp-1">{activity.optimal_time}</p>
                </div>
                <span className="text-xs text-blue-600 font-medium ml-2 flex-shrink-0">{activity.cost}</span>
              </div>
            ));
          })()}
        </div>
      </div>

      {/* Minimal Event Modal */}
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
                {activeTooltip.weather && (
                  <div className="flex items-center">
                    <span className="text-gray-400 mr-3">🌡️</span>
                    <span className="text-sm text-gray-700">Weather: {activeTooltip.weather}</span>
                  </div>
                )}
                {activeTooltip.crowdLevel && (
                  <div className="flex items-center">
                    <span className="text-gray-400 mr-3">👥</span>
                    <span className="text-sm text-gray-700">Crowds: {activeTooltip.crowdLevel}</span>
                  </div>
                )}
                {activeTooltip.price && (
                  <div className="flex items-center">
                    <span className="text-gray-400 mr-3">💰</span>
                    <span className="text-sm text-gray-700">Cost: {activeTooltip.price}</span>
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

export default CityOverview;