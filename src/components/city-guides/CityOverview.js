import React from 'react';

// Icon components
const MuseumIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const PaletteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
  </svg>
);

const RestaurantIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

const StyleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

// Helper function to get the appropriate icon
const getIconByName = (iconName) => {
  switch(iconName) {
    case 'museum': return <MuseumIcon />;
    case 'palette': return <PaletteIcon />;
    case 'restaurant': return <RestaurantIcon />;
    case 'style': return <StyleIcon />;
    default: return null;
  }
};

const CityOverview = ({ cityData, cityDisplayName }) => {
  if (!cityData) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-500">City overview information not available</p>
      </div>
    );
  }

  // Extract data from various possible structures
  const briefDescription = cityData.brief_description || cityData.brief || "";
  const nickname = cityData.nickname || "";
  const sections = cityData.sections || [];
  const whyVisit = cityData.why_visit || {};
  const highlights = whyVisit.highlights || [];

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
      {/* City Overview Header */}
      <div className="p-6 md:p-8 border-b border-gray-200">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">About {cityDisplayName}</h2>
          {nickname && (
            <p className="text-lg text-gray-600 italic mb-4">{nickname}</p>
          )}
          <p className="text-gray-700 leading-relaxed">{briefDescription}</p>
        </div>
      </div>

      {/* City Sections */}
      {sections && sections.length > 0 && (
        <div className="p-6 md:p-8 border-b border-gray-200">
          <div className="max-w-3xl mx-auto">
            <h3 className="text-xl font-bold text-gray-800 mb-6">City Highlights</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {sections.map((section, index) => (
                <div key={index} className="bg-gray-50 rounded-xl p-5 hover:shadow-md transition duration-300">
                  <div className="flex items-center mb-3">
                    {getIconByName(section.icon)}
                    <h4 className="text-lg font-semibold ml-2 text-gray-800">{section.title}</h4>
                  </div>
                  <p className="text-gray-600">{section.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Why Visit Section - Compact Version */}
      {highlights && highlights.length > 0 && (
        <div className="p-6 md:p-8">
          <div className="max-w-3xl mx-auto">
            <h3 className="text-xl font-bold text-gray-800 mb-3">Why Visit {cityDisplayName}</h3>
            {whyVisit.intro && <p className="text-gray-700 mb-6">{whyVisit.intro}</p>}
            
            <div className="space-y-4">
              {highlights.slice(0, 3).map((highlight, index) => (
                <div key={index} className="flex border-l-4 border-blue-500 pl-4 py-1">
                  <div>
                    <h4 className="font-semibold text-gray-800">{highlight.title}</h4>
                    <p className="text-gray-600 text-sm">{highlight.content}</p>
                  </div>
                </div>
              ))}
              {highlights.length > 3 && (
                <p className="text-blue-600 text-sm font-medium">
                  + {highlights.length - 3} more reasons to visit
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CityOverview;