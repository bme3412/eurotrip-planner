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
    ? `${overview.brief_description} From the iconic Eiffel Tower and world-renowned Louvre Museum to charming neighborhood cafés and the romantic Seine River, every corner of Paris tells a story. The city's unique blend of historic grandeur and contemporary energy creates an atmosphere that has inspired artists, writers, and dreamers for centuries.`
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

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-2xl font-bold text-blue-600 mb-1">
            {population?.city || 'N/A'}
          </div>
          <div className="text-sm text-gray-600">Million Residents</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-2xl font-bold text-green-600 mb-1">
            {practicalInfo?.language || 'N/A'}
          </div>
          <div className="text-sm text-gray-600">Language</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-2xl font-bold text-purple-600 mb-1">
            {practicalInfo?.currency || 'N/A'}
          </div>
          <div className="text-sm text-gray-600">Currency</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-2xl font-bold text-orange-600 mb-1">
            {practicalInfo?.timezone || 'N/A'}
          </div>
          <div className="text-sm text-gray-600">Timezone</div>
        </div>
      </div>

      {/* City Sections */}
      {sections.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sections.map((section, index) => (
            <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-blue-600 text-lg">
                    {section.icon === 'museum' && '🏛️'}
                    {section.icon === 'palette' && '🎨'}
                    {section.icon === 'restaurant' && '🍽️'}
                    {section.icon === 'style' && '👗'}
                    {!['museum', 'palette', 'restaurant', 'style'].includes(section.icon) && '✨'}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
              </div>
              <p className="text-gray-700 leading-relaxed">{section.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* Why Visit Section */}
      {whyVisit && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Why Visit {displayName}?</h2>
          <p className="text-gray-700 mb-6">{whyVisit.intro}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {whyVisit.highlights?.map((highlight, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">{highlight.title}</h4>
                <p className="text-sm text-gray-700">{highlight.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

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

      {/* Practical Information */}
      {practicalInfo && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Practical Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Useful Phrases */}
            {practicalInfo.useful_phrases && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Useful Phrases</h3>
                <div className="space-y-2">
                  {practicalInfo.useful_phrases.map((phrase, index) => (
                    <div key={index} className="bg-gray-50 rounded p-3">
                      <div className="font-medium text-gray-900">{phrase.phrase}</div>
                      <div className="text-sm text-gray-600">{phrase.pronunciation}</div>
                      <div className="text-xs text-gray-500">{phrase.meaning}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Transport Information */}
            {practicalInfo.transport && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Getting Around</h3>
                <div className="space-y-3">
                  <div className="bg-gray-50 rounded p-3">
                    <h4 className="font-medium text-gray-900 mb-1">Public Transport</h4>
                    <p className="text-sm text-gray-700">{practicalInfo.transport.public_transport}</p>
                  </div>
                  {practicalInfo.transport.passes && (
                    <div className="bg-gray-50 rounded p-3">
                      <h4 className="font-medium text-gray-900 mb-1">Transport Passes</h4>
                      <p className="text-sm text-gray-700">{practicalInfo.transport.passes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CityOverview;