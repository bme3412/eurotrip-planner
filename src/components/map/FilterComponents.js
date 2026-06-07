import React from 'react';

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
      className="bg-white/95 p-2 rounded-full shadow-md ring-1 ring-slate-200 hover:bg-white"
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
        // In-flow (not absolute): expands and pushes the fields below it down,
        // so it never overlays/clips the fields or gets cut by the panel's
        // mobile overflow-y-auto.
        <div className="w-full bg-white border border-gray-200 rounded-md shadow-sm mt-1 max-h-56 overflow-y-auto">
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
