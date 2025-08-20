// Utility functions for extracting dynamic city information

export function getCityHeaderInfo(cityData) {
  if (!cityData) {
    return {
      bestTime: 'May-Sept',
      avgVisit: '2-3 days',
      currency: 'Euro (€)'
    };
  }

  const { overview, visitCalendar, country } = cityData;
  
  // Extract currency from overview
  const currency = overview?.practical_info?.currency || 'Euro (€)';
  
  // Extract best time to visit from seasonal notes
  let bestTime = 'May-Sept';
  if (overview?.seasonal_notes) {
    const seasons = overview.seasonal_notes;
    const recommendedSeasons = Object.entries(seasons)
      .filter(([_, season]) => season.recommended)
      .map(([_, season]) => season.months);
    
    if (recommendedSeasons.length > 0) {
      bestTime = recommendedSeasons.join(', ');
    }
  }
  
  // Extract average visit duration from overview or use default
  let avgVisit = '2-3 days';
  if (overview?.practical_info?.visit_duration) {
    avgVisit = overview.practical_info.visit_duration;
  } else if (overview?.meta?.avg_visit_duration) {
    avgVisit = overview.meta.avg_visit_duration;
  }
  
  return {
    bestTime,
    avgVisit,
    currency
  };
}

export function getCityDisplayName(cityData, cityName) {
  // If cityData has a displayName, use it
  if (cityData?.displayName) {
    return cityData.displayName;
  }
  
  // If cityData has overview with city_name, use it
  if (cityData?.overview?.city_name) {
    return cityData.overview.city_name;
  }
  
  // If cityName is provided and is a string, format it
  if (cityName && typeof cityName === 'string') {
    return cityName.charAt(0).toUpperCase() + cityName.slice(1);
  }
  
  // If cityData has a name property, use it
  if (cityData?.name && typeof cityData.name === 'string') {
    return cityData.name.charAt(0).toUpperCase() + cityData.name.slice(1);
  }
  
  // Fallback
  return 'City';
}

export function getCityNickname(cityData) {
  // If cityData has a nickname, use it
  if (cityData?.nickname) {
    return cityData.nickname;
  }
  
  // If cityData has overview with nickname, use it
  if (cityData?.overview?.nickname) {
    return cityData.overview.nickname;
  }
  
  // Fallback
  return 'A City of Dreams';
}

export function getCityDescription(cityData, cityName) {
  // If cityData has a description, use it
  if (cityData?.description) {
    return cityData.description;
  }
  
  // If cityData has overview with brief_description, use it
  if (cityData?.overview?.brief_description) {
    return cityData.overview.brief_description;
  }
  
  // If cityName is provided and is a string, create a generic description
  if (cityName && typeof cityName === 'string') {
    return `${cityName.charAt(0).toUpperCase() + cityName.slice(1)} is a beautiful city waiting to be discovered. With its rich history, vibrant culture, and welcoming atmosphere, it offers visitors an unforgettable experience.`;
  }
  
  // Fallback
  return 'A beautiful city waiting to be discovered. With its rich history, vibrant culture, and welcoming atmosphere, it offers visitors an unforgettable experience.';
} 

/**
 * Generate hero image path for a city
 * @param {string} cityName - The city name (lowercase)
 * @param {string} country - The country name
 * @returns {string} The hero image path
 */
export const getCityHeroImage = (cityName, country) => {
  if (!cityName || !country || typeof cityName !== 'string' || typeof country !== 'string') {
    return '/images/city-placeholder.svg';
  }
  
  // Try country-specific hero image first
  const countryHeroPath = `/images/city-page/${country}/${cityName}-hero.jpeg`;
  
  // For development, you could check if file exists
  // For production, just return the path and let Next.js handle 404s
  return countryHeroPath;
};

/**
 * Generate hero image path with fallbacks
 * @param {string} cityName - The city name (lowercase)
 * @param {string} country - The country name
 * @returns {Array<string>} Array of image paths to try in order
 */
export const getCityHeroImageFallbacks = (cityName, country) => {
  if (!cityName || !country || typeof cityName !== 'string' || typeof country !== 'string') {
    return ['/images/city-placeholder.svg'];
  }
  
  return [
    `/images/city-page/${country}/${cityName}-hero.jpeg`,
    `/images/city-page/${cityName}-hero.jpeg`,
    `/images/city-page/${country}/${cityName}.jpeg`,
    `/images/city-page/${cityName}.jpeg`,
    '/images/city-placeholder.svg'
  ];
}; 