'use client';

import React, { useMemo, useCallback } from 'react';
import Image from 'next/image';
import { useFilterState, useDateFilter } from '@/hooks/useFilterState';
import { useUIState } from '@/hooks/useUIState';
import { useMonthlyData } from '@/hooks/useMonthlyData';

/**
 * Refactored AttractionsList component using custom hooks
 * Demonstrates improved state management and reduced complexity
 */
const AttractionsListRefactored = ({ attractions, categories, cityName, country, monthlyData: propMonthlyData }) => {
  // Use custom hooks for state management
  const { filterState, filterActions, filterUtils } = useFilterState({
    viewMode: 'grid',
    sortBy: 'seasonal'
  });

  const { actions: uiActions, utils: uiUtils } = useUIState();
  const { months, isDateInMonth } = useDateFilter();
  
  // Use monthly data hook if no data provided via props
  const { monthlyData: hookMonthlyData, getSeasonalScore } = useMonthlyData(country, cityName);
  const effectiveMonthlyData = propMonthlyData || hookMonthlyData;

  // Memoized seasonal scoring function
  const calculateAttractionScore = useCallback((attraction, month) => {
    if (month === 'all') return 0;
    
    // Use the hook's scoring system if available, otherwise fallback to basic scoring
    if (getSeasonalScore) {
      return getSeasonalScore(month, {
        weatherWeight: attraction.indoor === false ? 0.5 : 0.1,
        crowdsWeight: 0.3,
        pricesWeight: 0.2
      });
    }

    // Fallback basic scoring
    let score = 0;
    const monthData = effectiveMonthlyData?.[month.charAt(0).toUpperCase() + month.slice(1)];
    
    if (!monthData) return 0;

    // Basic weather consideration for outdoor attractions
    if (attraction.indoor === false) {
      const weather = monthData.first_half?.weather || monthData.second_half?.weather;
      if (weather?.average_temperature) {
        const temp = weather.average_temperature;
        const avgTemp = (temp.high_celsius + temp.low_celsius) / 2;
        if (avgTemp >= 15 && avgTemp <= 25) score += 3;
        else if (avgTemp >= 10 && avgTemp <= 30) score += 2;
        else if (avgTemp >= 5 && avgTemp <= 35) score += 1;
      }
    } else {
      // Indoor attractions get consistent moderate score
      score += 2;
    }

    return score;
  }, [effectiveMonthlyData, getSeasonalScore]);

  // Get effective month for filtering
  const getEffectiveMonth = useCallback(() => {
    const { dateFilter } = filterState;
    
    if (dateFilter.type === 'exact' && dateFilter.selectedDate) {
      const date = new Date(dateFilter.selectedDate);
      const monthNames = [
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december'
      ];
      return monthNames[date.getMonth()];
    } else if (dateFilter.type === 'month') {
      return dateFilter.month;
    }
    return 'all';
  }, [filterState]);

  // Memoized filtered and sorted attractions
  const processedAttractions = useMemo(() => {
    const { searchTerm, categoryFilter, dateFilter } = filterState;
    const effectiveMonth = getEffectiveMonth();

    return attractions
      .filter(attraction => {
        // Search filter
        if (searchTerm && !attraction.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
            !attraction.description?.toLowerCase().includes(searchTerm.toLowerCase())) {
          return false;
        }

        // Category filter
        if (categoryFilter !== 'all' && attraction.category !== categoryFilter) {
          return false;
        }

        // Date filter
        if (dateFilter.type === 'exact' && dateFilter.selectedDate) {
          if (attraction.available_dates && !attraction.available_dates.includes(dateFilter.selectedDate)) {
            return false;
          }
        } else if (dateFilter.type === 'month' && dateFilter.month !== 'all') {
          if (attraction.available_dates) {
            const hasMatchingDate = attraction.available_dates.some(date => 
              isDateInMonth(date, dateFilter.month)
            );
            if (!hasMatchingDate) return false;
          }
        }

        return true;
      })
      .map(attraction => ({
        ...attraction,
        seasonalScore: calculateAttractionScore(attraction, effectiveMonth)
      }))
      .sort((a, b) => {
        switch (filterState.sortBy) {
          case 'seasonal':
            return b.seasonalScore - a.seasonalScore || a.name.localeCompare(b.name);
          case 'name':
            return a.name.localeCompare(b.name);
          case 'category':
            return (a.category || '').localeCompare(b.category || '') || a.name.localeCompare(b.name);
          case 'popularity':
            return (b.popularity || 0) - (a.popularity || 0) || a.name.localeCompare(b.name);
          default:
            return 0;
        }
      });
  }, [attractions, filterState, calculateAttractionScore, getEffectiveMonth, isDateInMonth]);

  // Handle view mode toggle
  const handleViewModeChange = useCallback((mode) => {
    filterActions.setViewMode(mode);
  }, [filterActions]);

  // Handle category filter change
  const handleCategoryChange = useCallback((category) => {
    filterActions.setCategoryFilter(category);
  }, [filterActions]);

  // Handle date filter changes
  const handleDateFilterChange = useCallback((type, value) => {
    filterActions.setDateFilter({ type, [type === 'month' ? 'month' : 'selectedDate']: value });
  }, [filterActions]);

  // Render filter controls
  const renderFilterControls = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex flex-wrap gap-4 items-center justify-between">
        {/* Search */}
        <div className="flex-1 min-w-64">
          <input
            type="text"
            placeholder="Search attractions..."
            value={filterState.searchTerm}
            onChange={(e) => filterActions.setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Category Filter */}
        <select
          value={filterState.categoryFilter}
          onChange={(e) => handleCategoryChange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Categories</option>
          {categories.map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>

        {/* Month Filter */}
        <select
          value={filterState.dateFilter.month}
          onChange={(e) => handleDateFilterChange('month', e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          {months.map(month => (
            <option key={month.value} value={month.value}>
              {month.icon} {month.label}
            </option>
          ))}
        </select>

        {/* Sort Options */}
        <select
          value={filterState.sortBy}
          onChange={(e) => filterActions.bulkUpdate({ sortBy: e.target.value })}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="seasonal">Best for Selected Time</option>
          <option value="name">Name A-Z</option>
          <option value="category">Category</option>
          <option value="popularity">Popularity</option>
        </select>

        {/* View Mode Toggle */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => handleViewModeChange('grid')}
            className={`px-3 py-1 rounded ${
              filterState.viewMode === 'grid' 
                ? 'bg-white shadow text-blue-600' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <span className="text-sm">🏗️ Grid</span>
          </button>
          <button
            onClick={() => handleViewModeChange('list')}
            className={`px-3 py-1 rounded ${
              filterState.viewMode === 'list' 
                ? 'bg-white shadow text-blue-600' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <span className="text-sm">📋 List</span>
          </button>
        </div>
      </div>

      {/* Active Filters Display */}
      {filterUtils.hasActiveFilters() && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-gray-600">Active filters:</span>
            {filterUtils.getFilterSummary().map((filter, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
              >
                {filter}
              </span>
            ))}
            <button
              onClick={filterActions.resetFilters}
              className="text-xs text-red-600 hover:text-red-800 underline ml-2"
            >
              Clear all
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // Render individual attraction card
  const renderAttractionCard = useCallback((attraction) => {
    const isExpanded = uiUtils.isExpanded(attraction.id);
    const seasonalBadge = attraction.seasonalScore > 2 ? '🌟 Great Time!' : 
                         attraction.seasonalScore > 1 ? '👍 Good Time' : '';

    return (
      <div 
        key={attraction.id}
        className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden transition-all duration-200 hover:shadow-md ${
          filterState.viewMode === 'list' ? 'flex' : ''
        }`}
      >
        {/* Image */}
        {attraction.image && (
          <div className={`${filterState.viewMode === 'list' ? 'w-48 flex-shrink-0' : 'w-full h-48'} relative`}>
            <Image
              src={attraction.image}
              alt={attraction.name}
              fill
              className="object-cover"
              sizes={filterState.viewMode === 'list' ? '192px' : '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'}
            />
            {seasonalBadge && (
              <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                {seasonalBadge}
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className={`p-4 ${filterState.viewMode === 'list' ? 'flex-1' : ''}`}>
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{attraction.name}</h3>
            {attraction.category && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                {attraction.category}
              </span>
            )}
          </div>

          {attraction.description && (
            <p className={`text-gray-600 mb-3 ${isExpanded ? '' : 'line-clamp-2'}`}>
              {attraction.description}
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            {attraction.description && attraction.description.length > 100 && (
              <button
                onClick={() => uiActions.toggleExpansion(attraction.id)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                {isExpanded ? 'Show Less' : 'Read More'}
              </button>
            )}
            
            {attraction.website && (
              <a
                href={attraction.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Visit Website →
              </a>
            )}
          </div>

          {/* Additional Info */}
          {isExpanded && (
            <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
              {attraction.address && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Address:</span> {attraction.address}
                </p>
              )}
              {attraction.hours && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Hours:</span> {attraction.hours}
                </p>
              )}
              {attraction.price && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Price:</span> {attraction.price}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }, [filterState.viewMode, uiUtils, uiActions]);

  // Render results
  const renderResults = () => {
    if (processedAttractions.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">🎯</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No attractions found</h3>
          <p className="text-gray-600 mb-4">
            Try adjusting your filters or search terms.
          </p>
          {filterUtils.hasActiveFilters() && (
            <button
              onClick={filterActions.resetFilters}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear all filters
            </button>
          )}
        </div>
      );
    }

    return (
      <div className={`${
        filterState.viewMode === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
          : 'space-y-4'
      }`}>
        {processedAttractions.map(renderAttractionCard)}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Attractions & Experiences in {cityName}
        </h2>
        <p className="text-gray-600">
          Discover {processedAttractions.length} amazing attractions and experiences.
          {filterState.dateFilter.month !== 'all' && (
            <span className="ml-1 text-blue-600 font-medium">
              Optimized for {months.find(m => m.value === filterState.dateFilter.month)?.label}
            </span>
          )}
        </p>
      </div>

      {/* Filter Controls */}
      {renderFilterControls()}

      {/* Results */}
      {renderResults()}
    </div>
  );
};

export default AttractionsListRefactored;