'use client';

import React, { useState } from 'react';

const NeighborhoodsList = ({ neighborhoods }) => {
  // Ensure we're working with the correct data structure
  const neighborhoodsList = Array.isArray(neighborhoods) ? neighborhoods : (neighborhoods?.neighborhoods || []);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [expandedNeighborhoods, setExpandedNeighborhoods] = useState({});
  
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
  
  return (
    <div className="p-6">
      {/* Search and filter section */}
      <div className="bg-gray-50 p-5 rounded-lg shadow-sm mb-6">
        <div className="flex flex-col space-y-5">
          {/* Search bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <svg className="w-4 h-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search by name, alternate names, or description..."
              className="block w-full p-3 pl-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* Two-column filter layout for larger screens */}
          <div className="flex flex-col md:flex-row md:space-x-4 space-y-4 md:space-y-0">
            {/* Category filter */}
            <div className="w-full md:w-1/2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Feature</label>
              <select
                className="p-2 border rounded-md w-full bg-white shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="all">All Features</option>
                {allCategories.map(category => (
                  <option key={category} value={category.toLowerCase()}>{category}</option>
                ))}
              </select>
            </div>
            
            {/* Sort options */}
            <div className="w-full md:w-1/2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort by</label>
              <select
                className="p-2 border rounded-md w-full bg-white shadow-sm focus:ring-blue-500 focus:border-blue-500"
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
                    className="px-3 py-1 rounded-full text-sm flex items-center bg-gray-200 text-gray-800 hover:bg-gray-300"
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
      <div className="mb-4 text-sm text-gray-500">
        Showing {filteredNeighborhoods.length} of {neighborhoodsList.length} neighborhoods
      </div>
      
      {/* Table view with expandable rows */}
      <div className="overflow-hidden rounded-lg shadow-md border border-gray-200">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Neighborhood</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Character</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Known For</th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Ratings</th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredNeighborhoods.map((neighborhood, idx) => {
              const knownFor = neighborhood.appeal?.known_for || neighborhood.known_for || [];
              const atmospheres = neighborhood.appeal?.atmosphere || neighborhood.atmosphere || [];
              const isExpanded = expandedNeighborhoods[neighborhood.id] || false;
              
              return (
                <React.Fragment key={neighborhood.id}>
                  {/* Main neighborhood row */}
                  <tr className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-gray-900">{neighborhood.name}</div>
                      {neighborhood.alternate_names && neighborhood.alternate_names.length > 0 && (
                        <div className="text-xs text-gray-500">
                          {neighborhood.alternate_names.join(', ')}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <div className="text-sm text-gray-700 max-w-xs line-clamp-2">
                        {neighborhood.character ? (
                          <span>{neighborhood.character.split('.')[0]}</span>
                        ) : ''}
                      </div>
                      {atmospheres && atmospheres.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {Array.isArray(atmospheres) ? atmospheres.slice(0, 2).map((atmosphere, i) => (
                            <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                              {getAtmosphereIcon(atmosphere)} {atmosphere}
                            </span>
                          )) : ''}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {Array.isArray(knownFor) ? knownFor.slice(0, 2).map((item, i) => (
                          <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            {item}
                          </span>
                        )) : knownFor}
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden sm:table-cell">
                      {neighborhood.categories && (
                        <div className="flex flex-col items-center space-y-1">
                          <div className="flex items-center space-x-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getScoreBadgeColor(neighborhood.categories.dining)}`}>
                              🍽️ {neighborhood.categories.dining}
                            </span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getScoreBadgeColor(neighborhood.categories.shopping)}`}>
                              🛍️ {neighborhood.categories.shopping}
                            </span>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button 
                        className={`px-3 py-1 rounded ${isExpanded ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'} hover:bg-blue-200 transition-colors duration-200`}
                        onClick={() => toggleExpanded(neighborhood.id)}
                      >
                        {isExpanded ? 'Hide' : 'Details'}
                      </button>
                    </td>
                  </tr>
                  
                  {/* Expanded details row */}
                  {isExpanded && (
                    <tr className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td colSpan="5" className="px-4 py-4 border-t border-gray-100">
                        <div className="bg-gray-50 p-4 rounded-lg">
                          {/* Detailed Description */}
                          <p className="text-gray-700 mb-4">{neighborhood.character || neighborhood.description}</p>
                          
                          {/* Categories ratings */}
                          {neighborhood.categories && (
                            <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                              <div className="bg-white p-3 rounded-lg shadow-sm text-center">
                                <div className={`mx-auto w-10 h-10 flex items-center justify-center rounded-full ${getScoreBadgeColor(neighborhood.categories.dining)}`}>
                                  <span className="text-lg">🍽️</span>
                                </div>
                                <div className="mt-1 text-xs font-medium">Dining</div>
                                <div className="font-bold">{neighborhood.categories.dining}/5</div>
                              </div>
                              <div className="bg-white p-3 rounded-lg shadow-sm text-center">
                                <div className={`mx-auto w-10 h-10 flex items-center justify-center rounded-full ${getScoreBadgeColor(neighborhood.categories.shopping)}`}>
                                  <span className="text-lg">🛍️</span>
                                </div>
                                <div className="mt-1 text-xs font-medium">Shopping</div>
                                <div className="font-bold">{neighborhood.categories.shopping}/5</div>
                              </div>
                              <div className="bg-white p-3 rounded-lg shadow-sm text-center">
                                <div className={`mx-auto w-10 h-10 flex items-center justify-center rounded-full ${getScoreBadgeColor(neighborhood.categories.nightlife)}`}>
                                  <span className="text-lg">🌃</span>
                                </div>
                                <div className="mt-1 text-xs font-medium">Nightlife</div>
                                <div className="font-bold">{neighborhood.categories.nightlife}/5</div>
                              </div>
                              <div className="bg-white p-3 rounded-lg shadow-sm text-center">
                                <div className={`mx-auto w-10 h-10 flex items-center justify-center rounded-full ${getScoreBadgeColor(neighborhood.categories.cultural)}`}>
                                  <span className="text-lg">🎭</span>
                                </div>
                                <div className="mt-1 text-xs font-medium">Cultural</div>
                                <div className="font-bold">{neighborhood.categories.cultural}/5</div>
                              </div>
                            </div>
                          )}
                          
                          {/* Grid layout for more details */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Known For Section */}
                            {Array.isArray(knownFor) && knownFor.length > 0 && (
                              <div className="bg-white p-3 rounded-lg shadow-sm">
                                <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                  </svg>
                                  Known For
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {knownFor.map((item, index) => (
                                    <span 
                                      key={`known-${neighborhood.id}-${index}`}
                                      className="bg-blue-100 text-blue-800 rounded-full px-3 py-1 text-sm"
                                    >
                                      {item}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Atmosphere Section */}
                            {Array.isArray(atmospheres) && atmospheres.length > 0 && (
                              <div className="bg-white p-3 rounded-lg shadow-sm">
                                <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 text-purple-500" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
                                  </svg>
                                  Atmosphere
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {atmospheres.map((atmosphere, i) => (
                                    <span key={i} className="inline-flex items-center px-2 py-1 rounded text-sm font-medium bg-gray-100 text-gray-800">
                                      {getAtmosphereIcon(atmosphere)} {atmosphere}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Transit Information */}
                            {neighborhood.practical_info?.transit && neighborhood.practical_info.transit.length > 0 && (
                              <div className="bg-white p-3 rounded-lg shadow-sm">
                                <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                                    <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H11a1 1 0 001-1v-1h3.05a2.5 2.5 0 014.9 0H20a1 1 0 001-1V5a1 1 0 00-1-1H3zM2 5a2 2 0 012-2h12a2 2 0 012 2v8h-.05a3.5 3.5 0 00-6.9 0h-2.1a3.5 3.5 0 00-6.9 0H2V5z" />
                                  </svg>
                                  Transit Stations
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {neighborhood.practical_info.transit.map((station, index) => (
                                    <span 
                                      key={`transit-${neighborhood.id}-${index}`}
                                      className="bg-gray-100 text-gray-800 rounded-full px-3 py-1 text-sm"
                                    >
                                      🚇 {station}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Location Information */}
                            {neighborhood.location && neighborhood.location.description && (
                              <div className="bg-white p-3 rounded-lg shadow-sm">
                                <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 text-teal-500" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                  </svg>
                                  Location
                                </h4>
                                <p className="text-sm text-gray-700">{neighborhood.location.description}</p>
                                
                                {neighborhood.location.borders && neighborhood.location.borders.length > 0 && (
                                  <div className="mt-2">
                                    <h5 className="text-sm font-medium text-gray-700">Borders:</h5>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {neighborhood.location.borders.map((border, index) => (
                                        <span key={`border-${index}`} className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                                          {border}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          
                          {/* Conditional sections based on available data */}
                          <div className="mt-4">
                            {/* Top Attractions */}
                            {neighborhood.highlights?.attractions && neighborhood.highlights.attractions.length > 0 && (
                              <div className="mt-4">
                                <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                  </svg>
                                  Top Attractions
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                                  {neighborhood.highlights.attractions.slice(0, 4).map((attraction, index) => (
                                    <div key={`attraction-${index}`} className="bg-white p-3 rounded-md shadow-sm">
                                      <div className="flex justify-between">
                                        <h5 className="font-medium text-gray-900">{attraction.name}</h5>
                                        <span className="text-sm bg-gray-100 px-2 py-0.5 rounded">
                                          {attraction.type}
                                        </span>
                                      </div>
                                      {attraction.description && (
                                        <p className="text-sm text-gray-600 mt-1">{attraction.description}</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Stay/Avoid Recommendations */}
                            {(neighborhood.stay_here_if || neighborhood.avoid_if) && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                {/* Stay here if */}
                                {neighborhood.stay_here_if && neighborhood.stay_here_if.length > 0 && (
                                  <div className="bg-green-50 p-3 rounded-md">
                                    <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                      </svg>
                                      Stay Here If
                                    </h4>
                                    <ul className="space-y-1">
                                      {neighborhood.stay_here_if.map((item, index) => (
                                        <li key={`stay-${index}`} className="flex items-start">
                                          <span className="text-green-500 mr-2">✓</span>
                                          <span className="text-sm">{item}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                
                                {/* Avoid if */}
                                {neighborhood.avoid_if && neighborhood.avoid_if.length > 0 && (
                                  <div className="bg-red-50 p-3 rounded-md">
                                    <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                      </svg>
                                      Avoid If
                                    </h4>
                                    <ul className="space-y-1">
                                      {neighborhood.avoid_if.map((item, index) => (
                                        <li key={`avoid-${index}`} className="flex items-start">
                                          <span className="text-red-500 mr-2">✕</span>
                                          <span className="text-sm">{item}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {/* Insider Tips */}
                            {neighborhood.insider_tips && neighborhood.insider_tips.length > 0 && (
                              <div className="mt-4 bg-blue-50 p-4 rounded-md">
                                <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                  </svg>
                                  Insider Tips
                                </h4>
                                <ul className="space-y-2">
                                  {neighborhood.insider_tips.map((tip, index) => (
                                    <li key={`tip-${index}`} className="flex items-start bg-white p-2 rounded-md">
                                      <span className="text-blue-500 mr-2">💡</span>
                                      <span>{tip}</span>
                                    </li>
                                  ))}
                                </ul>
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
            
            {filteredNeighborhoods.length === 0 && (
              <tr>
                <td colSpan="5" className="px-6 py-10 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No neighborhoods found</h3>
                  <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filters.</p>
                  <div className="mt-6">
                    <button
                      type="button"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      onClick={() => {
                        setSearchTerm('');
                        setFilterCategory('all');
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
    </div>
  );
};

export default NeighborhoodsList;