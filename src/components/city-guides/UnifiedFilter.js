'use client';

import React, { useState, useEffect, useRef } from 'react';
import { regionThemes, tourismRegions } from './regionData';

const UnifiedFilter = ({
  selectedRegion,
  selectedCountries,
  handleRegionChange,
  handleCountryChange,
  countries = [],
  searchTerm,
  onSearchChange,
  onClearFilters,
  activeFilterType,
  onFilterTypeChange,
  rightExtras,
}) => {
  // Use the prop directly - no internal state needed
  const currentFilterType = activeFilterType || 'euro-region';
  const setCurrentFilterType = onFilterTypeChange;
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const countryDropdownRef = useRef(null);

  // Close country dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target)) {
        setIsCountryDropdownOpen(false);
      }
    };

    if (isCountryDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCountryDropdownOpen]);

  // Consolidated Euro-region filter options - refined to eliminate overlap
  const getEuroRegionOptions = () => {
    return [
      'All Regions',
      'Benelux',
      'Alpine', 
      'Mediterranean',
      'The Nordics',
      'Central Europe',
      'Historic Capitals',
      'Beach Destinations'
    ];
  };

  // Travel experience options - updated to match actual tourismCategories in city data
  const getTravelStyleOptions = () => {
    return [
      'All Experiences',
      'Cultural',
      'Historical Landmarks',
      'Food & Wine',
      'Wine Regions',
      'Urban Exploration',
      'Nightlife',
      'Shopping',
      'Family',
      'Romance',
      'Adventure',
      'Relaxation',
      'Beach Destinations',
      'Gastronomic Destinations',
      'Cultural Tourism Hubs',
      'Natural Landscapes',
      'Adventure Travel'
    ];
  };

  const handleFilterTypeChange = (filterType) => {
    setCurrentFilterType(filterType);
    handleRegionChange(filterType === 'euro-region' ? 'All Regions' : 'All Experiences', filterType);
  };

  const getCountryButtonLabel = () => {
    if (!selectedCountries || selectedCountries.length === 0) {
      return 'All Countries';
    }
    if (selectedCountries.length === 1) {
      return selectedCountries[0];
    }
    return `${selectedCountries.length} Countries`;
  };

  const hasActiveFilters = (selectedRegion !== 'All' && selectedRegion !== 'All Regions' && selectedRegion !== 'All Experiences') || selectedCountries.length > 0 || searchTerm;

  // Get filter options based on active filter type
  const getFilterOptions = () => {
    switch (currentFilterType) {
      case 'euro-region':
        return getEuroRegionOptions();
      case 'travel-experience':
        return getTravelStyleOptions();
      default:
        return getEuroRegionOptions();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 md:p-5 transition-all duration-300">
      {/* Top row: search + tabs + countries */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search Bar - responsive width */}
        <div className="w-full sm:w-64">
          <div className="relative">
            <input
              type="text"
              placeholder="Search cities..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
              aria-label="Search cities by name, country, or description"
            />
            <svg
              className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {/* Filter Type Tabs */}
        <div className="bg-gray-100 p-1.5 rounded-lg w-full sm:w-auto">
          <div className="flex space-x-1.5">
            <button
              onClick={() => handleFilterTypeChange('euro-region')}
              className={`
                flex-1 sm:flex-none px-4 sm:px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ease-in-out
                ${currentFilterType === 'euro-region'
                  ? 'bg-white text-blue-600 shadow-md'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                }
              `}
              aria-label="Filter by European regions"
              aria-pressed={currentFilterType === 'euro-region'}
            >
              🗺️ Regions
            </button>
            <button
              onClick={() => handleFilterTypeChange('travel-experience')}
              className={`
                flex-1 sm:flex-none px-4 sm:px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ease-in-out
                ${currentFilterType === 'travel-experience'
                  ? 'bg-white text-blue-600 shadow-md'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                }
              `}
              aria-label="Filter by travel experiences"
              aria-pressed={currentFilterType === 'travel-experience'}
            >
              ✈️ Experiences
            </button>
          </div>
        </div>

        {/* Country Filter — sits immediately after the tabs */}
        <div className="relative w-full sm:w-auto" ref={countryDropdownRef}>
          <button
            onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
            className="w-full sm:w-auto px-4 py-2.5 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm flex items-center justify-between space-x-2 font-medium"
            aria-label="Filter by country"
            aria-expanded={isCountryDropdownOpen}
            aria-haspopup="true"
          >
            <span className="text-gray-900">{getCountryButtonLabel()}</span>
            <svg
              className={`h-4 w-4 text-gray-400 transition-transform ${
                isCountryDropdownOpen ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isCountryDropdownOpen && (
            <div className="absolute z-50 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-y-auto min-w-48 md:min-w-56">
              <div className="py-2">
                {/* All Countries option */}
                <button
                  onClick={() => {
                    // Clear all country selections
                    handleCountryChange('clear-all');
                  }}
                  className="w-full flex items-center justify-between px-4 py-2 text-left hover:bg-gray-50 transition-colors text-sm border-b border-gray-100"
                >
                  <span className="text-gray-900 font-medium">All Countries</span>
                  <div className="flex items-center">
                    {selectedCountries.length === 0 && (
                      <svg className="h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                    {selectedCountries.length > 0 && (
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>
                </button>
                
                {/* Individual countries with checkboxes */}
                {countries.map((country) => {
                  const isSelected = selectedCountries.includes(country);
                  return (
                    <button
                      key={country}
                      onClick={() => {
                        handleCountryChange(country);
                        // Keep dropdown open for multi-select
                      }}
                      className="w-full flex items-center justify-between px-4 py-2 text-left hover:bg-gray-50 transition-colors text-sm"
                    >
                      <span className="text-gray-900">{country}</span>
                      <div className="flex items-center">
                        {isSelected ? (
                          <svg className="h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <div className="h-4 w-4 border-2 border-gray-300 rounded"></div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="ml-auto px-4 py-2.5 text-sm text-blue-600 hover:text-blue-800 font-semibold hover:bg-blue-50 rounded-lg transition-colors"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Second row: filter option chips */}
      <div className="mt-5 transition-all duration-300 ease-in-out">
        <div
          className="flex flex-wrap gap-2.5 transition-all duration-300 ease-in-out"
          key={currentFilterType} // Force re-render for smooth transition
        >
          {getFilterOptions().map((option) => {
            const isSelected = 
              currentFilterType === 'euro-region' 
                ? selectedRegion === option 
                : selectedRegion === option;
            
            return (
              <button
                key={option}
                onClick={() => {
                  handleRegionChange(option, currentFilterType);
                }}
                className={`
                  relative px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ease-in-out
                  ${isSelected
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-200 transform scale-105 ring-2 ring-blue-300 ring-offset-1'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:border-gray-300 hover:shadow-md hover:scale-102'
                  }
                `}
                aria-pressed={isSelected}
                aria-label={`Filter by ${option}`}
              >
                {isSelected && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                  </span>
                )}
                {option}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <div className="flex flex-wrap gap-2">
            {selectedRegion !== 'All' && selectedRegion !== 'All Regions' && selectedRegion !== 'All Experiences' && (
              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm bg-blue-100 text-blue-800">
                {currentFilterType === 'euro-region' ? 'Region' : 'Experience'}: {selectedRegion}
                <button
                  onClick={() => handleRegionChange(currentFilterType === 'euro-region' ? 'All Regions' : 'All Experiences', currentFilterType)}
                  className="ml-2 hover:text-blue-600"
                >
                  ×
                </button>
              </span>
            )}
            {selectedCountries.map((country) => (
              <span key={country} className="inline-flex items-center px-3 py-1.5 rounded-full text-sm bg-green-100 text-green-800">
                {country}
                <button
                  onClick={() => handleCountryChange(country)}
                  className="ml-2 hover:text-green-600"
                >
                  ×
                </button>
              </span>
            ))}
            {searchTerm && (
              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm bg-purple-100 text-purple-800">
                &ldquo;{searchTerm}&rdquo;
                <button
                  onClick={() => onSearchChange('')}
                  className="ml-2 hover:text-purple-600"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedFilter; 