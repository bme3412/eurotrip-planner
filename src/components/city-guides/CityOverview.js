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
    
    if (cityNameLower.includes('paris')) return "💡";
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
  
  // Enhanced description with more engaging content
  const enhancedDescription = overview?.brief_description 
    ? `${overview.brief_description} From the iconic Eiffel Tower and world-renowned Louvre Museum to charming neighborhood cafés and the romantic Seine River, every corner of Paris tells a story. The city's unique blend of historic grandeur and contemporary energy creates an atmosphere that has inspired artists, writers, and dreamers for centuries.`
    : `${cityName} is a beautiful city waiting to be discovered. With its rich history, vibrant culture, and welcoming atmosphere, it offers visitors an unforgettable experience.`;
  
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-4 mb-4">
          <span className="text-4xl">{cityIcon}</span>
          <h1 className="text-4xl font-bold text-gray-900">{displayName}</h1>
        </div>
        <p className="text-xl text-blue-600 font-semibold">{nickname}</p>
      </div>

      {/* Two-Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Panel - City Description */}
        <div className="bg-white rounded-2xl shadow-lg p-8 h-full">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">About {displayName}</h2>
          <p className="text-gray-700 leading-relaxed text-lg">
            {enhancedDescription}
          </p>
        </div>

        {/* Right Panel - Essential Information */}
        {practicalInfo && (
          <div className="bg-white rounded-2xl shadow-lg p-8 h-full">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Essential Information</h2>
            
            {/* Language & Currency */}
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <span className="text-2xl">🌍</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 mb-3">Language & Currency</h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-gray-600 text-sm">Language:</span>
                      <p className="font-medium text-gray-800">{practicalInfo.language}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 text-sm">Currency:</span>
                      <p className="font-medium text-gray-800">{practicalInfo.currency}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 text-sm">Timezone:</span>
                      <p className="font-medium text-gray-800">{practicalInfo.timezone}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Getting Around */}
              {practicalInfo.transport && (
                <div className="flex items-start space-x-4">
                  <span className="text-2xl">🚇</span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 mb-3">Getting Around</h3>
                    <p className="text-gray-700 leading-relaxed">
                      {practicalInfo.transport.public_transport}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CityOverview;