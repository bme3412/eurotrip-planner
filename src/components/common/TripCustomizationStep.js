'use client';

import React, { useState } from 'react';
import { Globe, MapPin, Calendar, Info, ChevronRight, ArrowRight, ChevronUp, ChevronDown } from 'lucide-react';

/**
 * Trip Customization Step Component
 * Based on UI mockup for step 3 with cleaner formatting
 */
const TripCustomizationStep = ({
  countries,
  selectedCountries,
  setSelectedCountries,
  infoPreferences,
  setInfoPreferences,
  dateType,
  exactDates,
  month,
  startCity,
  goToPreviousStep,
  onSubmit,
  isSearching
}) => {
  const [isMinimized, setIsMinimized] = useState(false);

  // Handle country selection/deselection
  const handleCountrySelect = (country) => {
    setSelectedCountries((prev) => {
      if (prev.includes(country)) {
        return prev.filter((c) => c !== country);
      } else {
        return [...prev, country];
      }
    });
  };

  // Handle info preference toggles
  const handleInfoPreferenceToggle = (preference) => {
    setInfoPreferences((prev) => ({
      ...prev,
      [preference]: !prev[preference],
    }));
  };

  // Check if any info preferences are selected
  const hasInfoPreferencesSelected = () => {
    return Object.values(infoPreferences).some((value) => value === true);
  };

  // Check if ready to submit
  const isReadyToSubmit = selectedCountries.length > 0 && hasInfoPreferencesSelected();

  return (
    <div className="space-y-6">
      {/* Header with step indicator and minimize button */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-medium flex items-center">
          <Globe className="w-6 h-6 mr-2 text-blue-600" />
          <span>Customize your trip</span>
        </h3>
        <div className="flex items-center space-x-3">
          <div className="text-blue-600 font-medium">
            Step 3 of 3
          </div>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            aria-label={isMinimized ? "Expand" : "Minimize"}
          >
            {isMinimized ? (
              <ChevronDown className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronUp className="w-5 h-5 text-gray-600" />
            )}
          </button>
        </div>
      </div>

      {isMinimized ? (
        // Minimized view with summary
        <div className="bg-blue-50 p-4 rounded-xl flex justify-between items-center">
          <div className="flex items-center space-x-4 text-blue-800">
            <span className="flex items-center">
              <Globe className="w-5 h-5 mr-1.5" />
              <span>{selectedCountries.length} countries selected</span>
            </span>
            {hasInfoPreferencesSelected() && (
              <span className="flex items-center">
                <Info className="w-5 h-5 mr-1.5" />
                <span>Ready to search</span>
              </span>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg flex items-center space-x-1 hover:bg-gray-300 transition-colors"
              onClick={goToPreviousStep}
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
              <span>Back</span>
            </button>

            {isReadyToSubmit && (
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center space-x-1 hover:bg-blue-700 transition-colors"
                onClick={onSubmit}
                disabled={isSearching}
              >
                <span>Find Adventure</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            )}
          </div>
        </div>
      ) : (
        // Expanded view with all options
        <>
          {/* Where else would you like to visit section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Globe className="w-5 h-5 text-blue-600" />
              <h4 className="text-lg font-medium">
                <span className="font-bold">Where</span>else would you like to visit?
                {selectedCountries.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-sm rounded-full">
                    {selectedCountries.length} selected
                  </span>
                )}
              </h4>
            </div>

            {/* Country selection grid */}
            <div className="grid grid-cols-3 gap-2">
              {countries.map((country) => (
                <button
                  key={country}
                  className={`py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-between ${
                    selectedCountries.includes(country)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                  onClick={() => handleCountrySelect(country)}
                >
                  <span className="text-base">{country}</span>
                  {selectedCountries.includes(country) && (
                    <span className="ml-2 flex-shrink-0 w-5 h-5 bg-white text-blue-600 rounded-full flex items-center justify-center text-xs">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* What information would you like section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Info className="w-5 h-5 text-blue-600" />
              <h4 className="text-lg font-medium">
                <span className="font-bold">What</span>information would you like?
              </h4>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <button
                className={`py-4 px-3 rounded-xl transition-all duration-200 flex flex-col items-center justify-center gap-2 ${
                  infoPreferences.cityGuides
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
                onClick={() => handleInfoPreferenceToggle('cityGuides')}
              >
                <MapPin className="w-6 h-6" />
                <span className="text-base">City Guides</span>
              </button>

              <button
                className={`py-4 px-3 rounded-xl transition-all duration-200 flex flex-col items-center justify-center gap-2 ${
                  infoPreferences.dayTrips
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
                onClick={() => handleInfoPreferenceToggle('dayTrips')}
              >
                <Calendar className="w-6 h-6" />
                <span className="text-base">Day Trips</span>
              </button>

              <button
                className={`py-4 px-3 rounded-xl transition-all duration-200 flex flex-col items-center justify-center gap-2 ${
                  infoPreferences.itineraries
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
                onClick={() => handleInfoPreferenceToggle('itineraries')}
              >
                <Globe className="w-6 h-6" />
                <span className="text-base">Itineraries</span>
              </button>
            </div>
          </div>

          {/* Trip summary section */}
          {isReadyToSubmit && (
            <div className="bg-blue-50 p-5 rounded-xl">
              <h4 className="text-lg font-medium text-blue-800 mb-4">
                Trip Summary
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start space-x-3">
                  <Calendar className="w-5 h-5 mt-0.5 text-blue-600 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-blue-800">When:</p>
                    <p className="text-blue-700">
                      {dateType === 'exact'
                        ? `${exactDates.start} to ${exactDates.end}`
                        : `${month}`}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Globe className="w-5 h-5 mt-0.5 text-blue-600 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-blue-800">Also visiting:</p>
                    <p className="text-blue-700">
                      {selectedCountries.length} countries
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <MapPin className="w-5 h-5 mt-0.5 text-blue-600 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-blue-800">Starting in:</p>
                    <p className="text-blue-700">{startCity}</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Info className="w-5 h-5 mt-0.5 text-blue-600 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-blue-800">Information:</p>
                    <p className="text-blue-700">
                      {Object.entries(infoPreferences)
                        .filter(([_, isSelected]) => isSelected)
                        .map(([key]) => {
                          switch(key) {
                            case 'cityGuides': return 'City Guides';
                            case 'dayTrips': return 'Day Trips';
                            case 'itineraries': return 'Itineraries';
                            default: return key;
                          }
                        })
                        .join(', ')}
                    </p>
                  </div>
                </div>
              </div>
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

            {isReadyToSubmit && (
              <button
                className={`px-6 py-3 bg-blue-600 text-white rounded-lg flex items-center space-x-2 shadow-md hover:bg-blue-700 transition-colors duration-200 font-medium ${
                  isSearching ? 'opacity-80 cursor-not-allowed' : ''
                }`}
                onClick={onSubmit}
                disabled={isSearching}
              >
                {isSearching ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>Find My Adventure</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default TripCustomizationStep;