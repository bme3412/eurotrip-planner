'use client';

import React, { useState } from 'react';

const SingleMonthView = ({ visitCalendar, cityName, monthlyData }) => {
  const [currentMonthIndex, setCurrentMonthIndex] = useState(new Date().getMonth());
  const [activeTooltip, setActiveTooltip] = useState(null);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const RATING_COLORS = {
    5: '#10b981', // Excellent - Soft green
    4: '#34d399', // Good - Light green
    3: '#fbbf24', // Average - Soft amber
    2: '#fb923c', // Below Average - Soft orange
    1: '#ef4444'  // Poor - Soft red
  };

  const RATING_LABELS = {
    5: 'Perfect Time',
    4: 'Great Weather',
    3: 'Decent Visit',
    2: 'Consider Carefully',
    1: 'Avoid if Possible'
  };

  const currentMonthName = months[currentMonthIndex];
  const currentMonthData = visitCalendar.months[currentMonthName.toLowerCase()];

  const navigateMonth = (direction) => {
    setCurrentMonthIndex(prev => {
      if (direction === 'prev') {
        return prev === 0 ? 11 : prev - 1;
      } else {
        return prev === 11 ? 0 : prev + 1;
      }
    });
    setActiveTooltip(null);
  };

  const toggleTooltip = (dayId) => {
    setActiveTooltip(activeTooltip === dayId ? null : dayId);
  };

  // Calculate average score for the month
  let averageScore = 3;
  if (currentMonthData && currentMonthData.ranges) {
    let totalScore = 0;
    let totalRanges = 0;
    currentMonthData.ranges.forEach(range => {
      totalScore += range.score * range.days.length;
      totalRanges += range.days.length;
    });
    averageScore = totalRanges > 0 ? Math.round(totalScore / totalRanges) : 3;
  }

  // Get month-specific data from monthlyData
  const monthlyDetails = monthlyData && monthlyData[currentMonthName];

  // Generate comprehensive reasons to visit and things to consider
  const getReasonsAndConsiderations = () => {
    const reasons = [];
    const considerations = [];

    if (currentMonthData) {
      // Weather-based reasons
      if (averageScore >= 4) {
        if (currentMonthData.weatherHighC && currentMonthData.weatherLowC) {
          reasons.push({
            title: "Beautiful Weather",
            description: `The city experiences warm and pleasant weather (${currentMonthData.weatherLowC}°C to ${currentMonthData.weatherHighC}°C), perfect for outdoor activities like picnics in parks, strolling along the streets, or exploring the city's numerous gardens and attractions.`
          });
        }
        
        reasons.push({
          title: "Extended Daylight",
          description: `With long days and extended daylight hours, visitors can maximize sightseeing and enjoy the city from morning until late evening.`
        });
      }

      // Tourism level considerations
      if (currentMonthData.tourismLevel) {
        if (currentMonthData.tourismLevel >= 8) {
          considerations.push({
            title: "High Tourist Density",
            description: `${currentMonthName} is a peak tourist season, which can mean crowded attractions and longer wait times at popular sites.`
          });
          considerations.push({
            title: "Higher Accommodation Costs",
            description: "Due to the high demand, hotel prices are typically elevated during this month."
          });
        } else if (currentMonthData.tourismLevel <= 4) {
          reasons.push({
            title: "Less Crowded Museums",
            description: "With fewer tourists around, museums and attractions can be less crowded, allowing for a more relaxed visit."
          });
        }
      }

      // Activity-based content
      if (currentMonthData.activityTypes && currentMonthData.activityTypes.length > 0) {
        const activities = currentMonthData.activityTypes.slice(0, 3);
        reasons.push({
          title: "Great Activities Available",
          description: `${currentMonthName} is perfect for ${activities.join(', ')}, offering visitors numerous opportunities to engage with the local culture and environment.`
        });
      }

      // Seasonal specific content
      if (currentMonthIndex >= 5 && currentMonthIndex <= 7) { // Summer months
        reasons.push({
          title: "Summer Festivals",
          description: `${cityName} in ${currentMonthName} is vibrant with numerous summer festivals, offering a chance to enjoy music, cinema, and art in various open-air venues throughout the city.`
        });
        
        if (averageScore <= 3) {
          considerations.push({
            title: "Summer Heat",
            description: "While the weather is generally pleasant, heatwaves are possible, and some older buildings may lack air conditioning."
          });
        }
      } else if (currentMonthIndex >= 8 && currentMonthIndex <= 10) { // Autumn
        reasons.push({
          title: "Autumn Colors",
          description: `${currentMonthName} brings beautiful autumn foliage to ${cityName}'s parks and gardens, creating perfect photo opportunities and scenic walks.`
        });
      } else if (currentMonthIndex >= 11 || currentMonthIndex <= 1) { // Winter
        reasons.push({
          title: "Cozy Atmosphere",
          description: `Experience the magical winter atmosphere of ${cityName} with festive decorations, warm cafes, and fewer crowds at major attractions.`
        });
        
        considerations.push({
          title: "Weather Challenges",
          description: `${currentMonthName} may have challenging weather conditions with shorter daylight hours and potentially cold temperatures.`
        });
      } else { // Spring
        reasons.push({
          title: "Spring Blooms",
          description: `${currentMonthName} brings beautiful spring blooms to ${cityName}'s gardens and parks, with mild weather perfect for outdoor exploration.`
        });
      }
    }

    // Monthly data specific content
    if (monthlyDetails) {
      if (monthlyDetails.things_to_do && monthlyDetails.things_to_do.length > 0) {
        reasons.push({
          title: "Cultural Events",
          description: `${currentMonthName} hosts several cultural events and unique activities, including exhibitions and performances that highlight ${cityName}'s rich artistic heritage.`
        });
      }

      // Check for specific local considerations
      if (currentMonthIndex === 7) { // August
        considerations.push({
          title: "Limited Local Activity",
          description: `Many locals take their holidays in ${currentMonthName}, leading to some shops and restaurants being closed or having limited hours.`
        });
      }
    }

    return { reasons, considerations };
  };

  const { reasons, considerations } = getReasonsAndConsiderations();

  if (!currentMonthData) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📅</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
          <p className="text-gray-500">Calendar data for {cityName} is not available yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex">
          {/* Left Side: Compact Calendar */}
          <div className="w-72 p-4 border-r border-gray-100">
            {/* Navigation and Month Info */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => navigateMonth('prev')}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900">{currentMonthName}</h3>
              </div>
              
              <button
                onClick={() => navigateMonth('next')}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            
            <div 
              className="p-3 rounded-lg text-center mb-4"
              style={{ 
                backgroundColor: `${RATING_COLORS[averageScore]}15`,
                border: `1px solid ${RATING_COLORS[averageScore]}30`
              }}
            >
              <div className="flex justify-center items-center gap-2 text-xs">
                {currentMonthData.tourismLevel && (
                  <div className="flex items-center bg-white px-2 py-1 rounded-full shadow-sm">
                    <span className="mr-1">👥</span>
                    <span className="font-medium">{currentMonthData.tourismLevel}/10</span>
                  </div>
                )}
                {currentMonthData.weatherHighC && currentMonthData.weatherLowC && (
                  <div className="flex items-center bg-white px-2 py-1 rounded-full shadow-sm">
                    <span className="mr-1">🌡️</span>
                    <span className="font-medium">{currentMonthData.weatherLowC}°-{currentMonthData.weatherHighC}°C</span>
                  </div>
                )}
              </div>
            </div>

            {/* Calendar */}
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
              {/* Days of Week */}
              <div className="grid grid-cols-7 bg-gray-50">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                  <div key={i} className="p-2 text-center text-xs font-semibold text-gray-600 border-r border-gray-200 last:border-r-0">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Calendar Days */}
              <div className="grid grid-cols-7">
                {(() => {
                  const currentYear = new Date().getFullYear();
                  const daysInMonth = new Date(currentYear, currentMonthIndex + 1, 0).getDate();
                  const firstDayOfMonth = new Date(currentYear, currentMonthIndex, 1).getDay();
                  const days = [];
                  
                  // Add empty days for padding
                  for (let i = 0; i < firstDayOfMonth; i++) {
                    days.push({ type: 'empty' });
                  }
                  
                  // Add actual days
                  for (let i = 1; i <= daysInMonth; i++) {
                    let dayDetails = currentMonthData.ranges ? 
                      currentMonthData.ranges.find(r => r.days.includes(i)) : null;
                    const rating = dayDetails ? dayDetails.score : 3;
                    days.push({
                      type: 'day',
                      dayOfMonth: i,
                      rating,
                      color: RATING_COLORS[rating],
                      details: dayDetails
                    });
                  }
                  
                  return days.map((day, dayIndex) => (
                    day.type === 'empty' ? (
                      <div key={`empty-${dayIndex}`} className="h-8 border-r border-b border-gray-200 last-in-row:border-r-0" />
                    ) : (
                      <div
                        key={`day-${day.dayOfMonth}`}
                        className="h-8 border-r border-b border-gray-200 last-in-row:border-r-0 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity relative"
                        style={{ backgroundColor: day.color }}
                        onClick={() => toggleTooltip(`${currentMonthName}-${day.dayOfMonth}`)}
                      >
                        <span className="font-semibold text-white drop-shadow text-xs">{day.dayOfMonth}</span>
                        
                        {activeTooltip === `${currentMonthName}-${day.dayOfMonth}` && day.details && (
                          <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-800 text-white text-xs rounded-lg px-3 py-2 shadow-lg max-w-xs whitespace-nowrap">
                            <div className="font-semibold">{currentMonthName} {day.dayOfMonth}</div>
                            <div className="mt-1">Rating: {day.rating}/5</div>
                            {day.details.reason && <div className="mt-1">{day.details.reason}</div>}
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                          </div>
                        )}
                      </div>
                    )
                  ));
                })()}
              </div>
            </div>
          </div>

          {/* Right Side: Month Details */}
          <div className="flex-1 p-6">
            <div className="space-y-4">
              {/* Things to Consider */}
              {considerations.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="text-base font-semibold text-amber-800 mb-3 flex items-center">
                    <span className="text-amber-500 mr-2">⚠</span>
                    Things to Consider
                  </h4>
                  <ul className="space-y-3">
                    {considerations.map((consideration, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-amber-500 mr-2 mt-0.5">•</span>
                        <div>
                          <div className="font-semibold text-amber-800 text-sm mb-1">{consideration.title}</div>
                          <p className="text-xs text-amber-700 leading-relaxed">{consideration.description}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
    </div>
  );
};

export default SingleMonthView;