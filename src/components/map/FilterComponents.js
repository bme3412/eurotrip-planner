import React, { useEffect, useCallback } from 'react';
import { MONTH_NAMES_SHORT } from './constants';

/**
 * Filter toggle button component
 * @param {Object} props - Component props
 * @param {boolean} props.showFilters - Whether filters are shown
 * @param {Function} props.onToggle - Toggle handler
 * @returns {JSX.Element} - Filter toggle button
 */
export const FilterToggleButton = ({ showFilters, onToggle }) => {
  return (
    <button 
      onClick={onToggle}
      className="bg-white p-2 rounded-full shadow-md mb-2 hover:bg-gray-100"
      title={showFilters ? "Hide filters" : "Show filters"}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={showFilters ? "text-blue-500" : "text-gray-700"}>
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
      </svg>
    </button>
  );
};

/**
 * Country filter component
 * @param {Object} props - Component props
 * @param {Array<string>} props.countries - Available countries
 * @param {Array<string>} props.selectedCountries - Selected countries
 * @param {boolean} props.showDropdown - Whether dropdown is shown
 * @param {Function} props.onToggleDropdown - Dropdown toggle handler
 * @param {Function} props.onToggleCountry - Country toggle handler
 * @returns {JSX.Element} - Country filter component
 */
