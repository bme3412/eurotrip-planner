'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MapPin, X, ChevronRight } from 'lucide-react';

/**
 * City Selection Step Component
 * Improved based on UI mockup with better search functionality
 */
const CitySelectionStep = ({ popularCities, startCity, setStartCity, goToNextStep, goToPreviousStep }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCities, setFilteredCities] = useState([]);
  const searchInputRef = useRef(null);

  // Filter cities when search term changes
  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = popularCities.filter((city) =>
        city.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCities(filtered);
    } else {
      setFilteredCities([]);
    }
  }, [searchTerm, popularCities]);

  // Handle selecting a city
  const handleCitySelect = (city) => {
    setStartCity(city);
    setSearchTerm(city);
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchTerm('');
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with step indicator */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-medium text-blue-600 flex items-center">
          <MapPin className="w-6 h-6 mr-2" />
          <span>Where</span>
          <span className="text-gray-800 ml-2">will you start your journey?</span>
        </h3>
        <div className="text-blue-600 font-medium">
          Step 2 of 3
        </div>
      </div>

      {/* Enhanced search input with clear button */}
      <div className="relative">
        <div className="relative">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search for a city..."
            className="w-full p-4 border border-gray-300 rounded-xl pl-12 pr-12 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-lg"
            onChange={handleSearchChange}
            value={searchTerm}
          />
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
            <MapPin className="w-5 h-5 text-gray-400" />
          </div>

          {searchTerm && (
            <button
              onClick={handleClearSearch}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          )}
        </div>

        {/* Search results dropdown */}
        {searchTerm && filteredCities.length > 0 && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-xl shadow-lg max-h-80 overflow-y-auto">
            {filteredCities.map((city) => (
              <button
                key={city}
                className="w-full text-left px-4 py-3 hover:bg-blue-50 focus:bg-blue-50 transition-colors flex items-center border-b border-gray-100 last:border-0"
                onClick={() => handleCitySelect(city)}
              >
                <MapPin className="w-5 h-5 mr-3 text-blue-500" />
                <span className="text-gray-800 text-lg">{city}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected city indicator */}
      {startCity && (
        <div className="bg-blue-50 p-4 rounded-xl">
          <p className="text-blue-800 flex items-center text-lg">
            <MapPin className="w-5 h-5 mr-2 text-blue-600" />
            Starting in: <span className="font-bold ml-2">{startCity}</span>
          </p>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex justify-between pt-4">
        <button
          className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg flex items-center space-x-2 shadow-sm hover:bg-gray-300 transition-colors duration-200 font-medium"
          onClick={goToPreviousStep}
        >
          <ChevronRight className="w-5 h-5 rotate-180" />
          <span>Back</span>
        </button>

        {startCity && (
          <button
            className="px-6 py-3 bg-blue-600 text-white rounded-lg flex items-center space-x-2 shadow-md hover:bg-blue-700 transition-colors duration-200 font-medium"
            onClick={goToNextStep}
          >
            <span>Next</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default CitySelectionStep;