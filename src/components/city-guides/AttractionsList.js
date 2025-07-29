'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

const AttractionsList = ({ attractions, categories, cityName, monthlyData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedAttractions, setExpandedAttractions] = useState({});
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [dateFilterType, setDateFilterType] = useState('none'); // 'none', 'exact', 'range', 'month'
  const [selectedDate, setSelectedDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');
  
  // Month options for filtering
  const months = [
    { value: 'all', label: 'All Year', icon: '📅' },
    { value: 'january', label: 'January', icon: '❄️' },
    { value: 'february', label: 'February', icon: '❄️' },
    { value: 'march', label: 'March', icon: '🌸' },
    { value: 'april', label: 'April', icon: '🌸' },
    { value: 'may', label: 'May', icon: '🌺' },
    { value: 'june', label: 'June', icon: '☀️' },
    { value: 'july', label: 'July', icon: '☀️' },
    { value: 'august', label: 'August', icon: '☀️' },
    { value: 'september', label: 'September', icon: '🍂' },
    { value: 'october', label: 'October', icon: '🍂' },
    { value: 'november', label: 'November', icon: '🍁' },
    { value: 'december', label: 'December', icon: '❄️' }
  ];

  // Get month from date
  const getMonthFromDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const monthNames = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'
    ];
    return monthNames[date.getMonth()];
  };

  // Check if date is in range
  const isDateInRange = (dateString, start, end) => {
    if (!dateString || !start || !end) return false;
    const date = new Date(dateString);
    const startDate = new Date(start);
    const endDate = new Date(end);
    return date >= startDate && date <= endDate;
  };

  // Seasonal scoring system
  const getSeasonalScore = (attraction, month) => {
    if (month === 'all') return 0;
    
    let score = 0;
    const monthData = monthlyData?.[month.charAt(0).toUpperCase() + month.slice(1)];
    
    if (!monthData) return 0;

    // Check if attraction is indoor/outdoor and weather considerations
    if (attraction.indoor === false) {
      // Outdoor attractions get seasonal consideration
      const weather = monthData.first_half?.weather || monthData.second_half?.weather;
      if (weather) {
        const temp = weather.average_temperature;
        if (temp) {
          const highTemp = temp.high_celsius || parseInt(temp.high);
          const lowTemp = temp.low_celsius || parseInt(temp.low);
          const avgTemp = (highTemp + lowTemp) / 2;
          
          // Score based on temperature comfort
          if (avgTemp >= 15 && avgTemp <= 25) score += 3; // Ideal temperature
          else if (avgTemp >= 10 && avgTemp <= 30) score += 2; // Good temperature
          else if (avgTemp >= 5 && avgTemp <= 35) score += 1; // Acceptable temperature
        }
      }
    }

    // Check for seasonal notes that mention the attraction
    const seasonalNotes = monthData.first_half?.seasonal_notes || monthData.second_half?.seasonal_notes || '';
    if (seasonalNotes.toLowerCase().includes(attraction.name.toLowerCase())) {
      score += 2;
    }

    // Check attraction's seasonal notes
    if (attraction.seasonal_notes) {
      const attractionSeasonalNotes = attraction.seasonal_notes.toLowerCase();
      const monthKeywords = {
        'january': ['winter', 'cold', 'snow'],
        'february': ['winter', 'cold', 'snow'],
        'march': ['spring', 'bloom', 'mild'],
        'april': ['spring', 'bloom', 'cherry', 'mild'],
        'may': ['spring', 'bloom', 'warm'],
        'june': ['summer', 'warm', 'sunny'],
        'july': ['summer', 'hot', 'peak'],
        'august': ['summer', 'hot', 'peak'],
        'september': ['autumn', 'fall', 'mild'],
        'october': ['autumn', 'fall', 'cool'],
        'november': ['autumn', 'fall', 'cold'],
        'december': ['winter', 'cold', 'christmas']
      };
      
      const monthKeywordsList = monthKeywords[month] || [];
      monthKeywordsList.forEach(keyword => {
        if (attractionSeasonalNotes.includes(keyword)) {
          score += 1;
        }
      });
    }

    return score;
  };

  // Get effective month for scoring
  const getEffectiveMonth = () => {
    if (dateFilterType === 'exact' && selectedDate) {
      return getMonthFromDate(selectedDate);
    } else if (dateFilterType === 'range' && startDate && endDate) {
      // Use the start date for scoring (could be enhanced to average across range)
      return getMonthFromDate(startDate);
    } else if (dateFilterType === 'month') {
      return selectedMonth;
    }
    return 'all';
  };

  // Toggle expanded state for an attraction
  const toggleExpanded = (attractionId) => {
    setExpandedAttractions(prev => ({
      ...prev,
      [attractionId]: !prev[attractionId]
    }));
  };
  
  // Filter and sort attractions
  const filteredAttractions = attractions
    .filter(attraction => 
      searchTerm === '' || attraction.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      attraction.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .map(attraction => ({
      ...attraction,
      seasonalScore: getSeasonalScore(attraction, getEffectiveMonth())
    }))
    .sort((a, b) => {
      // Always sort by seasonal score when date filtering is active
      if (dateFilterType !== 'none') {
        return (b.seasonalScore || 0) - (a.seasonalScore || 0);
      }
      // Default sort by cultural significance
      return (b.ratings?.cultural_significance || 0) - (a.ratings?.cultural_significance || 0);
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

  // Get seasonal score color
  const getSeasonalScoreColor = (score) => {
    if (score >= 5) return 'bg-green-100 text-green-800';
    if (score >= 3) return 'bg-blue-100 text-blue-800';
    if (score >= 1) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-600';
  };

  // Get date filter display text
  const getDateFilterDisplay = () => {
    switch (dateFilterType) {
      case 'exact':
        return selectedDate ? `📅 ${new Date(selectedDate).toLocaleDateString()}` : '📅 Select Date';
      case 'range':
        return (startDate && endDate) ? `📅 ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}` : '📅 Select Date Range';
      case 'month':
        const month = months.find(m => m.value === selectedMonth);
        return month ? `${month.icon} ${month.label}` : '📅 Select Month';
      default:
        return '📅 No Date Filter';
    }
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
        
          {/* Date Filter Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Filter Type</label>
              <select 
                className="p-3 border rounded-xl w-full bg-white shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={dateFilterType}
                onChange={(e) => setDateFilterType(e.target.value)}
              >
                <option value="none">No Date Filter</option>
                <option value="exact">Exact Date</option>
                <option value="range">Date Range</option>
                <option value="month">Month</option>
              </select>
            </div>

            {/* Conditional date inputs based on filter type */}
            {dateFilterType === 'exact' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
                <input
                  type="date"
                  className="p-3 border rounded-xl w-full bg-white shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
            )}

            {dateFilterType === 'range' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    className="p-3 border rounded-xl w-full bg-white shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <input
                    type="date"
                    className="p-3 border rounded-xl w-full bg-white shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </>
            )}

            {dateFilterType === 'month' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Month</label>
                <select
                  className="p-3 border rounded-xl w-full bg-white shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                >
                  {months.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.icon} {month.label}
                    </option>
                  ))}
                </select>
              </div>
            )}


          </div>

          {/* Current filter display */}
          {dateFilterType !== 'none' && (
            <div className="bg-blue-100 p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-800">
                  {getDateFilterDisplay()}
                </span>
                <button
                  onClick={() => {
                    setDateFilterType('none');
                    setSelectedDate('');
                    setStartDate('');
                    setEndDate('');
                    setSelectedMonth('all');
                  }}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Clear Filter
                </button>
              </div>
            </div>
          )}

          {/* View mode toggle */}
          <div className="flex justify-between items-center">
            <div className="flex space-x-2">
              <button
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => setViewMode('grid')}
              >
                Grid View
              </button>
              <button
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => setViewMode('list')}
              >
                List View
              </button>
            </div>
            
            <div className="text-sm text-gray-600">
              {filteredAttractions.length} attraction{filteredAttractions.length !== 1 ? 's' : ''} found
            </div>
          </div>
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
                      {dateFilterType !== 'none' && attraction.seasonalScore !== undefined && (
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeasonalScoreColor(attraction.seasonalScore)}`}>
                          {attraction.seasonalScore}★
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

                      {dateFilterType !== 'none' && attraction.seasonalScore !== undefined && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Seasonal Appeal</h4>
                          <div className="flex items-center space-x-2">
                            <span className={`px-3 py-1 text-sm font-medium rounded-full ${getSeasonalScoreColor(attraction.seasonalScore)}`}>
                              {attraction.seasonalScore} out of 5 stars
                            </span>
                            <span className="text-sm text-gray-600">
                              for {getDateFilterDisplay()}
                            </span>
                          </div>
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
                      {dateFilterType !== 'none' && attraction.seasonalScore !== undefined && (
                        <div className="text-center">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeasonalScoreColor(attraction.seasonalScore)}`}>
                            {attraction.seasonalScore}★
                          </span>
                          <div className="text-xs text-gray-500 mt-1">Seasonal</div>
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

                    {dateFilterType !== 'none' && attraction.seasonalScore !== undefined && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="font-medium text-gray-900 mb-2">Seasonal Appeal</h4>
                        <div className="flex items-center space-x-2">
                          <span className={`px-3 py-1 text-sm font-medium rounded-full ${getSeasonalScoreColor(attraction.seasonalScore)}`}>
                            {attraction.seasonalScore} out of 5 stars
                          </span>
                          <span className="text-sm text-gray-600">
                            for {getDateFilterDisplay()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      
      {/* Empty State */}
      {filteredAttractions.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No attractions found</h3>
          <p className="text-gray-500">Try adjusting your filters or search terms</p>
        </div>
      )}
    </div>
  );
};

export default AttractionsList;