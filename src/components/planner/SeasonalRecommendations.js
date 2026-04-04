'use client';

import React from 'react';
import { Calendar } from 'lucide-react';

// Shared data - can be moved to a constants file
const seasonalityGuide = {
  winter: {
    months: [12, 1, 2],
    recommended: ["Northern Lights", "Christmas Markets", "Alpine Skiing", "Vienna Balls"],
    avoidBeaches: true,
    indoor: ["Museums", "Classical Concerts", "Fine Dining", "Thermal Baths"]
  },
  spring: {
    months: [3, 4, 5],
    recommended: ["Tulip Season", "Easter Celebrations", "Cherry Blossoms", "Fewer Crowds"],
    mildWeather: true,
    shoulder: ["Mediterranean", "City Breaks", "Rural Escapes"]
  },
  summer: {
    months: [6, 7, 8],
    recommended: ["Beaches", "Festivals", "Outdoor Dining", "Midnight Sun North"],
    highSeason: true,
    avoid: ["Very Hot Southern Cities", "Overcrowded Attractions"]
  },
  fall: {
    months: [9, 10, 11],
    recommended: ["Wine Harvest", "Fall Foliage", "Fewer Crowds", "Food Festivals"],
    mildWeather: true,
    shoulder: ["Mediterranean", "City Breaks", "Rural Escapes"]
  }
};

const specialEvents = [
  { name: "Venice Carnival", location: "Venice, Italy", dates: "February", type: "cultural" },
  { name: "Keukenhof Gardens", location: "Netherlands", dates: "March-May", type: "natural" },
  { name: "Eurovision Song Contest", location: "Various", dates: "May", type: "entertainment" },
  { name: "Cannes Film Festival", location: "Cannes, France", dates: "May", type: "cultural" },
  { name: "Running of the Bulls", location: "Pamplona, Spain", dates: "July", type: "cultural" },
  { name: "Edinburgh Fringe Festival", location: "Edinburgh, Scotland", dates: "August", type: "cultural" },
  { name: "La Tomatina", location: "Buñol, Spain", dates: "August", type: "entertainment" },
  { name: "Oktoberfest", location: "Munich, Germany", dates: "September-October", type: "cultural" },
  { name: "Christmas Markets", location: "Various", dates: "November-December", type: "cultural" }
];

