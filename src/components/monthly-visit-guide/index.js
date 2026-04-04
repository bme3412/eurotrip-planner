// src/components/monthly-visit-guide/index.js
'use client';

import React, { useState, useEffect } from 'react';
import MonthDetail from './sections/MonthDetail';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Find the best rated months based on the data
const findBestMonths = (monthlyData) => {
  if (!monthlyData || Object.keys(monthlyData).length === 0) {
    return [];
  }

  // Analyze each month's data to find the best ones
  const monthScores = {};
  
  Object.entries(monthlyData).forEach(([month, data]) => {
    // Skip if the month isn't in our list of months
    if (!MONTHS.includes(month) && !['Spring', 'Summer', 'Fall', 'Winter'].includes(month)) {
      return;
    }
    
    let score = 0;
    let factorCount = 0;
    
    // Check first half of month
    if (data.firstHalf) {
      if (data.firstHalf.weather && data.firstHalf.weather.rating) {
        score += ratingToScore(data.firstHalf.weather.rating);
        factorCount++;
      }
      
      if (data.firstHalf.crowds && data.firstHalf.crowds.rating) {
        // Invert crowd score - fewer crowds is better
        score += ratingToScore(data.firstHalf.crowds.rating, true);
        factorCount++;
      }
      
      if (data.firstHalf.specialEvents && data.firstHalf.specialEvents.length > 0) {
        score += 1; // Bonus for special events
        factorCount++;
      }
    }
    
    // Check second half of month
    if (data.secondHalf) {
      if (data.secondHalf.weather && data.secondHalf.weather.rating) {
        score += ratingToScore(data.secondHalf.weather.rating);
        factorCount++;
      }
      
      if (data.secondHalf.crowds && data.secondHalf.crowds.rating) {
        // Invert crowd score - fewer crowds is better
        score += ratingToScore(data.secondHalf.crowds.rating, true);
        factorCount++;
      }
      
      if (data.secondHalf.specialEvents && data.secondHalf.specialEvents.length > 0) {
        score += 1; // Bonus for special events
        factorCount++;
      }
    }
    
    // Calculate average score
    const avgScore = factorCount > 0 ? score / factorCount : 0;
    
    monthScores[month] = avgScore;
  });
  
  // Sort months by score and return the top months
  return Object.entries(monthScores)
    .sort((a, b) => b[1] - a[1]) // Sort by score descending
    .map(([month]) => month) // Return just the month names
    .slice(0, 3); // Get top 3
};

// Helper function to convert rating strings to numerical scores
function ratingToScore(rating, invert = false) {
  if (!rating) return 3; // Default to average
  
  const normalizedRating = rating.toLowerCase();
  
  // Map rating strings to numeric scores
  const scoreMap = {
    'excellent': 5,
    'very good': 4.5,
    'good': 4,
    'above average': 3.5,
    'average': 3,
    'below average': 2.5,
    'poor': 2,
    'very poor': 1.5,
    'avoid': 1
  };
  
  const score = scoreMap[normalizedRating] || 3;
  
  // Invert for factors where lower is better (like crowds)
  return invert ? 6 - score : score;
}

const MonthlyVisitGuide = ({ monthlyData, currentMonth }) => {
  const [selectedMonth, setSelectedMonth] = useState(currentMonth || MONTHS[new Date().getMonth()]);
  const [bestMonths, setBestMonths] = useState([]);
  
  // Determine best months when data changes
  useEffect(() => {
    setBestMonths(findBestMonths(monthlyData));
  }, [monthlyData]);
  
  // If no monthly data is provided, show empty state
  if (!monthlyData || Object.keys(monthlyData).length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="text-gray-400 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-700">No Monthly Data Available</h3>
        <p className="mt-2 text-sm text-gray-500">We don\t have specific monthly information for this city yet.</p>
      </div>
    );
  }

  // Check if we have seasonal data rather than monthly data
  const isSeasonalData = Object.keys(monthlyData).some(key => 
    ['Spring', 'Summer', 'Fall', 'Winter'].includes(key)
  );
  
  // Map months to seasons for displaying seasonal data
  const monthToSeason = {
    'March': 'Spring', 'April': 'Spring', 'May': 'Spring',
    'June': 'Summer', 'July': 'Summer', 'August': 'Summer',
    'September': 'Fall', 'October': 'Fall', 'November': 'Fall',
    'December': 'Winter', 'January': 'Winter', 'February': 'Winter'
  };
  
  // Get the appropriate data for the selected month
  const getSelectedMonthData = () => {
    if (isSeasonalData) {
      // Use seasonal data
      const season = monthToSeason[selectedMonth];
      return monthlyData[season];
    } else {
      // Use monthly data
      return monthlyData[selectedMonth];
    }
  };
  
  // Function to determine if a month tab should be highlighted as "best"
  const isHighlightedMonth = (month) => {
    return bestMonths.includes(month) || 
           (isSeasonalData && bestMonths.includes(monthToSeason[month]));
  };

  return (
    <div className="monthly-visit-guide">
      {/* Month Selector Tabs */}
      <div className="border-b border-gray-200">
        <div className="px-4 sm:px-6">
          <nav className="-mb-px flex overflow-x-auto">
            {MONTHS.map((month) => (
              <button
                key={month}
                onClick={() => setSelectedMonth(month)}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm mx-3
                  ${selectedMonth === month 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                  ${isHighlightedMonth(month) ? 'text-emerald-600 font-semibold' : ''}
                `}
              >
                {month}
                {isHighlightedMonth(month) && (
                  <span className="ml-1.5 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    Best
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Month Detail Content */}
      <MonthDetail 
        monthData={getSelectedMonthData()} 
        monthName={isSeasonalData ? monthToSeason[selectedMonth] : selectedMonth}
      />
    </div>
  );
};

export default MonthlyVisitGuide;