import React, { useState, useEffect, useRef } from 'react';

const CountryFilter = ({ selectedCountries = [], handleCountryChange, countries = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  // Ref for the main filter component container
  const filterRef = useRef(null);

  // Effect to handle clicks outside the component to close the dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if the click is outside the referenced element
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setIsOpen(false); // Close the dropdown
      }
    };

    // Add event listener only when the dropdown is open
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    // Cleanup function to remove the event listener
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]); // Dependency array ensures this runs only when isOpen changes

  const getButtonLabel = () => {
    if (!selectedCountries || selectedCountries.length === 0) {
      return 'All Countries';
    }
    if (selectedCountries.length === 1) {
      return selectedCountries[0];
    }
    return `${selectedCountries.length} Countries Selected`;
  };

  return (
    // Add the ref to the main container div
    <div className="mb-6 relative" ref={filterRef}>
      <h3 className="text-sm font-semibold text-gray-800 mb-1.5">Filter by Country</h3>
      <div className="">
        <button
          className="w-full sm:w-48 bg-white border border-gray-300 rounded-md py-2 px-3 text-left shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 flex justify-between items-center"
          onClick={() => setIsOpen(!isOpen)}
          type="button"
        >
          <span className="block truncate">
            {getButtonLabel()}
          </span>
          <span className="pointer-events-none">
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
            <div className="py-1" role="menu" aria-orientation="vertical">
              {countries.filter(c => c !== 'All').map((country) => {
                const isSelected = selectedCountries.includes(country);
                return (
                  <button
                    key={country}
                    className={'text-gray-700 block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center justify-between'}
                    onClick={() => {
                      handleCountryChange(country);
                    }}
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={isSelected}
                  >
                    {/* Country Name */}
                    <span>{country}</span>
                    
                    {/* Green Checkmark for selected items */}
                    {isSelected && (
                      <svg 
                        className="h-5 w-5 text-green-500"
                        xmlns="http://www.w3.org/2000/svg" 
                        viewBox="0 0 20 20" 
                        fill="currentColor"
                      >
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CountryFilter;
