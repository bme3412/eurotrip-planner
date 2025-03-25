'use client';

import React, { useState } from 'react';
import Image from 'next/image';

const AttractionsList = ({ attractions }) => {
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('cultural_significance');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedAttractions, setExpandedAttractions] = useState({});
  
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
  
  return (
    <div className="p-6">
      {/* Filters section */}
      <div className="mb-6 bg-gray-50 p-4 rounded-lg shadow-sm">
        <div className="flex flex-col space-y-4">
          {/* Search bar */}
          <div className="w-full">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <svg className="w-4 h-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
                </svg>
              </div>
              <input 
                type="search" 
                className="block w-full p-3 pl-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white focus:ring-blue-500 focus:border-blue-500" 
                placeholder="Search attractions..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        
          {/* Filters row */}
          <div className="flex flex-col sm:flex-row justify-between space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="w-full sm:w-1/2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Type</label>
              <select 
                className="p-2 border rounded-md w-full bg-white shadow-sm focus:ring-blue-500 focus:border-blue-500"
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
            
            <div className="w-full sm:w-1/2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort by</label>
              <select
                className="p-2 border rounded-md w-full bg-white shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="cultural_significance">Cultural Significance</option>
                <option value="duration">Duration (Longest First)</option>
                <option value="cost">Price (Low to High)</option>
                <option value="name">Name (A-Z)</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      
      {/* Found count */}
      <div className="mb-4 text-sm text-gray-500">
        Showing {filteredAttractions.length} of {attractions.length} attractions
      </div>
      
      {/* Attractions table for all screen sizes */}
      <div className="overflow-hidden rounded-lg shadow-md border border-gray-200">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attraction</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Type</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Duration</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Price</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Best Time</th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Rating</th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAttractions.map((attraction, idx) => {
              // Generate a unique ID for each attraction
              const attractionId = attraction.id || `attraction-${idx}`;
              const isExpanded = expandedAttractions[attractionId] || false;
              
              return (
                <React.Fragment key={attractionId}>
                  {/* Main attraction row */}
                  <tr className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${getSignificanceClass(attraction.ratings?.cultural_significance)}`}>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{attraction.name}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap hidden md:table-cell">
                      <div className="flex items-center">
                        <span className="mr-1">{getTypeIcon(attraction.type)}</span>
                        <span className="text-sm text-gray-700">{attraction.type}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap hidden md:table-cell">
                      <div className="text-sm text-gray-700">
                        {attraction.ratings?.suggested_duration_hours ? `${attraction.ratings.suggested_duration_hours} hr` : 'N/A'}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap hidden md:table-cell">
                      <div className="text-sm text-gray-700">
                        {getPriceIcon(attraction.price_range)}
                        <span className="ml-1">
                          {attraction.ratings?.cost_estimate ? `(€${attraction.ratings.cost_estimate})` : ''}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-normal hidden lg:table-cell">
                      <div className="text-sm text-gray-700 max-w-xs truncate" title={attraction.best_time || 'No information available'}>
                        {attraction.best_time?.split('.')[0] || 'Anytime'}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center hidden sm:table-cell">
                      {attraction.ratings?.cultural_significance ? (
                        <span className="px-2 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          {attraction.ratings.cultural_significance.toFixed(1)}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <button 
                        className={`px-3 py-1 rounded ${isExpanded ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'} hover:bg-blue-200 transition-colors duration-200`}
                        onClick={() => toggleExpanded(attractionId)}
                      >
                        {isExpanded ? 'Hide' : 'Details'}
                      </button>
                    </td>
                  </tr>
                  
                  {/* Expanded details row */}
                  {isExpanded && (
                    <tr className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td colSpan="7" className="px-4 py-4 border-t border-gray-100">
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <p className="text-gray-700 mb-4">{attraction.description}</p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white p-3 rounded shadow-sm">
                              <h4 className="font-medium text-gray-900 mb-1">Best Time to Visit</h4>
                              <p className="text-sm text-gray-700">{attraction.best_time || "No specific information available"}</p>
                            </div>
                            
                            <div className="bg-white p-3 rounded shadow-sm">
                              <h4 className="font-medium text-gray-900 mb-1">Seasonal Notes</h4>
                              <p className="text-sm text-gray-700">{attraction.seasonal_notes || "No seasonal information available"}</p>
                            </div>
                            
                            <div className="bg-white p-3 rounded shadow-sm">
                              <h4 className="font-medium text-gray-900 mb-1">Booking Tips</h4>
                              <p className="text-sm text-gray-700">{attraction.booking_tips || "No specific booking tips available"}</p>
                            </div>
                            
                            {attraction.latitude && attraction.longitude && (
                              <div className="bg-white p-3 rounded shadow-sm flex items-center justify-between">
                                <div>
                                  <h4 className="font-medium text-gray-900 mb-1">Location</h4>
                                  <p className="text-sm text-gray-700">Coordinates: {attraction.latitude.toFixed(4)}, {attraction.longitude.toFixed(4)}</p>
                                </div>
                                <button 
                                  className="bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded text-sm font-medium transition"
                                  onClick={() => {
                                    // Future implementation: Center map on this attraction
                                    console.log(`Show ${attraction.name} on map at ${attraction.latitude}, ${attraction.longitude}`);
                                  }}
                                >
                                  Map
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            
            {filteredAttractions.length === 0 && (
              <tr>
                <td colSpan="7" className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No attractions found</h3>
                  <p className="mt-1 text-sm text-gray-500">Try changing your search or filter criteria.</p>
                  <div className="mt-6">
                    <button
                      type="button"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      onClick={() => {
                        setFilterType('all');
                        setSearchTerm('');
                      }}
                    >
                      Reset filters
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Card view for mobile (only visible on very small screens) */}
      <div className="md:hidden space-y-4 mt-6">
        {filteredAttractions.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No attractions found</h3>
            <p className="mt-1 text-sm text-gray-500">Try changing your search or filter criteria.</p>
            <div className="mt-6">
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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
    </div>
  );
};

export default AttractionsList;