export const CountryFilter = ({ countries, selectedCountries, showDropdown, onToggleDropdown, onToggleCountry }) => {
  return (
    <div className="mb-4 relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">Countries</label>
      <div className="mb-2">
        <div 
          className="w-full p-2 border border-gray-300 rounded-md flex justify-between items-center cursor-pointer bg-white"
          onClick={onToggleDropdown}
        >
          <div className="flex flex-wrap gap-1 max-w-[90%] overflow-hidden">
            {selectedCountries.includes('All') 
              ? <span className="px-1">All Countries</span>
              : selectedCountries.map(country => (
                  <span key={country} className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs flex items-center">
                    {country}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleCountry(country);
                      }} 
                      className="ml-1 text-blue-500 hover:text-blue-800"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))
            }
          </div>
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform ${showDropdown ? 'transform rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {showDropdown && (
        <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto">
          {countries.map(country => (
            <div 
              key={country} 
              className={`px-3 py-2 cursor-pointer flex items-center justify-between hover:bg-gray-100 ${
                selectedCountries.includes(country) ? 'bg-blue-50' : ''
              }`}
              onClick={() => onToggleCountry(country)}
            >
              <span>{country}</span>
              {selectedCountries.includes(country) && (
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Search input component
 * @param {Object} props - Component props
 * @param {string} props.searchTerm - Current search term
 * @param {Function} props.onSearchChange - Search change handler
 * @returns {JSX.Element} - Search input component
 */
export const SearchInput = ({ searchTerm, onSearchChange }) => {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
      <input 
        type="text" 
        className="w-full p-2 border border-gray-300 rounded-md"
        placeholder="Enter city name..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
      />
    </div>
  );
};

/**
 * Date filter component
 * @param {Object} props - Component props
 * @param {Object} props.dateFilters - Date filter settings
 * @param {Function} props.onDateTypeToggle - Date type toggle handler
 * @param {Function} props.onDateChange - Date change handler
 * @param {Function} props.onMonthToggle - Month toggle handler
 * @returns {JSX.Element} - Date filter component
 */
export const DateFilter = ({ dateFilters, onDateTypeToggle, onDateChange, onMonthToggle }) => {
  const { useFlexibleDates, startDate, endDate, selectedMonths } = dateFilters;
  
  // Group months by season for quick selection
  const seasons = [
    { name: 'Winter', months: [0, 1, 11] }, // Dec, Jan, Feb
    { name: 'Spring', months: [2, 3, 4] },  // Mar, Apr, May
    { name: 'Summer', months: [5, 6, 7] },  // Jun, Jul, Aug
    { name: 'Fall', months: [8, 9, 10] },   // Sep, Oct, Nov
  ];

  // Add custom styles to improve date picker arrows
  useEffect(() => {
    // Add custom CSS to document head
    const style = document.createElement('style');
    style.textContent = `
      /* Hide default calendar icon and customize our own */
      input[type="date"]::-webkit-calendar-picker-indicator {
        opacity: 0;
        position: absolute;
        right: 0;
        top: 0;
        width: 100%;
        height: 100%;
        cursor: pointer;
      }
      
      /* Better date inputs in Firefox */
      input[type="date"] {
        position: relative;
        appearance: none;
        -moz-appearance: none;
      }
      
      /* Make calendar clickable across the entire input */
      .date-input-wrapper {
        position: relative;
      }
      
      .calendar-icon {
        position: absolute;
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
        pointer-events: none;
        z-index: 1;
      }
      
      /* Better month navigation arrows */
      .react-datepicker__navigation {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 32px;
        width: 32px;
        border-radius: 4px;
        background-color: #f3f4f6;
        border: 1px solid #d1d5db;
      }
      
      .react-datepicker__navigation:hover {
        background-color: #e5e7eb;
      }
      
      .react-datepicker__navigation-icon {
        position: relative;
        top: 0;
        display: block;
        width: 0;
        border-color: #6b7280;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const handleSeasonToggle = (seasonMonths) => {
    // If all months in the season are already selected, deselect them
    // Otherwise, select all months in the season
    const allSelected = seasonMonths.every(month => selectedMonths.includes(month));
    
    if (allSelected) {
      // Remove all months in this season
      const newSelection = selectedMonths.filter(month => !seasonMonths.includes(month));
      seasonMonths.forEach(month => onMonthToggle(month, false));
    } else {
      // Add all months in this season
      seasonMonths.forEach(month => {
        if (!selectedMonths.includes(month)) {
          onMonthToggle(month, true);
        }
      });
    }
  };
  
  /**
   * Calculate trip duration in days
   * @param {string} startDate - Start date in ISO format
   * @param {string} endDate - End date in ISO format
   * @returns {number} - Trip duration in days
   */
  const calculateTripDuration = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);
  };
  
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700">Visit Dates</label>
        <div className="flex items-center bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => useFlexibleDates && onDateTypeToggle()}
            className={`text-xs px-3 py-1 rounded-md transition-colors ${
              !useFlexibleDates ? 'bg-white shadow-sm text-blue-600 font-medium' : 'text-gray-600'
            }`}
          >
            Exact Dates
          </button>
          <button
            onClick={() => !useFlexibleDates && onDateTypeToggle()}
            className={`text-xs px-3 py-1 rounded-md transition-colors ${
              useFlexibleDates ? 'bg-white shadow-sm text-blue-600 font-medium' : 'text-gray-600'
            }`}
          >
            Flexible Dates
          </button>
        </div>
      </div>
      
      {useFlexibleDates ? (
        <div className="mt-2">
          <div className="text-sm text-gray-700 mb-2">When would you like to travel?</div>
          
          {/* Season quick-select buttons */}
          <div className="flex flex-wrap gap-2 mb-3">
            {seasons.map(season => {
              const allSelected = season.months.every(month => selectedMonths.includes(month));
              const someSelected = season.months.some(month => selectedMonths.includes(month)) && !allSelected;
              
              return (
                <button
                  key={season.name}
                  onClick={() => handleSeasonToggle(season.months)}
                  className={`text-xs py-1 px-3 rounded-md border transition-colors ${
                    allSelected 
                      ? 'bg-blue-100 border-blue-300 text-blue-800 font-medium' 
                      : someSelected
                        ? 'bg-blue-50 border-blue-200 text-blue-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {season.name}
                </button>
              );
            })}
          </div>
          
          <div className="grid grid-cols-4 gap-2">
            {MONTH_NAMES_SHORT.map((month, index) => (
              <div 
                key={month}
                onClick={() => onMonthToggle(index, !selectedMonths.includes(index))}
                className={`cursor-pointer text-center py-1.5 px-1 rounded-md text-sm transition-colors ${
                  selectedMonths.includes(index) 
                    ? 'bg-blue-100 text-blue-800 font-medium border border-blue-300' 
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {month}
              </div>
            ))}
          </div>
          {selectedMonths.length === 0 && (
            <p className="text-xs text-amber-600 mt-2 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Please select at least one month
            </p>
          )}
        </div>
      ) : (
        <div className="mt-2">
          <div className="text-sm text-gray-700 mb-3">Select your travel period:</div>
          <div className="space-y-3">
            <div className="relative date-input-wrapper">
              <label className="absolute -top-2 left-2 bg-white px-1 text-xs text-gray-500 z-10">Start Date</label>
              <input 
                type="date" 
                className="w-full p-2 pt-3 border border-gray-300 rounded-md text-sm bg-white"
                value={startDate}
                onChange={(e) => onDateChange('startDate', e.target.value)}
                style={{ minHeight: '45px' }}
              />
              <div className="calendar-icon">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div className="relative date-input-wrapper">
              <label className="absolute -top-2 left-2 bg-white px-1 text-xs text-gray-500 z-10">End Date</label>
              <input 
                type="date" 
                className="w-full p-2 pt-3 border border-gray-300 rounded-md text-sm bg-white"
                value={endDate}
                onChange={(e) => onDateChange('endDate', e.target.value)}
                min={startDate}
                style={{ minHeight: '45px' }}
              />
              <div className="calendar-icon">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>
          {(!startDate || !endDate) && (
            <p className="text-xs text-amber-600 mt-2 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Both start and end dates are required
            </p>
          )}
          {startDate && endDate && (
            <div className="mt-2 text-xs text-blue-600 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {calculateTripDuration(startDate, endDate)} day trip
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Rating filter component
 * @param {Object} props - Component props
 * @param {number} props.minRating - Minimum rating
 * @param {boolean} props.disabled - Whether the component is disabled
 * @param {boolean} props.loading - Whether loading is in progress
 * @param {Function} props.onRatingChange - Rating change handler
 * @param {Object} props.dateFilters - Date filter settings
 * @param {Object} props.cityRatings - City ratings object
 * @param {number} props.destinationCount - Count of destinations currently shown
 * @returns {JSX.Element} - Rating filter component
 */
export const RatingFilter = ({ minRating, disabled, loading, onRatingChange, dateFilters, cityRatings = {}, destinationCount }) => {
  const dateFiltersMissing = 
    (!dateFilters.startDate || !dateFilters.endDate) && 
    (dateFilters.useFlexibleDates && dateFilters.selectedMonths.length === 0);
  
  const calculateRatingCounts = useCallback(() => {
    if (!cityRatings || Object.keys(cityRatings).length === 0) {
      return {
        good: 0,
        veryGood: 0,
        total: 0,
        showingOnMap: 0
      };
    }

    const counts = {
      good: 0,
      veryGood: 0,
      total: 0,
      showingOnMap: 0
    };

    // Count cities by rating
    Object.entries(cityRatings).forEach(([cityName, rating]) => {
      // Skip invalid ratings
      if (rating === null || rating === undefined || isNaN(rating)) {
        return;
      }
      
      const roundedRating = Math.round(rating * 10) / 10; // Round to 1 decimal
      
      if (roundedRating >= 3 && roundedRating < 4) {
        counts.good++;
      } else if (roundedRating >= 4) {
        counts.veryGood++;
      }
      
      if (roundedRating > 0) {
        counts.total++;
      }
    });

    // Calculate how many cities are showing on map based on current filter
    if (parseInt(minRating) === 0) {
      counts.showingOnMap = destinationCount || 0;
    } else if (parseInt(minRating) === 3) {
      counts.showingOnMap = counts.good + counts.veryGood;
    } else if (parseInt(minRating) === 4) {
      counts.showingOnMap = counts.veryGood;
    } else {
      counts.showingOnMap = 0;
    }

    return counts;
  }, [cityRatings, minRating, destinationCount]);
  
  const ratingCounts = calculateRatingCounts();
  
  // Get the highest rated month (if flexible dates)
  const getMonthsDescription = () => {
    if (!dateFilters.useFlexibleDates || dateFilters.selectedMonths.length === 0) {
      return '';
    }
    
    const monthNames = dateFilters.selectedMonths.map(index => MONTH_NAMES_SHORT[index]);
    
    if (monthNames.length === 1) {
      return `in ${monthNames[0]}`;
    } else if (monthNames.length === 2) {
      return `in ${monthNames[0]} and ${monthNames[1]}`;
    } else {
      return `in selected months`;
    }
  };
  
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1">
        <label className="block text-sm font-medium text-gray-700">Destination Rating</label>
        {loading && (
          <div className="flex items-center text-blue-600">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-xs">Analyzing...</span>
          </div>
        )}
      </div>
      
      <div className="relative">
        <select 
          className={`w-full p-2 border ${dateFiltersMissing ? 'border-gray-200 bg-gray-50' : 'border-gray-300 bg-white'} rounded-md transition-colors appearance-none pr-8`}
          value={minRating}
          onChange={(e) => onRatingChange(e.target.value)}
          disabled={disabled || dateFiltersMissing}
        >
          <option value="0">All Destinations</option>
          <option value="3">3+ (Good)</option>
          <option value="4">4+ (Very Good)</option>
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
          </svg>
        </div>
      </div>
      
      {dateFiltersMissing ? (
        <p className="text-xs text-amber-600 mt-1 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {dateFilters.useFlexibleDates ? 'Select at least one month' : 'Select a date range'} to filter by rating
        </p>
      ) : loading ? (
        <p className="text-xs text-blue-600 mt-1">Analyzing travel conditions {getMonthsDescription()}...</p>
      ) : ratingCounts.total > 0 ? (
        <div className="mt-2 space-y-1">
          <div className="grid grid-cols-2 gap-x-1 text-xs">
            <div className="text-gray-700">Very Good (4+)</div>
            <div className="text-right font-medium text-green-700">
              {isNaN(ratingCounts.veryGood) ? 0 : ratingCounts.veryGood}
            </div>
            
            <div className="text-gray-700">Good (3+)</div>
            <div className="text-right font-medium text-green-600">
              {isNaN(ratingCounts.good + ratingCounts.veryGood) ? 0 : (ratingCounts.good + ratingCounts.veryGood)}
            </div>
          </div>
          
          {parseInt(minRating) > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
              <span className="font-medium text-gray-700">Showing on map:</span>
              <span className="font-medium text-blue-600">
                {isNaN(ratingCounts.showingOnMap) ? 0 : ratingCounts.showingOnMap}
              </span>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};