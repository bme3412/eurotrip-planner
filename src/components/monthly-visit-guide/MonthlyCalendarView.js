'use client';
// src/components/monthly-visit-guide/MonthlyCalendarView.js

import React, { useState, useEffect, useMemo } from 'react';

// Rating color mapping
const RATING_COLORS = {
  5: '#4ade80', // Excellent - Green
  4: '#86efac', // Good - Light green
  3: '#fde047', // Average - Yellow
  2: '#fdba74', // Below Average - Orange
  1: '#f87171'  // Poor - Red
};

const RATING_LABELS = {
  5: 'Excellent',
  4: 'Good',
  3: 'Average',
  2: 'Below Average',
  1: 'Poor'
};

const MonthlyCalendarView = ({ monthlyData = {}, initialMonth = new Date().getMonth() }) => {
  const [currentStartMonth, setCurrentStartMonth] = useState(initialMonth);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [detailedCalendarData, setDetailedCalendarData] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [displayMonths, setDisplayMonths] = useState(3); // Number of months to display at once
  const [activeTooltip, setActiveTooltip] = useState(null);
  
  // Determine number of months to display based on screen size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) { // Small screens
        setDisplayMonths(1);
      } else if (window.innerWidth < 1024) { // Medium screens
        setDisplayMonths(2);
      } else { // Large screens
        setDisplayMonths(3);
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Try to load the detailed calendar data for Paris specifically
  useEffect(() => {
    const loadDetailedCalendarData = async () => {
      setIsLoadingData(true);
      try {
        const response = await fetch('/data/France/paris/paris-visit-calendar.json');
        if (response.ok) {
          const data = await response.json();
          setDetailedCalendarData(data);
        } else {
          console.warn('Could not load detailed calendar data for Paris');
        }
      } catch (error) {
        console.error('Error loading detailed calendar data:', error);
      } finally {
        setIsLoadingData(false);
      }
    };
    
    loadDetailedCalendarData();
  }, []);
  
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
  
  // Navigate to next/previous set of months
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
    
    // Find the range this day belongs to
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
    
    // Calculate average score from ranges
    let totalScore = 0;
    let totalDays = 0;
    
    monthData.ranges.forEach(range => {
      totalScore += range.score * range.days.length;
      totalDays += range.days.length;
    });
    
    return totalDays > 0 ? Math.round(totalScore / totalDays) : 3;
  };
  
  // Toggle tooltip display for a day
  const toggleTooltip = (day, monthIndex, dayOfMonth) => {
    // Only toggle if it's a special event day
    if (day.special) {
      if (activeTooltip && 
          activeTooltip.monthIndex === monthIndex && 
          activeTooltip.dayOfMonth === dayOfMonth) {
        setActiveTooltip(null); // Close if already open
      } else {
        // Open new tooltip
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
    const actualMonth = ((monthIndex % 12) + 12) % 12; // Handle negative month indexes
    
    // Get month data
    const monthData = getDetailedMonthData(actualMonth);
    
    // Get days in month
    const daysInMonth = new Date(actualYear, actualMonth + 1, 0).getDate();
    
    // Get first day of month (0 = Sunday, 6 = Saturday)
    const firstDayOfMonth = new Date(actualYear, actualMonth, 1).getDay();
    
    // Calculate average rating for the month
    const monthRating = getMonthRating(actualMonth);
    
    // Generate days
    const days = [];
    
    // Add empty cells for days before the 1st of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push({ type: 'empty' });
    }
    
    // Add actual days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      let dayDetails = null;
      
      // If we have detailed data, get the details from there
      if (monthData) {
        dayDetails = getDayDetails(i, monthData);
      }
      
      const rating = dayDetails ? dayDetails.score : 3;
      
      days.push({
        type: 'day',
        dayOfMonth: i,
        date: new Date(actualYear, actualMonth, i),
        rating: rating,
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
      tourismLevel: monthData?.tourismLevel
    };
  };
  
  // Generate calendars for all visible months
  const visibleMonths = useMemo(() => {
    const months = [];
    for (let i = 0; i < displayMonths; i++) {
      const monthIndex = (currentStartMonth + i) % 12;
      months.push(generateMonthCalendar(monthIndex));
    }
    return months;
  }, [currentStartMonth, currentYear, displayMonths, detailedCalendarData]);

  // Show loading state while fetching data
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
      {/* Calendar Header with Controls */}
      <div className="flex items-center justify-between mb-4">
        <button
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          onClick={goToPreviousMonths}
          aria-label="Previous months"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </button>
        <h3 className="text-lg font-medium">
          {visibleMonths[0]?.monthName} - {visibleMonths[visibleMonths.length - 1]?.monthName} {currentYear}
        </h3>
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
      
      {/* Calendar Legend */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-500 mb-2">Calendar Legend</h4>
        <div className="flex flex-wrap gap-2">
          {Object.entries(RATING_LABELS).map(([rating, label]) => (
            <div key={rating} className="flex items-center">
              <div 
                className="w-4 h-4 rounded-sm mr-1" 
                style={{ backgroundColor: RATING_COLORS[rating] }}
              ></div>
              <span className="text-xs text-gray-600">{label}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Multiple Month Calendars */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {visibleMonths.map((month, monthIdx) => (
          <div key={`${month.monthName}-${month.year}`} className="border rounded-lg overflow-hidden">
            {/* Month Header */}
            <div 
              className="p-3 text-center font-medium"
              style={{ 
                backgroundColor: `${month.ratingColor}40`,
                borderBottom: `2px solid ${month.ratingColor}` 
              }}
            >
              <div className="text-lg">{month.monthName} {month.year}</div>
              <div className="text-sm opacity-75">{month.ratingLabel} time to visit</div>
              {month.tourismLevel && (
                <div className="text-xs mt-1">Tourism Level: {month.tourismLevel}/10</div>
              )}
            </div>
            
            {/* Days of Week */}
            <div className="grid grid-cols-7 text-center text-xs font-medium text-gray-500 bg-gray-50 p-1">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                <div key={i} className="p-1">{day}</div>
              ))}
            </div>
            
            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-px p-1 bg-white">
              {month.days.map((day, dayIndex) => (
                day.type === 'empty' ? (
                  <div 
                    key={`empty-${dayIndex}`} 
                    className="aspect-square text-center"
                  />
                ) : (
                  <div
                    key={`day-${day.dayOfMonth}`}
                    className="day-cell aspect-square flex items-center justify-center text-sm rounded-md relative cursor-pointer"
                    style={{ backgroundColor: day.color }}
                    onClick={() => toggleTooltip(day, (currentStartMonth + monthIdx) % 12, day.dayOfMonth)}
                  >
                    <span className="font-medium">{day.dayOfMonth}</span>
                    {day.special && (
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                    )}
                    
                    
                    
                    
                    {/* Tooltip for special events */}
                    {activeTooltip && 
                     activeTooltip.monthIndex === (currentStartMonth + monthIdx) % 12 && 
                     activeTooltip.dayOfMonth === day.dayOfMonth && (
                       <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-20">
                         <div className="bg-white rounded-lg shadow-lg max-w-sm w-full p-4 m-4">
                           <div className="flex justify-between items-start mb-2">
                             <h3 className="text-lg font-medium text-gray-900">
                               {getMonthName((currentStartMonth + monthIdx) % 12)} {day.dayOfMonth}
                             </h3>
                             <button 
                               className="text-gray-500 hover:text-gray-700 focus:outline-none"
                               onClick={(e) => {
                                 e.stopPropagation();
                                 setActiveTooltip(null);
                               }}
                             >
                               <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                               </svg>
                             </button>
                           </div>
                           <div className="bg-purple-100 p-2 rounded mb-2">
                             <h4 className="font-medium text-purple-700">{activeTooltip.event}</h4>
                           </div>
                           <p className="text-sm text-gray-700">{activeTooltip.notes}</p>
                         </div>
                       </div>
                    )}
                  </div>
                )
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MonthlyCalendarView;