// src/components/city-guides/AttractionsList.js
'use client';


import React, { useState } from 'react';
import Image from 'next/image';

const AttractionCard = ({ attraction }) => {
  const [showDetails, setShowDetails] = useState(false);
  
  // Format price range for display
  const getPriceIcon = (priceRange) => {
    switch(priceRange.toLowerCase()) {
      case 'free':
        return '🆓';
      case 'budget':
        return '€';
      case 'moderate':
        return '€€';
      case 'expensive':
        return '€€€';
      default:
        return priceRange;
    }
  };
  
  // Determine best icon for the type of attraction
  const getTypeIcon = (type) => {
    switch(type.toLowerCase()) {
      case 'monument':
        return '🏛️';
      case 'museum':
        return '🏛️';
      case 'cathedral':
      case 'basilica':
      case 'chapel':
        return '⛪';
      case 'park':
      case 'garden':
        return '🌳';
      case 'square':
        return '🏙️';
      case 'district':
        return '🏘️';
      case 'street':
        return '🛣️';
      case 'activity':
        return '🎭';
      case 'historical site':
        return '🏺';
      case 'opera house':
        return '🎭';
      case 'cemetery':
        return '⚰️';
      default:
        return '📍';
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden transition-all hover:shadow-lg">
      <div 
        className="p-4 cursor-pointer flex justify-between items-center"
        onClick={() => setShowDetails(!showDetails)}
      >
        <div>
          <h3 className="text-xl font-semibold">{attraction.name}</h3>
          <div className="flex mt-2 items-center space-x-3">
            <span className="inline-flex items-center text-sm text-gray-600">
              {getTypeIcon(attraction.type)} {attraction.type}
            </span>
            <span className="inline-flex items-center text-sm text-gray-600">
              ⏱️ {attraction.ratings.suggested_duration_hours} hr
            </span>
            <span className="inline-flex items-center text-sm text-gray-600">
              {getPriceIcon(attraction.price_range)}
            </span>
          </div>
        </div>
        <div className="text-gray-400">
          {showDetails ? '▲' : '▼'}
        </div>
      </div>
      
      {showDetails && (
        <div className="p-4 pt-0 border-t border-gray-100">
          <p className="text-gray-700 my-3">{attraction.description}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <h4 className="font-medium text-gray-900">Best Time to Visit</h4>
              <p className="text-gray-700">{attraction.best_time}</p>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900">Price</h4>
              <p className="text-gray-700">
                {attraction.price_range} 
                {attraction.ratings.cost_estimate > 0 && ` (approx. €${attraction.ratings.cost_estimate})`}
              </p>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900">Seasonal Notes</h4>
              <p className="text-gray-700">{attraction.seasonal_notes}</p>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900">Booking Tips</h4>
              <p className="text-gray-700">{attraction.booking_tips}</p>
            </div>
          </div>
          
          {/* Show on map button (for future implementation) */}
          <div className="mt-4 flex justify-end">
            <button 
              className="bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded text-sm"
              onClick={(e) => {
                e.stopPropagation();
                // Future implementation: Center map on this attraction
                console.log(`Show ${attraction.name} on map at ${attraction.latitude}, ${attraction.longitude}`);
              }}
            >
              Show on Map
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const AttractionsList = ({ attractions }) => {
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('cultural_significance');
  
  // Get unique attraction types for filter
  const attractionTypes = ['all', ...new Set(attractions.map(a => a.type.toLowerCase()))];
  
  // Filter and sort attractions
  const filteredAttractions = attractions
    .filter(attraction => 
      filterType === 'all' || attraction.type.toLowerCase() === filterType
    )
    .sort((a, b) => {
      if (sortBy === 'cultural_significance') {
        return b.ratings.cultural_significance - a.ratings.cultural_significance;
      } else if (sortBy === 'duration') {
        return b.ratings.suggested_duration_hours - a.ratings.suggested_duration_hours;
      } else if (sortBy === 'cost') {
        return a.ratings.cost_estimate - b.ratings.cost_estimate;
      }
      return 0;
    });
  
  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between mb-6 space-y-4 sm:space-y-0">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Type</label>
          <select 
            className="p-2 border rounded-md w-full sm:w-auto"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            {attractionTypes.map((type) => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sort by</label>
          <select
            className="p-2 border rounded-md w-full sm:w-auto"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="cultural_significance">Cultural Significance</option>
            <option value="duration">Duration</option>
            <option value="cost">Price (Low to High)</option>
          </select>
        </div>
      </div>
      
      <div className="space-y-4">
        {filteredAttractions.map((attraction) => (
          <AttractionCard key={attraction.name} attraction={attraction} />
        ))}
        
        {filteredAttractions.length === 0 && (
          <p className="text-center text-gray-500 py-8">No attractions match your filters</p>
        )}
      </div>
    </div>
  );
};

export default AttractionsList;