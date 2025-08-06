import React, { useState, useEffect, useMemo } from 'react';

// Enhanced rating color mapping with better descriptions
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

const MonthlyCalendarView = ({ monthlyData = {}, initialMonth = new Date().getMonth(), city, country }) => {
  const [currentStartMonth, setCurrentStartMonth] = useState(initialMonth);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [detailedCalendarData, setDetailedCalendarData] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [displayMonths, setDisplayMonths] = useState(3); // Number of months to display at once
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [isLegendMinimized, setIsLegendMinimized] = useState(false);

  // Determine number of months to display based on screen size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setDisplayMonths(1);
      } else if (window.innerWidth < 1024) {
        setDisplayMonths(2);
      } else {
        setDisplayMonths(3);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load the detailed calendar data dynamically based on the city and country
  useEffect(() => {
    const loadDetailedCalendarData = async () => {
      setIsLoadingData(true);
      try {
        const normalizedCity = city.toLowerCase();
        const url = `/data/${country}/${normalizedCity}/${normalizedCity}-visit-calendar.json`;
        console.log('Fetching detailed calendar data from:', url);
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setDetailedCalendarData(data);
        } else {
          console.warn(`Could not load detailed calendar data from ${url}`);
        }
      } catch (error) {
        console.error('Error loading detailed calendar data:', error);
      } finally {
        setIsLoadingData(false);
      }
    };

    loadDetailedCalendarData();
  }, [city, country]);

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

  // Navigation functions...
  const goToPreviousMonths = () => {
    if (currentStartMonth - displayMonths < 0) {
      setCurrentStartMonth(12 - (displayMonths - currentStartMonth));
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentStartMonth(currentStartMonth - displayMonths);
    }
    setActiveTooltip(null);
  };

  const goToNextMonths = () => {
    if (currentStartMonth + displayMonths > 11) {
      setCurrentStartMonth((currentStartMonth + displayMonths) % 12);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentStartMonth(currentStartMonth + displayMonths);
    }
    setActiveTooltip(null);
  };

  // Get month name from number (0-11)
  const getMonthName = (monthIndex) => {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return monthNames[monthIndex];
  };

  // Get the month's data from the detailed calendar
  const getDetailedMonthData = (monthIndex) => {
    if (!detailedCalendarData || !detailedCalendarData.months) return null;
    
    const monthName = getMonthName(monthIndex).toLowerCase();
    return detailedCalendarData.months[monthName];
  };

  // Get day details from the calendar data
  const getDayDetails = (day, monthData) => {
    if (!monthData || !monthData.ranges) return null;
    const range = monthData.ranges.find(r => r.days.includes(day));
    if (!range) return null;
    return {
      score: range.score,
      notes: range.notes || '',
      event: range.special ? range.event : null,
      special: range.special || false
    };
  };

  // Get the overall month score/rating for display
  const getMonthRating = (monthIndex) => {
    const monthData = getDetailedMonthData(monthIndex);
    if (!monthData || !monthData.ranges) return 3;
    let totalScore = 0;
    let totalDays = 0;
    monthData.ranges.forEach(range => {
      totalScore += range.score * range.days.length;
      totalDays += range.days.length;
    });
    return totalDays > 0 ? Math.round(totalScore / totalDays) : 3;
  };

  // Get activity types for the month
  const getActivityTypes = (monthIndex) => {
    if (!detailedCalendarData || !detailedCalendarData.activityTypes) return [];
    
    const monthName = getMonthName(monthIndex).toLowerCase();
    const month = monthIndex + 1; // Convert to 1-12 range
    
    if (month >= 3 && month <= 5) return detailedCalendarData.activityTypes.spring || [];
    if (month >= 6 && month <= 8) return detailedCalendarData.activityTypes.summer || [];
    if (month >= 9 && month <= 11) return detailedCalendarData.activityTypes.autumn || [];
    return detailedCalendarData.activityTypes.winter || [];
  };

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
          notes: day.notes
        });
      }
    }
  };

  // Generate calendar for a specific month
  const generateMonthCalendar = (monthIndex) => {
    const actualYear = monthIndex < 0 ? currentYear - 1 : 
                      monthIndex > 11 ? currentYear + 1 : currentYear;
    const actualMonth = ((monthIndex % 12) + 12) % 12;
    const monthData = getDetailedMonthData(actualMonth);
    const daysInMonth = new Date(actualYear, actualMonth + 1, 0).getDate();
    const firstDayOfMonth = new Date(actualYear, actualMonth, 1).getDay();
    const monthRating = getMonthRating(actualMonth);
    const activityTypes = getActivityTypes(actualMonth);
    const days = [];
    
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push({ type: 'empty' });
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      let dayDetails = monthData ? getDayDetails(i, monthData) : null;
      const rating = dayDetails ? dayDetails.score : 3;
      days.push({
        type: 'day',
        dayOfMonth: i,
        date: new Date(actualYear, actualMonth, i),
        rating,
        color: RATING_COLORS[rating],
        special: dayDetails && dayDetails.special,
        event: dayDetails && dayDetails.event,
        notes: dayDetails && dayDetails.notes
      });
    }
    
    return {
      monthName: getMonthName(actualMonth),
      year: actualYear,
      days,
      rating: monthRating,
      ratingLabel: RATING_LABELS[monthRating],
      ratingColor: RATING_COLORS[monthRating],
      ratingDescription: RATING_DESCRIPTIONS[monthRating],
      tourismLevel: monthData?.tourismLevel,
      weatherHigh: monthData?.weatherHighC,
      weatherLow: monthData?.weatherLowC,
      activityTypes
    };
  };

  // Generate calendars for visible months
  const visibleMonths = useMemo(() => {
    const months = [];
    for (let i = 0; i < displayMonths; i++) {
      const monthIndex = (currentStartMonth + i) % 12;
      months.push(generateMonthCalendar(monthIndex));
    }
    return months;
  }, [currentStartMonth, currentYear, displayMonths, detailedCalendarData]);

  if (isLoadingData) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">Loading calendar data...</span>
      </div>
    );
  }

  return (
    <div>
      {/* Enhanced Calendar Header with Controls */}
      <div className="flex items-center justify-between mb-3">
        <button
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          onClick={goToPreviousMonths}
          aria-label="Previous months"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </button>
        <div className="text-center">
          <h3 className="text-base font-bold text-gray-800">
            {visibleMonths[0]?.monthName} - {visibleMonths[visibleMonths.length - 1]?.monthName} {currentYear}
          </h3>
          <p className="text-xs text-gray-600">Click on highlighted days for event details</p>
        </div>
        <button
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          onClick={goToNextMonths}
          aria-label="Next months"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      
      {/* Enhanced Calendar Legend - Positioned on the right side with toggle */}
      <div className="fixed right-4 top-1/2 transform -translate-y-1/2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-w-48 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between p-3 border-b border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700">Visit Quality Legend</h4>
          <button
            onClick={() => setIsLegendMinimized(!isLegendMinimized)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            aria-label={isLegendMinimized ? "Expand legend" : "Minimize legend"}
          >
            <svg 
              className={`w-4 h-4 text-gray-600 transition-transform ${isLegendMinimized ? 'rotate-180' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
        
        <div className={`transition-all duration-300 ease-in-out ${isLegendMinimized ? 'max-h-0 overflow-hidden' : 'max-h-96'}`}>
          <div className="p-3 space-y-3">
            {Object.entries(RATING_LABELS).reverse().map(([rating, label]) => (
              <div key={rating} className="flex items-start">
                <div 
                  className="w-4 h-4 rounded-sm mr-3 mt-0.5 flex-shrink-0" 
                  style={{ backgroundColor: RATING_COLORS[rating] }}
                ></div>
                <div>
                  <div className="text-xs font-medium text-gray-800">{label}</div>
                  <div className="text-xs text-gray-500 leading-tight">{RATING_DESCRIPTIONS[rating]}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Multiple Month Calendars */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {visibleMonths.map((month, monthIdx) => (
          <div key={`${month.monthName}-${month.year}`} className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            {/* Enhanced Month Header */}
            <div 
              className="p-3 text-center"
              style={{ 
                backgroundColor: `${month.ratingColor}10`,
                borderBottom: `3px solid ${month.ratingColor}` 
              }}
            >
              <div className="text-base font-bold text-gray-800">{month.monthName} {month.year}</div>
              <div className="text-xs font-medium mt-1" style={{ color: month.ratingColor }}>
                {month.ratingLabel} time to visit
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {month.ratingDescription}
              </div>
              <div className="flex justify-center items-center gap-3 mt-1 text-xs">
                {month.tourismLevel && (
                  <div className="flex items-center">
                    <span className="mr-1">👥</span>
                    <span>Tourism: {month.tourismLevel}/10</span>
                  </div>
                )}
                {month.weatherHigh && month.weatherLow && (
                  <div className="flex items-center">
                    <span className="mr-1">🌡️</span>
                    <span>{month.weatherLow}°-{month.weatherHigh}°C</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Activity Types */}
            {month.activityTypes.length > 0 && (
              <div className="bg-gray-50 px-2 py-1 border-b border-gray-200">
                <div className="text-xs font-medium text-gray-600 mb-1">Best Activities:</div>
                <div className="flex flex-wrap gap-1">
                  {month.activityTypes.slice(0, 3).map((activity, idx) => (
                    <span key={idx} className="text-xs bg-white px-1.5 py-0.5 rounded-full border">
                      {activity}
                    </span>
                  ))}
                  {month.activityTypes.length > 3 && (
                    <span className="text-xs text-gray-400">+{month.activityTypes.length - 3} more</span>
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
              {month.days.map((day, dayIndex) => (
                day.type === 'empty' ? (
                  <div key={`empty-${dayIndex}`} className="aspect-square" />
                ) : (
                  <div
                    key={`day-${day.dayOfMonth}`}
                    className="day-cell aspect-square flex items-center justify-center text-sm rounded-md relative cursor-pointer hover:scale-105 transition-transform"
                    style={{ backgroundColor: day.color }}
                    onClick={() => toggleTooltip(day, (currentStartMonth + monthIdx) % 12, day.dayOfMonth)}
                  >
                    <span className="font-medium text-white drop-shadow-sm">{day.dayOfMonth}</span>
                    {day.special && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full shadow-sm"></span>
                    )}
                  </div>
                )
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Enhanced Tooltip Modal */}
      {activeTooltip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 m-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                {getMonthName(activeTooltip.monthIndex)} {activeTooltip.dayOfMonth}
              </h3>
              <button 
                className="text-gray-500 hover:text-gray-700 focus:outline-none p-1"
                onClick={() => setActiveTooltip(null)}
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="bg-purple-100 p-4 rounded-lg mb-4">
              <h4 className="font-bold text-purple-800 text-lg mb-2">{activeTooltip.event}</h4>
              <p className="text-purple-700">{activeTooltip.notes}</p>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center text-sm text-gray-600">
                <span className="mr-2">📅</span>
                <span>Special Event Day</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <span className="mr-2">💡</span>
                <span>Click outside to close</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthlyCalendarView;