const SeasonalRecommendations = ({ startDate, endDate, predefinedRoutes }) => {
  // Determine season based on travel dates
  const getSeason = (date) => {
    if (!date) return null;
    
    const month = new Date(date).getMonth() + 1; // JavaScript months are 0-indexed
    
    if ([12, 1, 2].includes(month)) return 'winter';
    if ([3, 4, 5].includes(month)) return 'spring';
    if ([6, 7, 8].includes(month)) return 'summer';
    if ([9, 10, 11].includes(month)) return 'fall';
  };
  
  const startSeason = getSeason(startDate);
  const endSeason = getSeason(endDate);
  const currentDate = new Date();
  const currentSeason = getSeason(currentDate.toISOString().split('T')[0]);
  
  // Use provided dates or default to current season
  const mainSeason = startSeason || currentSeason || 'summer';
  
  // Filter routes that are good for the current season
  const getRecommendedRoutes = () => {
    const seasonMonths = seasonalityGuide[mainSeason]?.months || [];
    
    return predefinedRoutes.flatMap(category => {
      // Check if this category has routes good for this season
      const routes = category.items.filter(item => {
        if (!item.bestMonths) return true;
        
        // Check if any of the best months overlap with the season
        return item.bestMonths.some(month => seasonMonths.includes(month));
      });
      
      if (routes.length === 0) return [];
      
      return {
        section: category.section,
        items: routes.slice(0, 4) // Limit to 4 per category for the seasonal view
      };
    });
  };
  
  const recommendedRoutes = getRecommendedRoutes();
  const seasonInfo = seasonalityGuide[mainSeason];
  
  // Get upcoming events during the trip period
  const getUpcomingEvents = () => {
    if (!startDate || !endDate) return [];
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const startMonth = start.getMonth();
    const endMonth = end.getMonth();
    
    // Simple matching logic - in reality would need more precise date matching
    return specialEvents.filter(event => {
      if (event.dates.includes("January") && (startMonth <= 0 || endMonth >= 0)) return true;
      if (event.dates.includes("February") && (startMonth <= 1 || endMonth >= 1)) return true;
      if (event.dates.includes("March") && (startMonth <= 2 || endMonth >= 2)) return true;
      if (event.dates.includes("April") && (startMonth <= 3 || endMonth >= 3)) return true;
      if (event.dates.includes("May") && (startMonth <= 4 || endMonth >= 4)) return true;
      if (event.dates.includes("June") && (startMonth <= 5 || endMonth >= 5)) return true;
      if (event.dates.includes("July") && (startMonth <= 6 || endMonth >= 6)) return true;
      if (event.dates.includes("August") && (startMonth <= 7 || endMonth >= 7)) return true;
      if (event.dates.includes("September") && (startMonth <= 8 || endMonth >= 8)) return true;
      if (event.dates.includes("October") && (startMonth <= 9 || endMonth >= 9)) return true;
      if (event.dates.includes("November") && (startMonth <= 10 || endMonth >= 10)) return true;
      if (event.dates.includes("December") && (startMonth <= 11 || endMonth >= 11)) return true;
      return false;
    });
  };
  
  const upcomingEvents = getUpcomingEvents();
  
  if (!mainSeason) return null;
  
  return (
    <div className="bg-white rounded-xl shadow-md p-8 mb-8">
      <div className="flex items-center gap-3 mb-6">
        <Calendar className="h-6 w-6 text-indigo-600" />
        <h3 className="text-xl font-bold text-slate-800">
          {startDate && endDate 
            ? `Recommendations for your trip (${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()})`
            : `${mainSeason.charAt(0).toUpperCase() + mainSeason.slice(1)} travel recommendations`}
        </h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-blue-50 rounded-xl p-6">
          <h4 className="text-lg font-bold text-blue-800 mb-3">Best this season</h4>
          <ul className="space-y-2">
            {seasonInfo.recommended.map((item, index) => (
              <li key={index} className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="bg-amber-50 rounded-xl p-6">
          <h4 className="text-lg font-bold text-amber-800 mb-3">Travel Tips</h4>
          <ul className="space-y-2">
            {seasonInfo.highSeason && (
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-500"></div>
                <span>Book accommodations and transport well in advance</span>
              </li>
            )}
            {seasonInfo.avoid && seasonInfo.avoid.map((item, index) => (
              <li key={index} className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-500"></div>
                <span>Consider avoiding {item}</span>
              </li>
            ))}
            {seasonInfo.mildWeather && (
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-500"></div>
                <span>Pack layers for variable weather conditions</span>
              </li>
            )}
            {seasonInfo.avoidBeaches && (
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-500"></div>
                <span>Not beach season - focus on indoor activities and cultural sites</span>
              </li>
            )}
          </ul>
        </div>
      </div>
      
      {upcomingEvents.length > 0 && (
        <div className="mb-8">
          <h4 className="text-lg font-bold text-slate-800 mb-3">Special Events During Your Trip</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {upcomingEvents.map((event, index) => (
              <div key={index} className="bg-indigo-50 rounded-lg p-4">
                <h5 className="font-bold text-indigo-800">{event.name}</h5>
                <p className="text-sm">{event.location}</p>
                <p className="text-xs text-slate-600">{event.dates}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {recommendedRoutes.length > 0 && (
        <div>
          <h4 className="text-lg font-bold text-slate-800 mb-3">Recommended Routes</h4>
          <div className="space-y-6">
            {recommendedRoutes.map((category, index) => (
              <div key={index}>
                <h5 className="text-md font-medium text-slate-700 mb-3 capitalize">{category.section}</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {category.items.map((route, routeIndex) => (
                    <div key={routeIndex} className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div>
                          <h6 className="font-bold text-slate-800">{route.title}</h6>
                          <p className="text-sm text-slate-600">{route.route}</p>
                        </div>
                        <div className="flex">
                          {route.flags.slice(0, 3).map((flag, flagIndex) => (
                            <span key={flagIndex} className="text-xl">{flag}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SeasonalRecommendations;