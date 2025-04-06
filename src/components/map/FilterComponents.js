import React from 'react';
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
  
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">Visit Dates</label>
        <div className="flex items-center">
          <span className="text-xs text-gray-500 mr-2">
            {useFlexibleDates ? 'Flexible' : 'Exact'}
          </span>
          <button 
            onClick={onDateTypeToggle}
            className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${
              useFlexibleDates ? 'bg-blue-500' : 'bg-gray-300'
            }`}
          >
            <span 
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                useFlexibleDates ? 'translate-x-5' : 'translate-x-1'
              }`} 
            />
          </button>
        </div>
      </div>
      
      {useFlexibleDates ? (
        <div className="mt-2">
          <div className="text-xs text-gray-500 mb-2">Select months to visit:</div>
          <div className="grid grid-cols-3 gap-2">
            {MONTH_NAMES_SHORT.map((month, index) => (
              <div 
                key={month}
                onClick={() => onMonthToggle(index, !selectedMonths.includes(index))}
                className={`cursor-pointer text-center py-1 px-2 rounded text-sm ${
                  selectedMonths.includes(index) 
                    ? 'bg-blue-100 text-blue-800 font-medium' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {month}
              </div>
            ))}
          </div>
          {selectedMonths.length === 0 && (
            <p className="text-xs text-amber-600 mt-1">Please select at least one month</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Start Date</label>
            <input 
              type="date" 
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
              value={startDate}
              onChange={(e) => onDateChange('startDate', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">End Date</label>
            <input 
              type="date" 
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
              value={endDate}
              onChange={(e) => onDateChange('endDate', e.target.value)}
              min={startDate}
            />
          </div>
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
 * @returns {JSX.Element} - Rating filter component
 */
export const RatingFilter = ({ minRating, disabled, loading, onRatingChange, dateFilters }) => {
  const dateFiltersMissing = 
    (!dateFilters.startDate || !dateFilters.endDate) && 
    (dateFilters.useFlexibleDates && dateFilters.selectedMonths.length === 0);
  
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Rating</label>
      <select 
        className="w-full p-2 border border-gray-300 rounded-md"
        value={minRating}
        onChange={(e) => onRatingChange(e.target.value)}
        disabled={disabled || dateFiltersMissing}
      >
        <option value="0">All Ratings</option>
        <option value="3">3+ ★★★☆☆</option>
        <option value="4">4+ ★★★★☆</option>
        <option value="5">5 ★★★★★</option>
      </select>
      {dateFiltersMissing ? (
        <p className="text-xs text-amber-600 mt-1">
          {dateFilters.useFlexibleDates ? 'Select at least one month' : 'Select a date range'} to filter by rating
        </p>
      ) : null}
      {loading && (
        <p className="text-xs text-blue-600 mt-1">Loading ratings for selected dates...</p>
      )}
    </div>
  );
};