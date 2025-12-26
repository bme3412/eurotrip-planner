'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { regionThemes, tourismRegions } from './regionData';
import { getFlagForCountry } from '@/utils/countryFlags';

const UnifiedFilter = ({
  selectedRegion,
  selectedCountries,
  handleRegionChange,
  handleCountryChange,
  countries = [],
  cities = [],
  searchTerm,
  onSearchChange,
  onClearFilters,
  activeFilterType,
  onFilterTypeChange,
  onCitySelect,
  rightExtras,
}) => {
  // Use the prop directly - no internal state needed
  const currentFilterType = activeFilterType || 'euro-region';
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const countryDropdownRef = useRef(null);
  const searchRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Search suggestions based on input - prioritize city name matches
  const searchSuggestions = useMemo(() => {
    if (!searchTerm || searchTerm.length < 1) return [];
    const term = searchTerm.toLowerCase();
    
    // First, find cities where name STARTS with the term (highest priority)
    const startsWithName = cities.filter(city => 
      city.name.toLowerCase().startsWith(term)
    );
    
    // Then, find cities where name CONTAINS the term (but doesn't start with)
    const containsInName = cities.filter(city => 
      !city.name.toLowerCase().startsWith(term) &&
      city.name.toLowerCase().includes(term)
    );
    
    // Finally, find cities where country starts with the term
    const startsWithCountry = cities.filter(city => 
      !city.name.toLowerCase().includes(term) &&
      city.country && city.country.toLowerCase().startsWith(term)
    );
    
    // Combine results in priority order
    return [...startsWithName, ...containsInName, ...startsWithCountry].slice(0, 8);
  }, [searchTerm, cities]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target)) {
        setIsCountryDropdownOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation for search suggestions
  const handleSearchKeyDown = (e) => {
    if (!searchSuggestions.length) return;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => 
        prev < searchSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Enter' && selectedSuggestionIndex >= 0) {
      e.preventDefault();
      const selectedCity = searchSuggestions[selectedSuggestionIndex];
      if (selectedCity && onCitySelect) {
        onCitySelect(selectedCity);
      }
    } else if (e.key === 'Escape') {
      setIsSearchFocused(false);
      setSelectedSuggestionIndex(-1);
    }
  };

  // Reset suggestion index when search term changes
  useEffect(() => {
    setSelectedSuggestionIndex(-1);
  }, [searchTerm]);

  // Consolidated Euro-region filter options
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

  const getCountryButtonLabel = () => {
    if (!selectedCountries || selectedCountries.length === 0) {
      return 'All Countries';
    }
    if (selectedCountries.length === 1) {
      return selectedCountries[0];
    }
    return `${selectedCountries.length} Countries`;
  };

  const hasActiveFilters = (selectedRegion !== 'All' && selectedRegion !== 'All Regions') || selectedCountries.length > 0 || searchTerm;

  const getFilterOptions = () => {
    return getEuroRegionOptions();
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 transition-all duration-300">
      {/* Search and Country Row */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {/* Search Bar with Autocomplete */}
        <div className="flex-1 relative" ref={searchRef}>
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400"
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
            <input
              type="text"
              placeholder="Search cities..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onKeyDown={handleSearchKeyDown}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all duration-200 text-sm placeholder:text-gray-400"
              aria-label="Search cities by name, country, or description"
              autoComplete="off"
            />
            {searchTerm && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          
          {/* Search Suggestions Dropdown */}
          {isSearchFocused && searchSuggestions.length > 0 && (
            <div 
              ref={suggestionsRef}
              className="absolute z-50 left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
            >
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Suggestions</span>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {searchSuggestions.map((city, index) => (
                  <Link
                    key={city.id}
                    href={`/city-guides/${city.id}`}
                    onClick={() => {
                      setIsSearchFocused(false);
                      onSearchChange('');
                    }}
                    className={`
                      flex items-center gap-3 px-4 py-2.5 transition-colors
                      ${index === selectedSuggestionIndex 
                        ? 'bg-blue-50' 
                        : 'hover:bg-gray-50'
                      }
                    `}
                  >
                    <span className="text-xl">{getFlagForCountry(city.country)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{city.name}</div>
                      <div className="text-xs text-gray-500">{city.country}</div>
                    </div>
                    <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
              </div>
              <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
                <span className="text-xs text-gray-400">Press ↑↓ to navigate, Enter to select, Esc to close</span>
              </div>
            </div>
          )}
        </div>

        {/* Country Filter */}
        <div className="relative sm:w-44" ref={countryDropdownRef}>
          <button
            onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
            className={`
              w-full px-3 py-2.5 rounded-lg text-sm flex items-center justify-between gap-2 font-medium transition-all duration-200
              ${selectedCountries.length > 0 
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' 
                : 'bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100'
              }
            `}
            aria-label="Filter by country"
            aria-expanded={isCountryDropdownOpen}
            aria-haspopup="true"
          >
            <span className="truncate">{getCountryButtonLabel()}</span>
            <svg
              className={`h-4 w-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${
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
            <div className="absolute z-50 left-0 sm:right-0 sm:left-auto mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-80 overflow-hidden min-w-64 animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Header */}
              <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-800">Select Countries</span>
                  {selectedCountries.length > 0 && (
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                      {selectedCountries.length} selected
                    </span>
                  )}
                </div>
              </div>
              
              <div className="overflow-y-auto max-h-64">
                {/* All Countries option */}
                <button
                  onClick={() => handleCountryChange('clear-all')}
                  className={`
                    w-full flex items-center justify-between px-4 py-3 text-left transition-all duration-150 text-sm
                    ${selectedCountries.length === 0 
                      ? 'bg-blue-50 border-l-3 border-l-blue-500' 
                      : 'hover:bg-gray-50 border-l-3 border-l-transparent'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div className={`
                      w-5 h-5 rounded-full flex items-center justify-center text-xs
                      ${selectedCountries.length === 0 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'}
                    `}>
                      ✓
                    </div>
                    <span className={`font-medium ${selectedCountries.length === 0 ? 'text-blue-700' : 'text-gray-700'}`}>
                      All Countries
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">{countries.length} total</span>
                </button>
                
                {/* Divider */}
                <div className="border-t border-gray-100 mx-3"></div>
                
                {/* Individual countries */}
                <div className="py-1">
                  {countries.map((country) => {
                    const isSelected = selectedCountries.includes(country);
                    return (
                      <button
                        key={country}
                        onClick={() => handleCountryChange(country)}
                        className={`
                          w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all duration-150 text-sm
                          ${isSelected 
                            ? 'bg-emerald-50 border-l-3 border-l-emerald-500' 
                            : 'hover:bg-gray-50 border-l-3 border-l-transparent'
                          }
                        `}
                      >
                        <div className={`
                          w-5 h-5 rounded flex items-center justify-center border-2 transition-all duration-150
                          ${isSelected 
                            ? 'bg-emerald-500 border-emerald-500 text-white' 
                            : 'border-gray-300 bg-white'
                          }
                        `}>
                          {isSelected && (
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <span className={isSelected ? 'text-emerald-800 font-medium' : 'text-gray-700'}>
                          {country}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="px-4 py-3 text-sm text-red-600 hover:text-red-700 font-semibold hover:bg-red-50 rounded-xl transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear All
          </button>
        )}
      </div>

      {/* Region Filter Chips */}
      <div className="pt-3 border-t border-gray-100">
        <div className="flex flex-wrap gap-1.5">
          {getFilterOptions().map((option) => {
            const isSelected = selectedRegion === option;
            
            return (
              <button
                key={option}
                onClick={() => handleRegionChange(option, 'euro-region')}
                className={`
                  px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200
                  ${isSelected
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }
                `}
                aria-pressed={isSelected}
                aria-label={`Filter by ${option}`}
              >
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
            {selectedRegion !== 'All' && selectedRegion !== 'All Regions' && (
              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm bg-blue-100 text-blue-800">
                Region: {selectedRegion}
                <button
                  onClick={() => handleRegionChange('All Regions', 'euro-region')}
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
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedFilter; 