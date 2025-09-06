'use client';

import React, { useState } from 'react';

const NeighborhoodsList = ({ neighborhoods, cityName }) => {
  // Ensure we're working with the correct data structure
  const neighborhoodsList = Array.isArray(neighborhoods) ? neighborhoods : (neighborhoods?.neighborhoods || []);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [expandedNeighborhoods, setExpandedNeighborhoods] = useState({});
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  
  // Add unique IDs to neighborhoods if they don't have them already
  const neighborhoodsWithIds = neighborhoodsList.map((neighborhood, index) => ({
    ...neighborhood,
    id: neighborhood.id || `neighborhood-${index}`
  }));
  
  // Toggle expanded state for a neighborhood
  const toggleExpanded = (neighborhoodId) => {
    setExpandedNeighborhoods(prev => ({
      ...prev,
      [neighborhoodId]: !prev[neighborhoodId]
    }));
  };
  
  // Extract unique categories for filtering based on what's in the 'known_for' property
  const allCategories = neighborhoodsWithIds
    .reduce((acc, neighborhood) => {
      const knownFor = neighborhood.appeal?.known_for || neighborhood.known_for || [];
      if (Array.isArray(knownFor)) {
        knownFor.forEach(category => {
          if (!acc.includes(category)) acc.push(category);
        });
      } else if (knownFor && !acc.includes(knownFor)) {
        acc.push(knownFor);
      }
      return acc;
    }, [])
    .sort();
  
  // Create options for atmosphere filtering
  const allAtmospheres = neighborhoodsWithIds
    .reduce((acc, neighborhood) => {
      const atmospheres = neighborhood.appeal?.atmosphere || neighborhood.atmosphere || [];
      if (Array.isArray(atmospheres)) {
        atmospheres.forEach(atmosphere => {
          if (!acc.includes(atmosphere)) acc.push(atmosphere);
        });
      } else if (atmospheres && !acc.includes(atmospheres)) {
        acc.push(atmospheres);
      }
      return acc;
    }, [])
    .sort();

  // Filter neighborhoods based on search and category filter
  const filteredNeighborhoods = neighborhoodsWithIds.filter(neighborhood => {
    // Search term filter
    const nameMatch = neighborhood.name.toLowerCase().includes(searchTerm.toLowerCase());
    const descriptionMatch = (neighborhood.character || neighborhood.description || '')
      .toLowerCase().includes(searchTerm.toLowerCase());
    const alternateNamesMatch = (neighborhood.alternate_names || []).some(
      name => name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // Category filter
    const knownFor = neighborhood.appeal?.known_for || neighborhood.known_for || [];
    const categoryMatch = filterCategory === 'all' || 
      (Array.isArray(knownFor) 
        ? knownFor.some(cat => cat.toLowerCase().includes(filterCategory.toLowerCase()))
        : knownFor.toLowerCase().includes(filterCategory.toLowerCase()));
    
    return (nameMatch || descriptionMatch || alternateNamesMatch) && categoryMatch;
  }).sort((a, b) => {
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name);
    } else if (sortBy === 'touristy') {
      return (b.categories?.touristy || 0) - (a.categories?.touristy || 0);
    } else if (sortBy === 'shopping') {
      return (b.categories?.shopping || 0) - (a.categories?.shopping || 0);
    } else if (sortBy === 'nightlife') {
      return (b.categories?.nightlife || 0) - (a.categories?.nightlife || 0);
    } else if (sortBy === 'dining') {
      return (b.categories?.dining || 0) - (a.categories?.dining || 0);
    }
    return 0;
  });
  
  // Get appropriate icon for the vibe/atmosphere
  const getAtmosphereIcon = (atmosphere) => {
    if (!atmosphere) return '';
    
    const text = atmosphere.toLowerCase();
    if (text.includes('historic') || text.includes('traditional')) return '🏛️';
    if (text.includes('trendy') || text.includes('hip')) return '🔥';
    if (text.includes('bohemian') || text.includes('artistic')) return '🎨';
    if (text.includes('quiet') || text.includes('peaceful')) return '🧘';
    if (text.includes('upscale') || text.includes('luxury')) return '💎';
    if (text.includes('lively') || text.includes('bustling')) return '🎭';
    if (text.includes('charming')) return '✨';
    if (text.includes('sophisticated')) return '🥂';
    if (text.includes('romantic')) return '💕';
    if (text.includes('intellectual')) return '📚';
    if (text.includes('picturesque')) return '🖼️';
    if (text.includes('touristy')) return '📸';
    if (text.includes('elegant')) return '👑';
    if (text.includes('eclectic')) return '🔮';
    if (text.includes('sleek') || text.includes('modern')) return '🏢';
    if (text.includes('energetic')) return '⚡';
    if (text.includes('cultural')) return '🌍';
    if (text.includes('relaxed')) return '☕';
    return '🏙️';
  };
  
  // Get score badge color based on rating 1-5
  const getScoreBadgeColor = (score) => {
    if (!score && score !== 0) return 'bg-gray-100 text-gray-500';
    if (score >= 5) return 'bg-green-100 text-green-800';
    if (score >= 4) return 'bg-blue-100 text-blue-800';
    if (score >= 3) return 'bg-yellow-100 text-yellow-800';
    if (score >= 2) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  // Get neighborhood icon based on name
  const getNeighborhoodIcon = (name) => {
    const nameLower = name.toLowerCase();
    if (nameLower.includes('marais')) return '🏛️';
    if (nameLower.includes('montmartre')) return '⛪';
    if (nameLower.includes('latin')) return '📚';
    if (nameLower.includes('champs')) return '🛍️';
    if (nameLower.includes('eiffel')) return '🗼';
    if (nameLower.includes('louvre')) return '🏛️';
    if (nameLower.includes('seine')) return '🌊';
    if (nameLower.includes('opera')) return '🎭';
    if (nameLower.includes('bastille')) return '🏰';
    if (nameLower.includes('republic')) return '🏛️';
    return '🏘️';
  };
  
  return (
    <div className="p-6">
      {/* Enhanced Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {cityName} Neighborhoods
        </h1>
                  <p className="text-gray-600">
            Discover the unique character and charm of {cityName}&apos;s most vibrant districts
          </p>
      </div>

      {/* Enhanced Filters section */}
      <div className="mb-8 bg-gradient-to-r from-purple-50 to-indigo-50 p-6 rounded-xl shadow-sm border border-purple-100">
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
                className="block w-full p-4 pl-12 text-gray-900 border border-gray-300 rounded-xl bg-white focus:ring-purple-500 focus:border-purple-500 shadow-sm" 
                placeholder="Search neighborhoods in Paris..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        
          {/* Filters row */}
          <div className="flex flex-col lg:flex-row justify-between space-y-4 lg:space-y-0 lg:space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Feature</label>
              <select 
                className="p-3 border rounded-xl w-full bg-white shadow-sm focus:ring-purple-500 focus:border-purple-500"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="all">All Features</option>
                {allCategories.map(category => (
                  <option key={category} value={category.toLowerCase()}>{category}</option>
                ))}
              </select>
            </div>
            
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort by</label>
              <select
                className="p-3 border rounded-xl w-full bg-white shadow-sm focus:ring-purple-500 focus:border-purple-500"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="name">Name (A-Z)</option>
                <option value="touristy">Most Popular</option>
                <option value="dining">Best Dining</option>
                <option value="shopping">Best Shopping</option>
                <option value="nightlife">Best Nightlife</option>
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">View Mode</label>
              <div className="flex border rounded-xl overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex-1 p-3 text-sm font-medium transition-colors ${
                    viewMode === 'grid' 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex-1 p-3 text-sm font-medium transition-colors ${
                    viewMode === 'list' 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  List
                </button>
              </div>
            </div>
          </div>

          {/* Atmosphere tags */}
          {allAtmospheres.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Popular Atmospheres</label>
              <div className="flex flex-wrap gap-2">
                {allAtmospheres.slice(0, 12).map(atmosphere => (
                  <button
                    key={atmosphere}
                    onClick={() => setSearchTerm(atmosphere)}
                    className="px-3 py-1 rounded-full text-sm flex items-center bg-white border border-purple-200 text-gray-800 hover:bg-purple-50 transition-colors"
                  >
                    <span className="mr-1">{getAtmosphereIcon(atmosphere)}</span>
                    {atmosphere}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Results count */}
      <div className="mb-6 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Showing {filteredNeighborhoods.length} of {neighborhoodsList.length} neighborhoods
        </div>
        <div className="text-sm text-gray-500">
          {filteredNeighborhoods.length > 0 && (
            <span className="inline-flex items-center">
              <span className="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
              {filteredNeighborhoods.length} results found
            </span>
          )}
        </div>
      </div>
      
      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNeighborhoods.map((neighborhood, idx) => {
            const knownFor = neighborhood.appeal?.known_for || neighborhood.known_for || [];
            const atmospheres = neighborhood.appeal?.atmosphere || neighborhood.atmosphere || [];
            const isExpanded = expandedNeighborhoods[neighborhood.id] || false;
            
            return (
              <div key={neighborhood.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                {/* Card Header */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">{getNeighborhoodIcon(neighborhood.name)}</span>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-lg">{neighborhood.name}</h3>
                        {neighborhood.alternate_names && neighborhood.alternate_names.length > 0 && (
                          <p className="text-sm text-gray-500">{neighborhood.alternate_names[0]}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      {neighborhood.categories && (
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getScoreBadgeColor(neighborhood.categories.touristy)}`}>
                          {neighborhood.categories.touristy}/5
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Quick Info */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="text-center p-2 bg-gray-50 rounded-lg">
                      <div className="text-sm font-medium text-gray-900">
                        {neighborhood.categories?.dining || 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500">Dining</div>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded-lg">
                      <div className="text-sm font-medium text-gray-900">
                        {neighborhood.categories?.shopping || 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500">Shopping</div>
                    </div>
                  </div>
                  
                  {/* Description Preview */}
                  <p className="text-gray-700 text-sm line-clamp-3 mb-4">
                    {neighborhood.character}
                  </p>
                  
                  {/* Atmosphere Tags */}
                  {Array.isArray(atmospheres) && atmospheres.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {atmospheres.slice(0, 2).map((atmosphere, i) => (
                        <span key={i} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                          {getAtmosphereIcon(atmosphere)} {atmosphere}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {/* Action Buttons */}
                  <div className="flex space-x-2">
                    <button 
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                        isExpanded 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-purple-600 text-white hover:bg-purple-700'
                      }`}
                      onClick={() => toggleExpanded(neighborhood.id)}
                    >
                      {isExpanded ? 'Hide Details' : 'View Details'}
                    </button>
                  </div>
                </div>
                
                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 p-6">
                    <div className="space-y-4">
                      {/* Categories ratings */}
                      {neighborhood.categories && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div className="bg-white p-3 rounded-lg shadow-sm text-center">
                            <div className={`mx-auto w-8 h-8 flex items-center justify-center rounded-full ${getScoreBadgeColor(neighborhood.categories.dining)}`}>
                              <span className="text-sm">🍽️</span>
                            </div>
                            <div className="mt-1 text-xs font-medium">Dining</div>
                            <div className="font-bold text-sm">{neighborhood.categories.dining}/5</div>
                          </div>
                          <div className="bg-white p-3 rounded-lg shadow-sm text-center">
                            <div className={`mx-auto w-8 h-8 flex items-center justify-center rounded-full ${getScoreBadgeColor(neighborhood.categories.shopping)}`}>
                              <span className="text-sm">🛍️</span>
                            </div>
                            <div className="mt-1 text-xs font-medium">Shopping</div>
                            <div className="font-bold text-sm">{neighborhood.categories.shopping}/5</div>
                          </div>
                          <div className="bg-white p-3 rounded-lg shadow-sm text-center">
                            <div className={`mx-auto w-8 h-8 flex items-center justify-center rounded-full ${getScoreBadgeColor(neighborhood.categories.nightlife)}`}>
                              <span className="text-sm">🌃</span>
                            </div>
                            <div className="mt-1 text-xs font-medium">Nightlife</div>
                            <div className="font-bold text-sm">{neighborhood.categories.nightlife}/5</div>
                          </div>
                          <div className="bg-white p-3 rounded-lg shadow-sm text-center">
                            <div className={`mx-auto w-8 h-8 flex items-center justify-center rounded-full ${getScoreBadgeColor(neighborhood.categories.cultural)}`}>
                              <span className="text-sm">🎭</span>
                            </div>
                            <div className="mt-1 text-xs font-medium">Cultural</div>
                            <div className="font-bold text-sm">{neighborhood.categories.cultural}/5</div>
                          </div>
                        </div>
                      )}

                      {/* Known For Section */}
                      {Array.isArray(knownFor) && knownFor.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Known For</h4>
                          <div className="flex flex-wrap gap-2">
                            {knownFor.map((item, index) => (
                              <span 
                                key={index}
                                className="bg-blue-100 text-blue-800 rounded-full px-3 py-1 text-sm"
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Stay/Avoid Recommendations */}
                      {(neighborhood.stay_here_if || neighborhood.avoid_if) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {neighborhood.stay_here_if && neighborhood.stay_here_if.length > 0 && (
                            <div className="bg-green-50 p-3 rounded-md">
                              <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                                <span className="text-green-500 mr-2">✓</span>
                                Stay Here If
                              </h4>
                              <ul className="space-y-1">
                                {neighborhood.stay_here_if.map((item, index) => (
                                  <li key={index} className="text-sm text-gray-700">• {item}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {neighborhood.avoid_if && neighborhood.avoid_if.length > 0 && (
                            <div className="bg-red-50 p-3 rounded-md">
                              <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                                <span className="text-red-500 mr-2">✕</span>
                                Avoid If
                              </h4>
                              <ul className="space-y-1">
                                {neighborhood.avoid_if.map((item, index) => (
                                  <li key={index} className="text-sm text-gray-700">• {item}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Insider Tips */}
                      {neighborhood.insider_tips && neighborhood.insider_tips.length > 0 && (
                        <div className="bg-blue-50 p-3 rounded-md">
                          <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                            <span className="text-blue-500 mr-2">💡</span>
                            Insider Tips
                          </h4>
                          <ul className="space-y-1">
                            {neighborhood.insider_tips.map((tip, index) => (
                              <li key={index} className="text-sm text-gray-700">• {tip}</li>
                            ))}
                          </ul>
                        </div>
                      )}
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
          {filteredNeighborhoods.map((neighborhood, idx) => {
            const knownFor = neighborhood.appeal?.known_for || neighborhood.known_for || [];
            const atmospheres = neighborhood.appeal?.atmosphere || neighborhood.atmosphere || [];
            const isExpanded = expandedNeighborhoods[neighborhood.id] || false;
            
            return (
              <div key={neighborhood.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <span className="text-2xl">{getNeighborhoodIcon(neighborhood.name)}</span>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-lg">{neighborhood.name}</h3>
                        {neighborhood.alternate_names && neighborhood.alternate_names.length > 0 && (
                          <p className="text-sm text-gray-500">{neighborhood.alternate_names.join(', ')}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-center">
                        <div className="text-sm font-medium text-gray-900">
                          {neighborhood.categories?.dining || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500">Dining</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-medium text-gray-900">
                          {neighborhood.categories?.shopping || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500">Shopping</div>
                      </div>
                      {neighborhood.categories && (
                        <div className="text-center">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getScoreBadgeColor(neighborhood.categories.touristy)}`}>
                            {neighborhood.categories.touristy}/5
                          </span>
                          <div className="text-xs text-gray-500 mt-1">Rating</div>
                        </div>
                      )}
                      <button 
                        className={`py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                          isExpanded 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-purple-600 text-white hover:bg-purple-700'
                        }`}
                        onClick={() => toggleExpanded(neighborhood.id)}
                      >
                        {isExpanded ? 'Hide' : 'Details'}
                      </button>
                    </div>
                  </div>
                  
                  {/* Description Preview */}
                  <p className="text-gray-700 text-sm mt-3 line-clamp-2">
                    {neighborhood.character}
                  </p>
                </div>
                
                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Known For</h4>
                        <div className="flex flex-wrap gap-2">
                          {Array.isArray(knownFor) ? knownFor.map((item, index) => (
                            <span key={index} className="bg-blue-100 text-blue-800 rounded-full px-2 py-1 text-xs">
                              {item}
                            </span>
                          )) : knownFor}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Atmosphere</h4>
                        <div className="flex flex-wrap gap-2">
                          {Array.isArray(atmospheres) ? atmospheres.map((atmosphere, i) => (
                            <span key={i} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                              {getAtmosphereIcon(atmosphere)} {atmosphere}
                            </span>
                          )) : atmospheres}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Location</h4>
                        <p className="text-sm text-gray-700">{neighborhood.location?.description || 'Location information not available'}</p>
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
      {filteredNeighborhoods.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No neighborhoods found</h3>
          <p className="mt-2 text-gray-600">Try adjusting your search or filter criteria.</p>
          <div className="mt-6">
            <button
              type="button"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              onClick={() => {
                setSearchTerm('');
                setFilterCategory('all');
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

export default NeighborhoodsList;