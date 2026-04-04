'use client';

import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';

// Travel categories for bar chart based on city theme
const getCategoriesByTheme = (cityTheme) => {
  // Default categories for most cities
  const defaultCategories = [
    { name: "Culture", key: "culture", color: "bg-blue-400" },
    { name: "Food", key: "food", color: "bg-orange-400" },
    { name: "Nightlife", key: "nightlife", color: "bg-purple-400" },
    { name: "Affordability", key: "budget", color: "bg-green-400" },
    { name: "Safety", key: "safety", color: "bg-amber-400" }
  ];
  
  const themeCategories = {
    "Summer Destinations": [
      { name: "Beaches", key: "beaches", color: "bg-blue-400" },
      { name: "Outdoor Dining", key: "outdoorDining", color: "bg-orange-400" },
      { name: "Water Activities", key: "waterActivities", color: "bg-cyan-400" },
      { name: "Nightlife", key: "nightlife", color: "bg-purple-400" },
      { name: "Affordability", key: "budget", color: "bg-green-400" }
    ],
    "Café Culture": [
      { name: "Café Quality", key: "cafeQuality", color: "bg-amber-400" },
      { name: "Variety", key: "cafeVariety", color: "bg-blue-400" },
      { name: "Atmosphere", key: "atmosphere", color: "bg-purple-400" },
      { name: "Local Specialty", key: "specialty", color: "bg-orange-400" },
      { name: "Affordability", key: "budget", color: "bg-green-400" }
    ],
    "Art & History": [
      { name: "Museums", key: "museums", color: "bg-blue-400" },
      { name: "Historical Sites", key: "historicalSites", color: "bg-amber-400" },
      { name: "Architecture", key: "architecture", color: "bg-purple-400" },
      { name: "Art Scene", key: "artScene", color: "bg-red-400" },
      { name: "Guided Tours", key: "guidedTours", color: "bg-green-400" }
    ],
    "Foodie Heaven": [
      { name: "Restaurants", key: "restaurants", color: "bg-orange-400" },
      { name: "Street Food", key: "streetFood", color: "bg-amber-400" },
      { name: "Local Cuisine", key: "localCuisine", color: "bg-red-400" },
      { name: "Cooking Classes", key: "cookingClasses", color: "bg-blue-400" },
      { name: "Food Markets", key: "markets", color: "bg-green-400" }
    ],
    "Fairytale Towns": [
      { name: "Charm", key: "charm", color: "bg-purple-400" },
      { name: "Photo Spots", key: "photoSpots", color: "bg-blue-400" },
      { name: "Architecture", key: "architecture", color: "bg-amber-400" },
      { name: "Walkability", key: "walkability", color: "bg-green-400" },
      { name: "Crowds", key: "crowdLevel", color: "bg-red-400" }
    ],
    "Nature & Adventure": [
      { name: "Hiking", key: "hiking", color: "bg-green-400" },
      { name: "Scenic Views", key: "scenicViews", color: "bg-blue-400" },
      { name: "Adventure Sports", key: "adventureSports", color: "bg-red-400" },
      { name: "Wildlife", key: "wildlife", color: "bg-amber-400" },
      { name: "Accessibility", key: "accessibility", color: "bg-purple-400" }
    ],
    "Nightlife Hotspots": [
      { name: "Clubs", key: "clubs", color: "bg-purple-400" },
      { name: "Bars", key: "bars", color: "bg-blue-400" },
      { name: "Live Music", key: "liveMusic", color: "bg-red-400" },
      { name: "Late Night Food", key: "lateNightFood", color: "bg-orange-400" },
      { name: "Safety", key: "safety", color: "bg-green-400" }
    ],
    "Shopping Capitals": [
      { name: "Luxury Brands", key: "luxuryBrands", color: "bg-purple-400" },
      { name: "Local Shops", key: "localShops", color: "bg-blue-400" },
      { name: "Markets", key: "markets", color: "bg-amber-400" },
      { name: "Variety", key: "variety", color: "bg-green-400" },
      { name: "Affordability", key: "budget", color: "bg-red-400" }
    ],
    "Winter Wonderland": [
      { name: "Snow Activities", key: "snowActivities", color: "bg-blue-400" },
      { name: "Christmas Markets", key: "christmasMarkets", color: "bg-red-400" },
      { name: "Cozy Atmosphere", key: "cozy", color: "bg-amber-400" },
      { name: "Winter Views", key: "winterViews", color: "bg-purple-400" },
      { name: "Hot Drinks", key: "hotDrinks", color: "bg-orange-400" }
    ],
    "Trending Destinations": [
      { name: "Instagram Appeal", key: "instagramAppeal", color: "bg-purple-400" },
      { name: "Local Experiences", key: "localExperiences", color: "bg-blue-400" },
      { name: "Value for Money", key: "value", color: "bg-green-400" },
      { name: "Unique Features", key: "uniqueFeatures", color: "bg-amber-400" },
      { name: "Tourist Infrastructure", key: "infrastructure", color: "bg-orange-400" }
    ]
  };
  
  return themeCategories[cityTheme] || defaultCategories;
};

