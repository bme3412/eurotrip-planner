'use client';

import React, { forwardRef } from 'react';

const CountryDropdown = forwardRef(function CountryDropdown(
  {
    isOpen,
    onToggle,
    selectedCountries,
    countries,
    onCountryChange,
    buttonLabel,
  },
  ref
) {
  return (
    <div className="relative sm:w-44" ref={ref}>
      <button
        onClick={onToggle}
        className={`
          w-full px-3 py-2.5 rounded-lg text-sm flex items-center justify-between gap-2 font-medium transition-all duration-200
          ${selectedCountries.length > 0
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
            : 'bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100'}
        `}
        aria-label="Filter by country"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="truncate">{buttonLabel}</span>
        <svg
          className={`h-4 w-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
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
              onClick={() => onCountryChange('clear-all')}
              className={`
                w-full flex items-center justify-between px-4 py-3 text-left transition-all duration-150 text-sm
                ${selectedCountries.length === 0
                  ? 'bg-blue-50 border-l-3 border-l-blue-500'
                  : 'hover:bg-gray-50 border-l-3 border-l-transparent'}
              `}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`
                    w-5 h-5 rounded-full flex items-center justify-center text-xs
                    ${selectedCountries.length === 0 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'}
                  `}
                >
                  ✓
                </div>
                <span
                  className={`font-medium ${
                    selectedCountries.length === 0 ? 'text-blue-700' : 'text-gray-700'
                  }`}
                >
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
                    onClick={() => onCountryChange(country)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all duration-150 text-sm
                      ${isSelected
                        ? 'bg-emerald-50 border-l-3 border-l-emerald-500'
                        : 'hover:bg-gray-50 border-l-3 border-l-transparent'}
                    `}
                  >
                    <div
                      className={`
                        w-5 h-5 rounded flex items-center justify-center border-2 transition-all duration-150
                        ${isSelected
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-gray-300 bg-white'}
                      `}
                    >
                      {isSelected && (
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
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
  );
});

export default CountryDropdown;
