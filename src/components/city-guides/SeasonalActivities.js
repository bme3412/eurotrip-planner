// src/components/city-guides/SeasonalActivities.js
'use client';

import React, { useState } from 'react';

const SeasonalActivities = ({ activities }) => {
  const [activeSeason, setActiveSeason] = useState('spring');
  
  if (!activities) {
    return <div className="text-center py-8 text-gray-500">No seasonal activity data available</div>;
  }
  
  // Check which seasons are available
  const availableSeasons = {};
  ['spring', 'summer', 'fall', 'winter'].forEach(season => {
    availableSeasons[season] = !!activities[season];
  });
  
  // If current selection isn't available, default to first available
  if (!availableSeasons[activeSeason]) {
    const firstAvailable = Object.keys(availableSeasons).find(season => availableSeasons[season]);
    if (firstAvailable) {
      setActiveSeason(firstAvailable);
    }
  }
  
  // Get current date to suggest current season
  const getCurrentSeason = () => {
    const month = new Date().getMonth();
    
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  };
  
  const currentSeason = getCurrentSeason();
  
  // Season icons
  const seasonIcons = {
    spring: '🌸',
    summer: '☀️',
    fall: '🍂',
    winter: '❄️'
  };
  
  // Season colors
  const seasonColors = {
    spring: {
      bg: 'bg-green-100',
      border: 'border-green-200',
      text: 'text-green-800',
      activeBg: 'bg-green-500',
      hoverBg: 'hover:bg-green-200'
    },
    summer: {
      bg: 'bg-yellow-100',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      activeBg: 'bg-yellow-500',
      hoverBg: 'hover:bg-yellow-200'
    },
    fall: {
      bg: 'bg-orange-100',
      border: 'border-orange-200',
      text: 'text-orange-800',
      activeBg: 'bg-orange-500',
      hoverBg: 'hover:bg-orange-200'
    },
    winter: {
      bg: 'bg-blue-100',
      border: 'border-blue-200',
      text: 'text-blue-800',
      activeBg: 'bg-blue-500',
      hoverBg: 'hover:bg-blue-200'
    }
  };
  
  // Get active season data
  const activeSeasonData = activities[activeSeason] || {};
  
  // Function to format list items
  const formatListItems = (items) => {
    if (!items) return [];
    
    if (typeof items === 'string') {
      // If items is a string, split by newlines or full stops
      return items.split(/\.\s+|\n+/).filter(item => item.trim());
    }
    
    if (Array.isArray(items)) {
      return items;
    }
    
    return [];
  };
  
  return (
    <div>
      {/* If it's the current season, show a notice */}
      {availableSeasons[currentSeason] && currentSeason !== activeSeason && (
        <div className="bg-blue-50 p-3 rounded-md mb-6 border border-blue-100 text-sm flex items-center">
          <span className="mr-2">ℹ️</span>
          <p>
            It\s currently {currentSeason}! <button 
              onClick={() => setActiveSeason(currentSeason)}
              className="text-blue-600 underline hover:text-blue-800"
            >
              View {currentSeason} activities
            </button>
          </p>
        </div>
      )}
      
      <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
        {Object.keys(availableSeasons).map(season => (
          availableSeasons[season] && (
            <button
              key={season}
              onClick={() => setActiveSeason(season)}
              className={`
                px-4 py-3 rounded-md text-sm font-medium flex items-center 
                ${activeSeason === season 
                  ? `${seasonColors[season].activeBg} text-white` 
                  : `${seasonColors[season].bg} ${seasonColors[season].text} ${seasonColors[season].hoverBg}`}
              `}
            >
              <span className="mr-2">{seasonIcons[season]}</span>
              <span>{season.charAt(0).toUpperCase() + season.slice(1)}</span>
            </button>
          )
        ))}
      </div>
      
      <div className={`p-6 rounded-lg ${seasonColors[activeSeason].bg} ${seasonColors[activeSeason].border} border`}>
        <div className="flex items-center mb-4">
          <span className="text-2xl mr-3">{seasonIcons[activeSeason]}</span>
          <h3 className="text-xl font-semibold capitalize">{activeSeason}</h3>
        </div>
        
        {activeSeasonData.overview && (
          <div className="mb-6">
            <p className={`${seasonColors[activeSeason].text}`}>{activeSeasonData.overview}</p>
          </div>
        )}
        
        {activeSeasonData.weather && (
          <div className="mb-6 p-4 bg-white rounded-md bg-opacity-60">
            <h4 className="font-medium mb-2 flex items-center">
              <span className="mr-2">🌤️</span>
              Weather
            </h4>
            <p>{activeSeasonData.weather}</p>
            
            {activeSeasonData.temperature && (
              <div className="mt-3 flex flex-wrap gap-4">
                <div>
                  <span className="font-medium">Average High:</span> {activeSeasonData.temperature.high}°C
                </div>
                <div>
                  <span className="font-medium">Average Low:</span> {activeSeasonData.temperature.low}°C
                </div>
              </div>
            )}
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Recommended Activities */}
          {activeSeasonData.activities && (
            <div className="bg-white p-4 rounded-md bg-opacity-60">
              <h4 className="font-medium mb-3 flex items-center">
                <span className="mr-2">🎯</span>
                Recommended Activities
              </h4>
              
              <ul className="space-y-2">
                {formatListItems(activeSeasonData.activities).map((activity, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-green-500 mr-2">•</span>
                    <span>{activity}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Events & Festivals */}
          {activeSeasonData.events && (
            <div className="bg-white p-4 rounded-md bg-opacity-60">
              <h4 className="font-medium mb-3 flex items-center">
                <span className="mr-2">🎭</span>
                Events & Festivals
              </h4>
              
              <ul className="space-y-2">
                {formatListItems(activeSeasonData.events).map((event, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-purple-500 mr-2">•</span>
                    <span>{event}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Tips */}
          {activeSeasonData.tips && (
            <div className="bg-white p-4 rounded-md bg-opacity-60">
              <h4 className="font-medium mb-3 flex items-center">
                <span className="mr-2">💡</span>
                Tips for Visitors
              </h4>
              
              <ul className="space-y-2">
                {formatListItems(activeSeasonData.tips).map((tip, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-yellow-500 mr-2">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* What to Pack */}
          {activeSeasonData.what_to_pack && (
            <div className="bg-white p-4 rounded-md bg-opacity-60">
              <h4 className="font-medium mb-3 flex items-center">
                <span className="mr-2">🧳</span>
                What to Pack
              </h4>
              
              <ul className="space-y-2">
                {formatListItems(activeSeasonData.what_to_pack).map((item, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SeasonalActivities;