// Generate a deterministic score based on city, category, and position
const getScoreForCategory = (cityId, categoryIndex) => {
  // Create a simple hash from the cityId string and category index
  let hash = 0;
  for (let i = 0; i < cityId.length; i++) {
    hash = ((hash << 5) - hash) + cityId.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Add the category index to make each category score different
  hash = hash + (categoryIndex * 1000);
  
  // Normalize to get a score between 60-95
  const normalizedScore = Math.abs(hash % 36) + 60;
  return normalizedScore;
};

const PaginatedRow = ({ items }) => {
  const itemsPerPage = 3;
  const [currentPage, setCurrentPage] = useState(0);
  const [bookmarked, setBookmarked] = useState({});
  const [isMounted, setIsMounted] = useState(false);
  
  // Set isMounted to true when component mounts (client-side only)
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const startIndex = currentPage * itemsPerPage;
  const currentItems = items.slice(startIndex, startIndex + itemsPerPage);

  const toggleBookmark = (cityId, e) => {
    e.stopPropagation();
    setBookmarked(prev => ({
      ...prev,
      [cityId]: !prev[cityId]
    }));
  };

  return (
    <div className="relative">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {currentItems.map((item, index) => {
          const cityId = `${item.country}-${item.title}-${index}`;
          const isBookmarked = bookmarked[cityId] || false;
          const cityTheme = item.theme || "Summer Destinations"; // Default theme if not specified
          const travelCategories = getCategoriesByTheme(cityTheme);
          
          return (
            <div key={index} className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="relative group">
                {/* Future iPhone image container */}
                <div className="w-full pt-[140%] bg-gradient-to-r from-indigo-600 to-blue-500 relative">
                  {/* Placeholder content centered in image area */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="flex items-center space-x-1 mb-2">
                      {item.flags && item.flags.map((flag, idx) => (
                        <span key={idx} className="text-5xl">{flag}</span>
                      ))}
                    </div>
                    <span className="text-white text-xl font-bold">{item.title}</span>
                    <span className="text-white/90 text-sm">{item.country}</span>
                  </div>
                  
                  {/* Bookmark button - only rendered on client to prevent hydration mismatches */}
                  {isMounted && (
                    <button
                      onClick={(e) => toggleBookmark(cityId, e)}
                      className="absolute top-3 right-3 p-2 bg-white bg-opacity-90 rounded-full shadow hover:shadow-md transition-all z-10"
                    >
                      <Heart 
                        className={`h-5 w-5 ${isBookmarked ? 'fill-red-500 text-red-500' : 'text-gray-400'}`}
                      />
                    </button>
                  )}
                  
                  {/* Swipe-down overlay with city stats - appears on hover */}
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-sm transform -translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out flex flex-col justify-start p-5 z-[5]">
                    <h4 className="text-xl font-bold text-white mb-2">{item.title} Highlights</h4>
                    <p className="text-white/70 text-sm mb-4">Based on traveler reviews</p>
                    
                    {/* Bar chart for city attributes */}
                    <div className="space-y-4">
                      {travelCategories.map((category, catIndex) => {
                        // Generate a deterministic score based on the city and category
                        const score = getScoreForCategory(cityId, catIndex);
                        
                        return (
                          <div key={category.key} className="w-full">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-white text-sm font-medium">{category.name}</span>
                              <span className="text-white/80 text-xs font-medium">{score}/100</span>
                            </div>
                            <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${category.color} rounded-full`}
                                style={{ width: `${score}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-4">
                <p className="text-gray-600 text-sm mb-4">{item.description}</p>
                
                {item.idealFor && (
                  <div className="mb-3">
                    <p className="text-xs text-slate-500 mb-1">Perfect for:</p>
                    <div className="flex flex-wrap gap-1">
                      {item.idealFor.map((feature, idx) => (
                        <span key={idx} className="text-xs px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {item.highlights && (
                  <div className="mb-3">
                    <p className="text-xs text-slate-500 mb-1">Highlights:</p>
                    <div className="flex flex-wrap gap-1">
                      {item.highlights.slice(0, 3).map((highlight, idx) => (
                        <span key={idx} className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-full">
                          {highlight}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-center mt-3">
                  <button 
                    onClick={item.onView || (() => console.log("View guide for:", item.title))}
                    className="px-6 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Guide
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Arrow controls - only rendered after client-side hydration */}
      {isMounted && totalPages > 1 && (
        <>
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 0))}
            disabled={currentPage === 0}
            className="absolute left-[-2rem] top-1/2 transform -translate-y-1/2 bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
          >
            &larr;
          </button>
          <button
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages - 1))}
            disabled={currentPage === totalPages - 1}
            className="absolute right-[-2rem] top-1/2 transform -translate-y-1/2 bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
          >
            &rarr;
          </button>
        </>
      )}
    </div>
  );
};

export default PaginatedRow;