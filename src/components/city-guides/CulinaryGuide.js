'use client';

import React, { useState, useMemo } from 'react';

// Icon components
const FoodIcon = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
    <path d="M5 8h10.5a2.5 2.5 0 0 1 0 5H6a2 2 0 0 0 0 4h8"></path>
    <line x1="12" y1="8" x2="12" y2="19"></line>
  </svg>
);

const CulinaryGuide = ({ culinaryData }) => {
  // Early check if data exists
  if (!culinaryData) {
    return (
      <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-lg">
        <div className="w-12 h-12 flex items-center justify-center rounded-full bg-gray-100">
          <FoodIcon className="text-gray-400" />
        </div>
        <h3 className="mt-4 text-xl font-medium text-gray-600">No Culinary Data Available</h3>
        <p className="mt-2 text-gray-500">We don't have culinary information for this city yet.</p>
      </div>
    );
  }
  
  // Extract data
  const { 
    restaurants,
    bars_and_cafes,
    food_experiences,
    seasonal_specialties,
    local_specialties,
    dining_options,
    food_markets,
    drink_specialties
  } = culinaryData;

  // Create unified data structure that works with both formats
  const processedData = useMemo(() => {
    const data = {
      localSpecialties: [],
      diningOptions: [],
      foodMarkets: [],
      drinkSpecialties: [],
      foodExperiences: [],
      seasonalSpecialties: seasonal_specialties || {}
    };

    // Format 1: If data uses the structure in your example (restaurants, bars_and_cafes)
    if (restaurants) {
      // Handle dining options (fine_dining and casual_dining)
      if (restaurants.fine_dining) {
        restaurants.fine_dining.forEach(restaurant => {
          data.diningOptions.push({
            ...restaurant,
            category: 'Fine Dining',
            type: restaurant.cuisine_type
          });
        });
      }
      
      if (restaurants.casual_dining) {
        restaurants.casual_dining.forEach(restaurant => {
          data.diningOptions.push({
            ...restaurant,
            category: 'Casual Dining',
            type: restaurant.cuisine_type
          });
        });
      }
      
      // Handle street food as food markets
      if (restaurants.street_food) {
        restaurants.street_food.forEach(venue => {
          data.foodMarkets.push({
            ...venue,
            description: `${venue.specialties?.join(', ') || 'Various specialties'}`
          });
        });
      }
    }
    
    // Add bars and cafes as drink specialties
    if (bars_and_cafes) {
      if (bars_and_cafes.coffee_shops) {
        bars_and_cafes.coffee_shops.forEach(cafe => {
          data.drinkSpecialties.push({
            name: cafe.name,
            description: `${cafe.specialty}. ${cafe.food_options || ''}`,
            type: 'Coffee Shop',
            where_to_try: cafe.local_tips,
            must_try: cafe.must_try
          });
        });
      }
      
      if (bars_and_cafes.bars) {
        bars_and_cafes.bars.forEach(bar => {
          data.drinkSpecialties.push({
            name: bar.name,
            description: `${bar.type} specializing in ${bar.specialty}.`,
            type: 'Bar',
            where_to_try: bar.local_tips,
            signature_drinks: bar.signature_drinks
          });
        });
      }
    }
    
    // Handle food experiences
    if (food_experiences) {
      // Food tours
      if (food_experiences.food_tours) {
        food_experiences.food_tours.forEach(tour => {
          data.foodExperiences.push({
            ...tour,
            type: 'Food Tour',
            description: `${tour.focus} tour lasting ${tour.duration}.`
          });
        });
      }
      
      // Cooking classes
      if (food_experiences.cooking_classes) {
        food_experiences.cooking_classes.forEach(course => {
          data.foodExperiences.push({
            ...course,
            type: 'Cooking Class',
            description: `${course.cuisine_focus} cooking class lasting ${course.duration}.`
          });
        });
      }
      
      // Markets (if not already handled by street_food)
      if (food_experiences.markets) {
        food_experiences.markets.forEach(market => {
          data.foodMarkets.push({
            ...market,
            description: `${market.type} featuring ${market.highlights?.join(', ') || 'various foods'}.`
          });
        });
      }
    }
    
    // Format 2: If data uses the flat structure with direct properties
    if (local_specialties) {
      data.localSpecialties = local_specialties;
    }
    
    if (dining_options) {
      data.diningOptions = dining_options;
    }
    
    if (food_markets) {
      data.foodMarkets = food_markets;
    }
    
    if (drink_specialties) {
      data.drinkSpecialties = drink_specialties;
    }
    
    if (food_experiences && Array.isArray(food_experiences)) {
      data.foodExperiences = food_experiences;
    }
    
    return data;
  }, [
    restaurants, 
    bars_and_cafes, 
    food_experiences, 
    seasonal_specialties,
    local_specialties,
    dining_options,
    food_markets,
    drink_specialties
  ]);
  
  // Determine which tabs to show based on available data
  const availableTabs = useMemo(() => {
    const tabs = [];
    
    if (processedData.localSpecialties && processedData.localSpecialties.length > 0) {
      tabs.push({ id: 'specialties', label: 'Local Specialties' });
    }
    
    if (processedData.diningOptions && processedData.diningOptions.length > 0) {
      tabs.push({ id: 'dining', label: 'Where to Eat' });
    }
    
    if (processedData.foodMarkets && processedData.foodMarkets.length > 0) {
      tabs.push({ id: 'markets', label: 'Food Markets' });
    }
    
    if (processedData.drinkSpecialties && processedData.drinkSpecialties.length > 0) {
      tabs.push({ id: 'drinks', label: 'Drinks & Cafés' });
    }
    
    if (processedData.foodExperiences && processedData.foodExperiences.length > 0) {
      tabs.push({ id: 'experiences', label: 'Food Experiences' });
    }
    
    if (processedData.seasonalSpecialties && Object.keys(processedData.seasonalSpecialties).length > 0) {
      tabs.push({ id: 'seasonal', label: 'Seasonal Specialties' });
    }
    
    return tabs;
  }, [processedData]);
  
  // If no tabs are available, show a message
  if (availableTabs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-lg">
        <div className="w-12 h-12 flex items-center justify-center rounded-full bg-gray-100">
          <FoodIcon className="text-gray-400" />
        </div>
        <h3 className="mt-4 text-xl font-medium text-gray-600">No Culinary Data Available</h3>
        <p className="mt-2 text-gray-500">We don't have culinary information for this city yet.</p>
      </div>
    );
  }
  
  const [activeTab, setActiveTab] = useState(availableTabs[0].id);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter data based on search query
  const filteredData = useMemo(() => {
    const query = searchQuery.toLowerCase();
    if (!query) return processedData;
    
    const filtered = { ...processedData };
    
    // Filter local specialties
    if (filtered.localSpecialties) {
      filtered.localSpecialties = filtered.localSpecialties.filter(item => 
        item.name?.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query)
      );
    }
    
    // Filter dining options
    if (filtered.diningOptions) {
      filtered.diningOptions = filtered.diningOptions.filter(item => 
        item.name?.toLowerCase().includes(query) ||
        item.cuisine_type?.toLowerCase().includes(query) ||
        item.signature_dishes?.some(dish => dish.toLowerCase().includes(query)) ||
        item.description?.toLowerCase().includes(query)
      );
    }
    
    // Filter food markets
    if (filtered.foodMarkets) {
      filtered.foodMarkets = filtered.foodMarkets.filter(item => 
        item.name?.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.specialties?.some(specialty => specialty.toLowerCase().includes(query))
      );
    }
    
    // Filter drink specialties
    if (filtered.drinkSpecialties) {
      filtered.drinkSpecialties = filtered.drinkSpecialties.filter(item => 
        item.name?.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.type?.toLowerCase().includes(query) ||
        item.must_try?.some(drink => drink.toLowerCase().includes(query)) ||
        item.signature_drinks?.some(drink => drink.toLowerCase().includes(query))
      );
    }
    
    // Filter food experiences
    if (filtered.foodExperiences) {
      filtered.foodExperiences = filtered.foodExperiences.filter(item => 
        item.name?.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.type?.toLowerCase().includes(query) ||
        item.cuisine_focus?.toLowerCase().includes(query) ||
        item.highlights?.some(highlight => highlight.toLowerCase().includes(query))
      );
    }
    
    // We don't filter seasonal specialties as they're already organized by season
    
    return filtered;
  }, [processedData, searchQuery]);
  
  // Render functions for each tab
  const renderLocalSpecialties = () => {
    if (!filteredData.localSpecialties || filteredData.localSpecialties.length === 0) {
      return <EmptyState message="No matching local specialty information" />;
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredData.localSpecialties.map((item, index) => (
          <div key={index} className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="font-semibold text-lg mb-2 text-gray-800">{item.name}</h3>
            <p className="text-gray-700 mb-3">{item.description}</p>
            {item.where_to_try && (
              <div>
                <h4 className="font-medium text-sm text-gray-600 flex items-center gap-1">
                  <span className="text-blue-500">📍</span> Where to try:
                </h4>
                {Array.isArray(item.where_to_try) ? (
                  <ul className="list-disc list-inside text-sm text-gray-700 mt-1 ml-5">
                    {item.where_to_try.map((place, i) => (
                      <li key={i}>{place}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-700 mt-1 ml-5">{item.where_to_try}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };
  
  const renderDiningOptions = () => {
    if (!filteredData.diningOptions || filteredData.diningOptions.length === 0) {
      return <EmptyState message="No matching dining options" />;
    }

    // Group by category if available
    const groupedByCategory = filteredData.diningOptions.reduce((acc, restaurant) => {
      const category = restaurant.category || 'Other Restaurants';
      if (!acc[category]) acc[category] = [];
      acc[category].push(restaurant);
      return acc;
    }, {});
    
    const categories = Object.keys(groupedByCategory);
    
    return (
      <div className="space-y-8">
        {categories.length > 1 ? (
          // Show with categories
          categories.map(category => (
            <div key={category} className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-800 mb-3">{category}</h3>
              {groupedByCategory[category].map((restaurant, index) => (
                <RestaurantCard key={index} restaurant={restaurant} />
              ))}
            </div>
          ))
        ) : (
          // Show without categories
          filteredData.diningOptions.map((restaurant, index) => (
            <RestaurantCard key={index} restaurant={restaurant} />
          ))
        )}
      </div>
    );
  };
  
  const renderFoodMarkets = () => {
    if (!filteredData.foodMarkets || filteredData.foodMarkets.length === 0) {
      return <EmptyState message="No matching food market information" />;
    }
    
    return (
      <div className="space-y-6">
        {filteredData.foodMarkets.map((market, index) => (
          <div key={index} className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="font-semibold text-lg mb-2 text-gray-800">{market.name}</h3>
            <p className="text-gray-700 mb-4">{market.description}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start">
                <span className="text-blue-500 mr-2">📍</span>
                <div>
                  <h4 className="font-medium text-sm text-gray-600">Location:</h4>
                  <p className="text-gray-700">{market.location || 'Information not available'}</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <span className="text-blue-500 mr-2">🕒</span>
                <div>
                  <h4 className="font-medium text-sm text-gray-600">Hours:</h4>
                  <p className="text-gray-700">{market.hours || 'Information not available'}</p>
                </div>
              </div>
              
              {market.specialties && (
                <div className="md:col-span-2 mt-2">
                  <h4 className="font-medium text-sm text-gray-600 flex items-center">
                    <span className="text-blue-500 mr-2">🍽️</span> Specialties:
                  </h4>
                  {Array.isArray(market.specialties) ? (
                    <ul className="list-disc list-inside text-gray-700 mt-1 ml-6">
                      {market.specialties.map((specialty, i) => (
                        <li key={i}>{specialty}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-700 ml-6">{market.specialties}</p>
                  )}
                </div>
              )}
              
              {(market.tips || market.local_tips) && (
                <div className="md:col-span-2 bg-blue-50 p-4 rounded mt-2">
                  <h4 className="font-medium text-sm text-blue-700 flex items-center">
                    <span className="mr-1">💡</span> Tips:
                  </h4>
                  <p className="text-blue-800">{market.tips || market.local_tips}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  const renderDrinkSpecialties = () => {
    if (!filteredData.drinkSpecialties || filteredData.drinkSpecialties.length === 0) {
      return <EmptyState message="No matching drink specialty information" />;
    }
    
    // Group by type if available
    const groupedByType = filteredData.drinkSpecialties.reduce((acc, item) => {
      const type = item.type || 'Other Venues';
      if (!acc[type]) acc[type] = [];
      acc[type].push(item);
      return acc;
    }, {});
    
    const types = Object.keys(groupedByType);
    
    return (
      <div className="space-y-8">
        {types.length > 1 ? (
          // Show with types
          types.map(type => (
            <div key={type} className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-800 mb-3">{type}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {groupedByType[type].map((item, index) => (
                  <DrinkCard key={index} item={item} />
                ))}
              </div>
            </div>
          ))
        ) : (
          // Show without types
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredData.drinkSpecialties.map((item, index) => (
              <DrinkCard key={index} item={item} />
            ))}
          </div>
        )}
      </div>
    );
  };
  
  const renderFoodExperiences = () => {
    if (!filteredData.foodExperiences || filteredData.foodExperiences.length === 0) {
      return <EmptyState message="No matching food experience information" />;
    }
    
    // Group by type if available
    const groupedByType = filteredData.foodExperiences.reduce((acc, item) => {
      const type = item.type || 'Other Experiences';
      if (!acc[type]) acc[type] = [];
      acc[type].push(item);
      return acc;
    }, {});
    
    const types = Object.keys(groupedByType);
    
    return (
      <div className="space-y-8">
        {types.length > 1 ? (
          // Show with types
          types.map(type => (
            <div key={type} className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-800 mb-3">{type}</h3>
              {groupedByType[type].map((exp, index) => (
                <ExperienceCard key={index} experience={exp} />
              ))}
            </div>
          ))
        ) : (
          // Show without types
          filteredData.foodExperiences.map((exp, index) => (
            <ExperienceCard key={index} experience={exp} />
          ))
        )}
      </div>
    );
  };

  const renderSeasonalSpecialties = () => {
    if (!filteredData.seasonalSpecialties || Object.keys(filteredData.seasonalSpecialties).length === 0) {
      return <EmptyState message="No seasonal food information available" />;
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(filteredData.seasonalSpecialties).map(([season, items]) => (
          <div key={season} className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="font-semibold text-lg mb-3 text-gray-800 capitalize flex items-center">
              {season === 'spring' && <span className="mr-2">🌱</span>}
              {season === 'summer' && <span className="mr-2">☀️</span>}
              {season === 'autumn' && <span className="mr-2">🍂</span>}
              {season === 'winter' && <span className="mr-2">❄️</span>}
              {season}
            </h3>
            <ul className="space-y-2">
              {Array.isArray(items) ? (
                items.map((item, idx) => (
                  <li key={idx} className="flex items-start">
                    <span className="inline-block w-5 h-5 mr-2 text-emerald-500 flex-shrink-0">•</span>
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))
              ) : (
                <li className="text-gray-700">{items}</li>
              )}
            </ul>
          </div>
        ))}
      </div>
    );
  };
  
  // Reusable card components
  const RestaurantCard = ({ restaurant }) => (
    <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold text-lg text-gray-800">
            {restaurant.name}
            {restaurant.michelin_stars && (
              <span className="ml-2 text-yellow-500">
                {"★".repeat(restaurant.michelin_stars)}
              </span>
            )}
          </h3>
          <p className="text-sm text-gray-600">{restaurant.cuisine_type || restaurant.type}</p>
        </div>
        {restaurant.price_range && (
          <div className="bg-gray-100 px-2 py-1 rounded text-sm font-medium">
            {restaurant.price_range}
          </div>
        )}
      </div>
      
      <p className="text-gray-700 my-3">{restaurant.description || restaurant.atmosphere}</p>
      
      {restaurant.signature_dishes && (
        <div className="mt-4">
          <h4 className="font-medium text-sm text-gray-600">Signature Dishes:</h4>
          <ul className="list-disc list-inside text-sm text-gray-700 mt-1 ml-2">
            {Array.isArray(restaurant.signature_dishes) 
              ? restaurant.signature_dishes.map((dish, i) => <li key={i}>{dish}</li>)
              : <li>{restaurant.signature_dishes}</li>
            }
          </ul>
        </div>
      )}
      
      <div className="flex flex-wrap gap-3 text-sm mt-4">
        {(restaurant.address || restaurant.location) && (
          <div className="flex items-center text-gray-700">
            <span className="text-blue-500 mr-1">📍</span>
            {restaurant.address || restaurant.location}
          </div>
        )}
        
        {restaurant.best_time && (
          <div className="flex items-center text-gray-700">
            <span className="text-blue-500 mr-1">🕒</span>
            Best time: {restaurant.best_time}
          </div>
        )}
        
        {restaurant.reservation_needed && (
          <div className="text-amber-600 font-medium text-xs bg-amber-50 px-2 py-1 rounded-full">
            Reservation recommended
          </div>
        )}
      </div>
      
      {restaurant.local_tips && (
        <div className="bg-blue-50 p-3 rounded mt-4">
          <span className="font-medium text-blue-700">💡 Local Tip:</span> <span className="text-blue-800">{restaurant.local_tips}</span>
        </div>
      )}
    </div>
  );
  
  const DrinkCard = ({ item }) => (
    <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow h-full">
      <h3 className="font-semibold text-lg mb-2 text-gray-800">{item.name}</h3>
      <p className="text-gray-700 mb-3">{item.description}</p>
      
      {(item.must_try || item.signature_drinks) && (
        <div className="mb-3">
          <h4 className="font-medium text-sm text-gray-600">
            {item.type === 'Coffee Shop' ? 'Must Try:' : 'Signature Drinks:'}
          </h4>
          <ul className="list-disc list-inside text-sm text-gray-700 mt-1 ml-2">
            {Array.isArray(item.must_try) && item.must_try.map((drink, i) => (
              <li key={i}>{drink}</li>
            ))}
            {Array.isArray(item.signature_drinks) && item.signature_drinks.map((drink, i) => (
              <li key={i}>{drink}</li>
            ))}
          </ul>
        </div>
      )}
      
      {item.where_to_try && (
        <div className="bg-blue-50 p-3 rounded mt-1">
          <span className="font-medium text-blue-700">💡 Local Tip:</span> <span className="text-blue-800">{item.where_to_try}</span>
        </div>
      )}
    </div>
  );
  
  const ExperienceCard = ({ experience }) => (
    <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <h3 className="font-semibold text-lg mb-2 text-gray-800">{experience.name}</h3>
      {(experience.focus || experience.cuisine_focus) && (
        <p className="text-sm text-blue-600 font-medium mb-2">{experience.focus || experience.cuisine_focus}</p>
      )}
      <p className="text-gray-700 mb-4">{experience.description}</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {experience.location && (
          <div>
            <h4 className="font-medium text-sm text-gray-600 flex items-center">
              <span className="text-blue-500 mr-1">📍</span> Location:
            </h4>
            <p className="text-gray-700 ml-5">{experience.location}</p>
          </div>
        )}
        
        {experience.duration && (
          <div>
            <h4 className="font-medium text-sm text-gray-600 flex items-center">
              <span className="text-blue-500 mr-1">🕒</span> Duration:
            </h4>
            <p className="text-gray-700 ml-5">{experience.duration}</p>
          </div>
        )}
        
        {(experience.cost || experience.price_range) && (
          <div>
            <h4 className="font-medium text-sm text-gray-600 flex items-center">
              <span className="text-blue-500 mr-1">💰</span> Price:
            </h4>
            <p className="text-gray-700 ml-5">{experience.cost || experience.price_range}</p>
          </div>
        )}
      </div>
      
      {(experience.highlights || experience.what_you_learn) && (
        <div className="mt-4">
          <h4 className="font-medium text-sm text-gray-600">
            {experience.highlights ? 'Highlights:' : 'What You\'ll Learn:'}
          </h4>
          <ul className="list-disc list-inside text-sm text-gray-700 mt-1 ml-2">
            {Array.isArray(experience.highlights) && experience.highlights.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
            {Array.isArray(experience.what_you_learn) && experience.what_you_learn.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}
      
      {(experience.booking_info || experience.booking_tips || experience.booking_required) && (
        <div className="bg-amber-50 p-3 rounded mt-4">
          <h4 className="font-medium text-sm text-amber-700">Booking Information:</h4>
          <p className="text-amber-800">
            {experience.booking_required ? 'Reservation required. ' : ''}
            {experience.booking_info || experience.booking_tips || ''}
          </p>
        </div>
      )}
    </div>
  );
  
  const EmptyState = ({ message }) => (
    <div className="flex flex-col items-center justify-center py-8 bg-gray-50 rounded-lg">
      <div className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100">
        <FoodIcon className="text-gray-400" />
      </div>
      <p className="mt-4 text-gray-500">{message}</p>
    </div>
  );
  
  return (
    <div className="bg-gray-50 p-6 rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <FoodIcon className="mr-2 text-blue-500" /> Culinary Guide
        </h2>
        
        {/* Search input for all sections */}
        <div className="w-full max-w-xs">
          <input
            type="text"
            className="w-full p-2 text-sm border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="Search culinary options..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      {/* Navigation tabs */}
      <div className="flex overflow-x-auto space-x-2 mb-6 pb-2 border-b border-gray-200">
        {availableTabs.map(tab => (
          <button
            key={tab.id}
            className={`px-4 py-2 text-sm font-medium rounded-t-md whitespace-nowrap transition-colors
              ${activeTab === tab.id 
                ? 'bg-white text-blue-600 border-t border-l border-r border-gray-200' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      {/* Show count of filtered results if search is active */}
      {searchQuery && (
        <div className="mb-4 text-sm text-gray-500">
          {activeTab === 'specialties' && `Found ${filteredData.localSpecialties?.length || 0} matching specialties`}
          {activeTab === 'dining' && `Found ${filteredData.diningOptions?.length || 0} matching dining options`}
          {activeTab === 'markets' && `Found ${filteredData.foodMarkets?.length || 0} matching food markets`}
          {activeTab === 'drinks' && `Found ${filteredData.drinkSpecialties?.length || 0} matching drink venues`}
          {activeTab === 'experiences' && `Found ${filteredData.foodExperiences?.length || 0} matching food experiences`}
        </div>
      )}
      
      {/* Content area */}
      <div className="mt-6">
        {activeTab === 'specialties' && renderLocalSpecialties()}
        {activeTab === 'dining' && renderDiningOptions()}
        {activeTab === 'markets' && renderFoodMarkets()}
        {activeTab === 'drinks' && renderDrinkSpecialties()}
        {activeTab === 'experiences' && renderFoodExperiences()}
        {activeTab === 'seasonal' && renderSeasonalSpecialties()}
      </div>
    </div>
  );
};

export default CulinaryGuide;