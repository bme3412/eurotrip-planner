import React from 'react';
import { getCityDisplayName, getCityNickname, getCityDescription } from '@/utils/cityDataUtils';

const CityOverview = ({ overview, cityName }) => {
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







      {/* Seasonal Information */}
      {seasonalNotes && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Best Time to Visit</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(seasonalNotes).map(([season, data]) => (
              <div key={season} className={`rounded-lg p-4 ${data.recommended ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-900 capitalize">{season}</h4>
                  {data.recommended && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Recommended</span>
                  )}
                </div>
                <p className="text-xs text-gray-600 mb-2">{data.months}</p>
                <p className="text-sm text-gray-700">{data.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}


    </div>
  );
};

export default CityOverview;