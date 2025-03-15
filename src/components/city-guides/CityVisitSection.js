'use client';
// src/components/city-guides/CityVisitSection.js
import React, { useState, useEffect, useMemo } from 'react';
import MonthlyCalendarView from '../monthly-visit-guide/MonthlyCalendarView';
import MonthlyVisitGuide from '../monthly-visit-guide';

const CityVisitSection = ({ cityName, countryName, monthlyData }) => {
  const [currentMonth, setCurrentMonth] = useState('');
  
  // Set initial month to current month
  useEffect(() => {
    const now = new Date();
    const currentMonthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(now);
    setCurrentMonth(currentMonthName);
  }, []);

  // If no monthly data is provided, show empty state
  if (!monthlyData || Object.keys(monthlyData).length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <div className="text-center py-10">
          <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No Visit Calendar Available</h3>
          <p className="mt-2 text-sm text-gray-500">
            We don&apos;t have specific time recommendations for {cityName} yet. 
            Check back later for seasonal information.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
        <h3 className="text-xl font-semibold mb-6">When to Visit {cityName}</h3>
        <MonthlyCalendarView 
          monthlyData={monthlyData}
          initialMonth={new Date().getMonth()}
        />
        
        {/* Additional visit highlights */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <h3 className="text-lg font-medium mb-4">Travel Highlights</h3>
          
          {/* Find best months */}
          <BestTimeToVisit monthlyData={monthlyData} />
        </div>
      </div>
      
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden mt-8">
        <MonthlyVisitGuide
          monthlyData={monthlyData}
          currentMonth={currentMonth}
        />
      </div>
    </div>
  );
};

// Helper component to extract and display the best time to visit
const BestTimeToVisit = ({ monthlyData }) => {
  // Helper to convert text ratings to numbers
  const ratingToScore = (rating) => {
    if (!rating) return 3;
    
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
    
    return 3;
  };

  // Find best months/seasons
  const bestTimes = useMemo(() => {
    if (!monthlyData) return [];
    
    // Check if we have seasonal or monthly data
    const isSeasonalData = Object.keys(monthlyData).some(key => 
      ['Spring', 'Summer', 'Fall', 'Winter'].includes(key)
    );
    
    if (isSeasonalData) {
      // For seasonal data, rank seasons
      return Object.entries(monthlyData)
        .map(([season, data]) => {
          // Calculate a score based on available factors
          let score = 0;
          let factors = 0;
          
          if (data.firstHalf?.weather?.rating) {
            score += ratingToScore(data.firstHalf.weather.rating);
            factors++;
          }
          
          if (data.secondHalf?.weather?.rating) {
            score += ratingToScore(data.secondHalf.weather.rating);
            factors++;
          }
          
          // Invert crowds (fewer crowds is better)
          if (data.firstHalf?.crowds?.rating) {
            score += 5 - ratingToScore(data.firstHalf.crowds.rating);
            factors++;
          }
          
          if (data.secondHalf?.crowds?.rating) {
            score += 5 - ratingToScore(data.secondHalf.crowds.rating);
            factors++;
          }
          
          const finalScore = factors > 0 ? score / factors : 3;
          
          return {
            name: season,
            score: finalScore,
            summary: data.summary || '',
            pros: data.pros || []
          };
        })
        .sort((a, b) => b.score - a.score);
    } else {
      // For monthly data, rank months
      return Object.entries(monthlyData)
        .map(([month, data]) => {
          // Same scoring as above
          let score = 0;
          let factors = 0;
          
          if (data.firstHalf?.weather?.rating) {
            score += ratingToScore(data.firstHalf.weather.rating);
            factors++;
          }
          
          if (data.secondHalf?.weather?.rating) {
            score += ratingToScore(data.secondHalf.weather.rating);
            factors++;
          }
          
          if (data.firstHalf?.crowds?.rating) {
            score += 5 - ratingToScore(data.firstHalf.crowds.rating);
            factors++;
          }
          
          if (data.secondHalf?.crowds?.rating) {
            score += 5 - ratingToScore(data.secondHalf.crowds.rating);
            factors++;
          }
          
          const finalScore = factors > 0 ? score / factors : 3;
          
          return {
            name: month,
            score: finalScore,
            summary: data.summary || '',
            pros: data.pros || []
          };
        })
        .sort((a, b) => b.score - a.score);
    }
  }, [monthlyData]);
  
  // Show the top 2 periods
  const topPeriods = bestTimes.slice(0, 2);
  
  if (topPeriods.length === 0) {
    return (
      <p className="text-gray-500 italic">Visit information not available.</p>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {topPeriods.map(period => (
        <div key={period.name} className="bg-green-50 rounded-lg p-4 border border-green-100">
          <h4 className="font-medium text-green-800 mb-2">{period.name}</h4>
          {period.summary && (
            <p className="text-sm text-gray-700 mb-2">{period.summary}</p>
          )}
          {period.pros && period.pros.length > 0 && (
            <div>
              <p className="text-xs font-medium text-green-700 mt-2 mb-1">Highlights:</p>
              <ul className="text-sm text-gray-600">
                {period.pros.slice(0, 3).map((pro, idx) => (
                  <li key={idx} className="flex items-start mb-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600 mr-1 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>{pro}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default CityVisitSection;