import React, { useState } from 'react';

const CountryFilter = ({ selectedCountry, handleCountryChange, countries = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Use the provided countries array
  const countryOptions = countries;
  
  return (
    <div className="mb-6">
      <h3 className="font-medium text-gray-700 mb-2">Filter by Country</h3>
      <div className="relative">
        <button
          className="w-full sm:w-48 bg-white border border-gray-300 rounded-md py-2 px-3 text-left shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          onClick={() => setIsOpen(!isOpen)}
          type="button"
        >
          <span className="block truncate">
            {selectedCountry === 'All' ? 'All Countries' : selectedCountry}
          </span>
          <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            <svg
              className="h-5 w-5 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        </button>
        
        {isOpen && (
          <div className="origin-top-right absolute z-50 right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 max-h-60 overflow-y-auto">
            <div className="py-1 divide-y divide-gray-100" role="menu" aria-orientation="vertical">
              {countryOptions.map((country) => (
                <button
                  key={country}
                  className={`${
                    selectedCountry === country ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                  } block w-full text-left px-4 py-2 text-sm hover:bg-gray-50`}
                  onClick={() => {
                    handleCountryChange(country);
                    setIsOpen(false);
                  }}
                  type="button"
                >
                  {country === 'All' ? 'All Countries' : country}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CountryFilter;