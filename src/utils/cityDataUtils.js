// Utility functions for extracting dynamic city information

export function getCityHeaderInfo(cityData) {
  const { overview, visitCalendar, country } = cityData || {};
  
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

export function getCityDisplayName(cityName, overview) {
  if (overview?.city_name) {
    return overview.city_name;
  }
  return cityName.charAt(0).toUpperCase() + cityName.slice(1);
}

export function getCityNickname(overview) {
  return overview?.nickname || 'A City of Dreams';
}

export function getCityDescription(overview, cityName) {
  return overview?.brief_description || `${cityName} is a beautiful city waiting to be discovered. With its rich history, vibrant culture, and welcoming atmosphere, it offers visitors an unforgettable experience.`;
} 