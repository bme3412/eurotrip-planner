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
  onClearFilters
}) => {
  const [activeFilterType, setActiveFilterType] = useState('euro-region');
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
      'Wine Regions',
      'Historic Capitals',
      'Luxury Coastlines'
    ];
  };

  // Travel experience options
  const getTravelStyleOptions = () => {
    return [
      'All Experiences',
      'Cultural',
      'Adventure',
      'Relaxation',
      'Food & Wine',
      'Nightlife',
      'Shopping',
      'Family',
      'Romance'
    ];
  };

  const handleFilterTypeChange = (filterType) => {
    setActiveFilterType(filterType);
    handleRegionChange('All', filterType);
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

  const hasActiveFilters = selectedRegion !== 'All' || selectedCountries.length > 0 || searchTerm;

  // Get filter options based on active filter type
  const getFilterOptions = () => {
    switch (activeFilterType) {
      case 'euro-region':
        return getEuroRegionOptions();
      case 'travel-experience':
        return getTravelStyleOptions();
      default:
        return getEuroRegionOptions();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 transition-all duration-300">
      {/* Compact Horizontal Layout */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search Bar - Compact with fixed width */}
        <div className="w-48">
          <div className="relative">
            <input
              type="text"
              placeholder="Search cities..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
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

        {/* Filter Type Tabs - Larger */}
        <div className="bg-gray-100 p-1 rounded-lg">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveFilterType('euro-region')}
              className={`
                px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ease-in-out
                ${activeFilterType === 'euro-region'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
              `}
            >
              🗺️ Regions
            </button>
            <button
              onClick={() => setActiveFilterType('travel-experience')}
              className={`
                px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ease-in-out
                ${activeFilterType === 'travel-experience'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
              `}
            >
              ✈️ Experiences
            </button>
          </div>
        </div>

        {/* Country Filter - Larger */}
        <div className="relative" ref={countryDropdownRef}>
          <button
            onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
            className="px-4 py-2 border border-gray-200 rounded-md bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm flex items-center space-x-2"
          >
            <span className="text-gray-900">{getCountryButtonLabel()}</span>
            <svg
              className={`h-4 w-4 text-gray-400 transition-transform ${
                isCountryDropdownOpen ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isCountryDropdownOpen && (
            <div className="absolute z-50 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-y-auto min-w-48">
              <div className="py-2">
                {/* All Countries option */}
                <button
                  onClick={() => {
                    if (selectedCountries.length === 0) {
                      // If none selected, select all
                      handleCountryChange('All');
                    } else {
                      // If some selected, clear all
                      setSelectedCountries([]);
                    }
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
                      onClick={() => handleCountryChange(country)}
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

        {/* Clear Filters - Larger */}
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium px-3 py-2"
          >
            Clear
          </button>
        )}
      </div>

      {/* Filter Options with Smooth Transitions */}
      <div className="mt-3 transition-all duration-300 ease-in-out">
        <div 
          className="flex flex-wrap gap-2 transition-all duration-300 ease-in-out"
          key={activeFilterType} // Force re-render for smooth transition
        >
          {getFilterOptions().map((option) => {
            const isSelected = 
              activeFilterType === 'euro-region' 
                ? selectedRegion === option 
                : selectedRegion === option;
            
            return (
              <button
                key={option}
                onClick={() => {
                  if (activeFilterType === 'euro-region') {
                    handleRegionChange(option);
                  } else {
                    handleRegionChange(option);
                  }
                }}
                className={`
                  px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ease-in-out
                  ${isSelected
                    ? 'bg-blue-600 text-white shadow-md transform scale-105'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm'
                  }
                `}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Filters Display - Larger */}
      {hasActiveFilters && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex flex-wrap gap-2">
            {selectedRegion !== 'All' && (
              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm bg-blue-100 text-blue-800">
                {activeFilterType === 'euro-region' ? 'Region' : 'Experience'}: {selectedRegion}
                <button
                  onClick={() => handleRegionChange('All', activeFilterType)}
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