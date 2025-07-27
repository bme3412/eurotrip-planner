import React from 'react';

// Icon mapping function
const getIcon = (name) => {
  const icons = {
    museum: <svg className="h-6 w-6 text-blue-600" viewBox="0 0 24 24" stroke="currentColor" fill="none"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
    palette: <svg className="h-6 w-6 text-purple-600" viewBox="0 0 24 24" stroke="currentColor" fill="none"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>,
    restaurant: <svg className="h-6 w-6 text-amber-600" viewBox="0 0 24 24" stroke="currentColor" fill="none"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>,
    style: <svg className="h-6 w-6 text-pink-600" viewBox="0 0 24 24" stroke="currentColor" fill="none"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
  };
  return icons[name] || null;
};

/**
 * CityOverview Component - Displays city information and highlights
 */
const CityOverview = ({ overview, cityName }) => {
  // Romantic description of Paris
  const getRomanticDescription = (cityName) => {
    if (cityName.toLowerCase().includes('paris')) {
      return {
        name: "Paris",
        nickname: "The City of Light",
        description: "Paris is a city of seasons, each offering distinct experiences. Spring brings cherry blossoms to the parks and outdoor dining returns to the streets. Summer transforms the Seine banks into Paris Plages with beach vibes and Bastille Day fireworks. Autumn offers golden light perfect for photography and fewer crowds at major attractions. Winter brings Christmas markets, cozy cafés, and the magic of holiday lights. The city's world-class museums, historic monuments, and culinary scene remain accessible year-round, but timing your visit can enhance your experience significantly.",
        highlights: []
      };
    }
    
    // Default description for other cities
    return {
      name: cityName,
      nickname: "A City of Dreams ✨",
      description: overview?.brief_description || `${cityName} is a beautiful city waiting to be discovered. With its rich history, vibrant culture, and welcoming atmosphere, it offers visitors an unforgettable experience.`,
      highlights: []
    };
  };

  const cityInfo = getRomanticDescription(cityName);
  
  return (
    <div className="space-y-6">
      <div className="text-center md:text-left">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">{cityInfo.name}</h2>
        <p className="text-lg text-blue-600 italic font-medium mb-4">{cityInfo.nickname}</p>
        <p className="text-gray-700 text-lg leading-relaxed">{cityInfo.description}</p>
      </div>
    </div>
  );
};

export default CityOverview;