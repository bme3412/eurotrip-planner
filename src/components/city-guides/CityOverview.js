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
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="text-center mb-10">
        <div className="flex items-center justify-center gap-4 mb-6">
          <span className="text-4xl">{cityIcon}</span>
          <h1 className="text-4xl font-bold text-gray-900">{displayName}</h1>
        </div>
        <p className="text-xl text-blue-600 font-semibold mb-6">{nickname}</p>
        <p className="text-lg text-gray-700 leading-relaxed max-w-3xl mx-auto">
          {enhancedDescription}
        </p>
        
        {/* Population info if available */}
        {population && (
          <div className="mt-6 text-sm text-gray-500 bg-gray-50 inline-block px-4 py-2 rounded-full">
            Population: {population.city}M city, {population.metro}M metro area
          </div>
        )}
      </div>

      {/* Essential Information */}
      {practicalInfo && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 p-8 rounded-xl shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Essential Information</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h4 className="font-bold text-gray-900 mb-4 text-lg flex items-center gap-2">
                <span className="text-blue-600">🌍</span>
                Language & Currency
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="font-medium text-gray-700">Language:</span>
                  <span className="text-gray-900">{practicalInfo.language}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="font-medium text-gray-700">Currency:</span>
                  <span className="text-gray-900">{practicalInfo.currency}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="font-medium text-gray-700">Timezone:</span>
                  <span className="text-gray-900">{practicalInfo.timezone}</span>
                </div>
              </div>
            </div>
            
            {practicalInfo.transport && (
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h4 className="font-bold text-gray-900 mb-4 text-lg flex items-center gap-2">
                  <span className="text-blue-600">🚇</span>
                  Getting Around
                </h4>
                <p className="text-gray-700 leading-relaxed mb-4">
                  {practicalInfo.transport.public_transport}
                </p>
                {practicalInfo.transport.passes && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-blue-800 font-medium">
                      💡 {practicalInfo.transport.passes}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CityOverview;