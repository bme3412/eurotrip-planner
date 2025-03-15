// src/components/monthly-visit-guide/MonthlyCalendarView.js
'use client'; // Add this directive for client-side component

import React, { useState, useEffect } from 'react';

// Rating colors from best to worst
const RATING_COLORS = {
  excellent: '#90EE90', // Light green
  good: '#B8E986',      // Pale green
  average: '#FFD580',   // Light orange
  belowAverage: '#FFAB91', // Light coral
  poor: '#FF8A80',      // Light red
};

// Use unique keys for each day of the week
const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// Short display version
const DAYS_SHORT = ['S', 'M', 'T', 'W', 'Th', 'F', 'S'];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MonthlyCalendarView = ({ monthlyData, initialMonth = new Date().getMonth() }) => {
  const [visibleMonths, setVisibleMonths] = useState([]);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [monthsToShow, setMonthsToShow] = useState(2); // Number of months to display side by side
  
  // Calculate how many months to show based on screen width
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setMonthsToShow(1);
      } else if (window.innerWidth < 1200) {
        setMonthsToShow(2);
      } else {
        setMonthsToShow(3);
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Set initial visible months
  useEffect(() => {
    const initialMonthIndex = initialMonth;
    const startingMonths = [];
    
    for (let i = 0; i < monthsToShow; i++) {
      const monthIndex = (initialMonthIndex + i) % 12;
      startingMonths.push(monthIndex);
    }
    
    setVisibleMonths(startingMonths);
  }, [initialMonth, monthsToShow]);
  
  // Generate calendar data for a specific month
  const getCalendarDays = (monthIndex) => {
    const year = currentYear;
    const firstDayOfMonth = new Date(year, monthIndex, 1).getDay();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    
    // Get month data from props
    const monthName = MONTHS[monthIndex];
    const monthData = getMonthData(monthName);
    
    // Create array of day objects
    const days = [];
    
    // Add empty slots for days before the 1st of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push({ day: null, empty: true });
    }
    
    // Add days of the month with their ratings
    for (let day = 1; day <= daysInMonth; day++) {
      // Calculate the day's rating
      const rating = getDayRating(monthName, day, monthData);
      days.push({ 
        day, 
        rating,
        color: getRatingColor(rating)
      });
    }
    
    return days;
  };
  
  // Helper to get month data, handling seasonal data
  const getMonthData = (monthName) => {
    if (!monthlyData) return null;
    
    // Try direct month lookup
    if (monthlyData[monthName]) {
      return monthlyData[monthName];
    }
    
    // Check if it's seasonal data
    const seasonMap = {
      'Spring': ['March', 'April', 'May'],
      'Summer': ['June', 'July', 'August'],
      'Fall': ['September', 'October', 'November'],
      'Winter': ['December', 'January', 'February']
    };
    
    for (const [season, months] of Object.entries(seasonMap)) {
      if (months.includes(monthName) && monthlyData[season]) {
        return monthlyData[season];
      }
    }
    
    return null;
  };
  
  // Calculate rating for a specific day
  const getDayRating = (month, day, monthData) => {
    if (!monthData) return 'average';
    
    // Determine which half of the month the day falls into
    const halfKey = day <= 15 ? 'firstHalf' : 'secondHalf';
    const halfData = monthData[halfKey];
    
    if (!halfData) return 'average';
    
    // Factors to consider for rating
    let rating = 'average';
    let weatherScore = 0;
    let crowdsScore = 0;
    let factorCount = 0;
    
    // Weather factor
    if (halfData.weather && halfData.weather.rating) {
      weatherScore = convertRatingToNumeric(halfData.weather.rating);
      factorCount++;
    }
    
    // Crowds factor (inverted - fewer crowds is better)
    if (halfData.crowds && halfData.crowds.rating) {
      crowdsScore = 5 - convertRatingToNumeric(halfData.crowds.rating);
      factorCount++;
    }
    
    // Special events bonus
    let eventsBonus = 0;
    if (halfData.specialEvents && halfData.specialEvents.length > 0) {
      eventsBonus = Math.min(1, halfData.specialEvents.length * 0.25); // Max 1 point bonus
      factorCount++;
    }
    
    if (factorCount > 0) {
      const avgScore = (weatherScore + crowdsScore + eventsBonus) / factorCount;
      rating = convertNumericToRating(avgScore);
    }
    
    return rating;
  };
  
  // Convert text rating to numeric score (1-5)
  const convertRatingToNumeric = (rating) => {
    const normalized = rating.toLowerCase();
    
    if (normalized.includes('excellent')) return 5;
    if (normalized.includes('very good')) return 4.5;
    if (normalized.includes('good')) return 4;
    if (normalized.includes('above average')) return 3.5;
    if (normalized.includes('average')) return 3;
    if (normalized.includes('below average')) return 2.5;
    if (normalized.includes('poor')) return 2;
    if (normalized.includes('very poor')) return 1.5;
    if (normalized.includes('avoid')) return 1;
    
    return 3; // Default to average
  };
  
  // Convert numeric score back to text rating
  const convertNumericToRating = (score) => {
    if (score >= 4.5) return 'excellent';
    if (score >= 3.5) return 'good';
    if (score >= 2.5) return 'average';
    if (score >= 1.5) return 'belowAverage';
    return 'poor';
  };
  
  // Get color for a rating
  const getRatingColor = (rating) => {
    return RATING_COLORS[rating] || RATING_COLORS.average;
  };
  
  // Handle navigation to previous months
  const showPreviousMonths = () => {
    setVisibleMonths(prevMonths => {
      const firstMonth = prevMonths[0];
      const newMonths = [];
      
      // If previous month would be before January, go to previous year
      if (firstMonth === 0) {
        setCurrentYear(prevYear => prevYear - 1);
        newMonths.push(11); // December
        for (let i = 1; i < monthsToShow; i++) {
          newMonths.push((firstMonth - 1 + i) % 12);
        }
      } else {
        for (let i = 0; i < monthsToShow; i++) {
          newMonths.push((firstMonth - 1 + i) % 12);
        }
      }
      
      return newMonths;
    });
  };
  
  // Handle navigation to next months
  const showNextMonths = () => {
    setVisibleMonths(prevMonths => {
      const lastMonth = prevMonths[prevMonths.length - 1];
      const newMonths = [];
      
      // If we're advancing past December, go to next year
      if (lastMonth === 11) {
        setCurrentYear(prevYear => prevYear + 1);
      }
      
      for (let i = 0; i < monthsToShow; i++) {
        newMonths.push((prevMonths[0] + 1 + i) % 12);
      }
      
      return newMonths;
    });
  };
  
  // Generate calendar for each visible month
  const calendars = visibleMonths.map(monthIndex => {
    const days = getCalendarDays(monthIndex);
    const monthName = MONTHS[monthIndex];
    
    return (
      <div key={`${currentYear}-${monthIndex}`} className="month-calendar min-w-[300px] flex-1">
        <h3 className="text-xl font-semibold mb-4 text-center">
          {monthName} {currentYear}
        </h3>
        <div className="grid grid-cols-7 text-center mb-2">
          {DAYS_SHORT.map((day, idx) => (
            <div key={idx} className="text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, i) => (
            <div 
              key={i} 
              className={`aspect-square flex items-center justify-center rounded-md text-lg font-medium
                ${day.empty ? 'invisible' : 'cursor-pointer hover:opacity-80'}`}
              style={{ 
                backgroundColor: day.color || 'transparent',
              }}
              title={day.day ? `${monthName} ${day.day}: ${day.rating.charAt(0).toUpperCase() + day.rating.slice(1)}` : ''}
            >
              {day.day}
            </div>
          ))}
        </div>
      </div>
    );
  });
  
  // Rating legend
  const ratingLegend = (
    <div className="mt-8 mb-2">
      <h4 className="text-sm font-medium text-gray-500 mb-2">Calendar Legend</h4>
      <div className="flex flex-wrap gap-4">
        {Object.entries(RATING_COLORS).map(([rating, color]) => (
          <div key={rating} className="flex items-center gap-2">
            <div 
              className="w-5 h-5 rounded"
              style={{ backgroundColor: color }}
            ></div>
            <span className="text-sm capitalize">{rating.replace(/([A-Z])/g, ' $1')}</span>
          </div>
        ))}
      </div>
    </div>
  );
  
  return (
    <div className="visit-calendar">
      {ratingLegend}
      
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={showPreviousMonths}
          className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition"
          aria-label="Previous months"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-6 min-w-max p-2">
            {calendars}
          </div>
        </div>
        
        <button 
          onClick={showNextMonths}
          className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition"
          aria-label="Next months"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      
      <div className="mt-4 text-sm text-gray-500 italic">
        * Color-coded based on weather conditions, crowd levels, and special events
      </div>
    </div>
  );
};

export default MonthlyCalendarView;