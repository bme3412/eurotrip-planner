'use client';

import React, { useState } from 'react';
import Image from 'next/image';

const AttractionsList = ({ attractions, categories, cityName }) => {
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('cultural_significance');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedAttractions, setExpandedAttractions] = useState({});
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  
  // Toggle expanded state for an attraction
  const toggleExpanded = (attractionId) => {
    setExpandedAttractions(prev => ({
      ...prev,
      [attractionId]: !prev[attractionId]
    }));
  };
  
  // Get unique attraction types for filter
  const attractionTypes = ['all', ...new Set(attractions.map(a => a.type?.toLowerCase() || 'other'))];
  
  // Filter and sort attractions
  const filteredAttractions = attractions
    .filter(attraction => 
      (filterType === 'all' || attraction.type?.toLowerCase() === filterType) &&
      (searchTerm === '' || attraction.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
       attraction.description?.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      if (sortBy === 'cultural_significance') {
        return (b.ratings?.cultural_significance || 0) - (a.ratings?.cultural_significance || 0);
      } else if (sortBy === 'duration') {
        return (b.ratings?.suggested_duration_hours || 0) - (a.ratings?.suggested_duration_hours || 0);
      } else if (sortBy === 'cost') {
        return (a.ratings?.cost_estimate || 0) - (b.ratings?.cost_estimate || 0);
      } else if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });
  
  // Format price range for display
  const getPriceIcon = (priceRange) => {
    switch(priceRange?.toLowerCase()) {
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
    switch(type?.toLowerCase()) {
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
      case 'historical district':
        return '🏺';
      case 'opera house':
      case 'concert hall':
        return '🎭';
      case 'cemetery':
        return '⚰️';
      case 'harbor':
        return '⚓';
      case 'zoo':
        return '🦁';
      case 'lake':
        return '🌊';
      case 'entertainment district':
        return '🎪';
      case 'architecture':
        return '🏢';
      case 'government building':
        return '🏛️';
      default:
        return '📍';
    }
  };

  // Get a background color based on the cultural significance
  const getSignificanceClass = (significance) => {
    if (!significance) return '';
    if (significance >= 9) return 'border-l-4 border-green-500';
    if (significance >= 8) return 'border-l-4 border-blue-500';
    if (significance >= 7) return 'border-l-4 border-indigo-400';
    return '';
  };

  // Get significance color for badges
  const getSignificanceColor = (significance) => {
    if (!significance) return 'bg-gray-100 text-gray-800';
    if (significance >= 9) return 'bg-green-100 text-green-800';
    if (significance >= 8) return 'bg-blue-100 text-blue-800';
    if (significance >= 7) return 'bg-indigo-100 text-indigo-800';
    return 'bg-gray-100 text-gray-800';
  };
  
  return (
    <div className="p-6">
      {/* Enhanced Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {cityName} Attractions
        </h1>
        <p className="text-gray-600">
          Discover the best places to visit in {cityName} with our curated list of attractions
        </p>
      </div>

      {/* Enhanced Filters section */}
      <div className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl shadow-sm border border-blue-100">
        <div className="flex flex-col space-y-4">
          {/* Search bar */}
          <div className="w-full">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
                </svg>
              </div>
              <input 
                type="search" 
                className="block w-full p-4 pl-12 text-gray-900 border border-gray-300 rounded-xl bg-white focus:ring-blue-500 focus:border-blue-500 shadow-sm" 
                placeholder="Search attractions in Paris..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        
          {/* Filters row */}
          <div className="flex flex-col lg:flex-row justify-between space-y-4 lg:space-y-0 lg:space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Type</label>
              <select 
                className="p-3 border rounded-xl w-full bg-white shadow-sm focus:ring-blue-500 focus:border-blue-500"
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
            
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort by</label>
              <select
                className="p-3 border rounded-xl w-full bg-white shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="cultural_significance">Cultural Significance</option>
                <option value="duration">Duration (Longest First)</option>
                <option value="cost">Price (Low to High)</option>
                <option value="name">Name (A-Z)</option>
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">View Mode</label>
              <div className="flex border rounded-xl overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex-1 p-3 text-sm font-medium transition-colors ${
                    viewMode === 'grid' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex-1 p-3 text-sm font-medium transition-colors ${
                    viewMode === 'list' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  List
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Results count */}
      <div className="mb-6 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Showing {filteredAttractions.length} of {attractions.length} attractions
        </div>
        <div className="text-sm text-gray-500">
          {filteredAttractions.length > 0 && (
            <span className="inline-flex items-center">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
              {filteredAttractions.length} results found
            </span>
          )}
        </div>
      </div>
      
      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAttractions.map((attraction, idx) => {
            const attractionId = attraction.id || `attraction-${idx}`;
            const isExpanded = expandedAttractions[attractionId] || false;
            
            return (
              <div key={attractionId} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                {/* Card Header */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">{getTypeIcon(attraction.type)}</span>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-lg">{attraction.name}</h3>
                        <p className="text-sm text-gray-500">{attraction.type}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <span className="text-lg">{getPriceIcon(attraction.price_range)}</span>
                      {attraction.ratings?.cultural_significance && (
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSignificanceColor(attraction.ratings.cultural_significance)}`}>
                          {attraction.ratings.cultural_significance.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Quick Info */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="text-center p-2 bg-gray-50 rounded-lg">
                      <div className="text-sm font-medium text-gray-900">
                        {attraction.ratings?.suggested_duration_hours ? `${attraction.ratings.suggested_duration_hours}h` : 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500">Duration</div>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded-lg">
                      <div className="text-sm font-medium text-gray-900">
                        {attraction.ratings?.cost_estimate ? `€${attraction.ratings.cost_estimate}` : 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500">Cost</div>
                    </div>
                  </div>
                  
                  {/* Description Preview */}
                  <p className="text-gray-700 text-sm line-clamp-3 mb-4">
                    {attraction.description}
                  </p>
                  
                  {/* Action Buttons */}
                  <div className="flex space-x-2">
                    <button 
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                        isExpanded 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                      onClick={() => toggleExpanded(attractionId)}
                    >
                      {isExpanded ? 'Hide Details' : 'View Details'}
                    </button>
                    {attraction.latitude && attraction.longitude && (
                      <button 
                        className="py-2 px-3 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                        onClick={() => {
                          console.log(`Show ${attraction.name} on map at ${attraction.latitude}, ${attraction.longitude}`);
                        }}
                      >
                        Map
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 p-6">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Best Time to Visit</h4>
                        <p className="text-sm text-gray-700">{attraction.best_time || "No specific information available"}</p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Seasonal Notes</h4>
                        <p className="text-sm text-gray-700">{attraction.seasonal_notes || "No seasonal information available"}</p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Booking Tips</h4>
                        <p className="text-sm text-gray-700">{attraction.booking_tips || "No specific booking tips available"}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      
      {/* List View */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {filteredAttractions.map((attraction, idx) => {
            const attractionId = attraction.id || `attraction-${idx}`;
            const isExpanded = expandedAttractions[attractionId] || false;
            
            return (
              <div key={attractionId} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <span className="text-2xl">{getTypeIcon(attraction.type)}</span>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-lg">{attraction.name}</h3>
                        <p className="text-sm text-gray-500">{attraction.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-center">
                        <div className="text-sm font-medium text-gray-900">
                          {attraction.ratings?.suggested_duration_hours ? `${attraction.ratings.suggested_duration_hours}h` : 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500">Duration</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-medium text-gray-900">
                          {getPriceIcon(attraction.price_range)}
                        </div>
                        <div className="text-xs text-gray-500">Price</div>
                      </div>
                      {attraction.ratings?.cultural_significance && (
                        <div className="text-center">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSignificanceColor(attraction.ratings.cultural_significance)}`}>
                            {attraction.ratings.cultural_significance.toFixed(1)}
                          </span>
                          <div className="text-xs text-gray-500 mt-1">Rating</div>
                        </div>
                      )}
                      <button 
                        className={`py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                          isExpanded 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                        onClick={() => toggleExpanded(attractionId)}
                      >
                        {isExpanded ? 'Hide' : 'Details'}
                      </button>
                    </div>
                  </div>
                  
                  {/* Description Preview */}
                  <p className="text-gray-700 text-sm mt-3 line-clamp-2">
                    {attraction.description}
                  </p>
                </div>
                
                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Best Time to Visit</h4>
                        <p className="text-sm text-gray-700">{attraction.best_time || "No specific information available"}</p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Seasonal Notes</h4>
                        <p className="text-sm text-gray-700">{attraction.seasonal_notes || "No seasonal information available"}</p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Booking Tips</h4>
                        <p className="text-sm text-gray-700">{attraction.booking_tips || "No specific booking tips available"}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      
      {/* Empty State */}
      {filteredAttractions.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No attractions found</h3>
          <p className="mt-2 text-gray-600">Try adjusting your search or filter criteria.</p>
          <div className="mt-6">
            <button
              type="button"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={() => {
                setFilterType('all');
                setSearchTerm('');
              }}
            >
              Reset filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttractionsList;