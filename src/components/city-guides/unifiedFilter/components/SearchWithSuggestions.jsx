'use client';

import React, { forwardRef, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getFlagForCountry } from '@/utils/countryFlags';
import { legacyCountryFolder } from '@/lib/city-data/resolver';

const SearchWithSuggestions = forwardRef(function SearchWithSuggestions(
  {
    searchTerm,
    onSearchChange,
    onFocus,
    onKeyDown,
    isSearchFocused,
    suggestions,
    selectedSuggestionIndex,
    onSuggestionClick,
    suggestionsRef,
  },
  ref
) {
  const router = useRouter();
  const warmedRef = useRef(new Set());

  // Prewarm a suggestion's route (RSC payload) + data JSON so the eventual
  // click navigates instantly. Best-effort and deduped per city id. In dev
  // this also triggers on-demand route compilation ahead of the click.
  const warmCity = useCallback(
    (city) => {
      if (!city || warmedRef.current.has(city.id)) return;
      warmedRef.current.add(city.id);
      try {
        router.prefetch(`/city-guides/${city.id}`);
      } catch {
        /* no-op: prefetch is best-effort */
      }
      if (city.country) {
        const folder = legacyCountryFolder(city.country);
        try {
          fetch(`/data/${folder}/${city.id}/index.json`, {
            cache: 'force-cache',
            priority: 'low',
          }).catch(() => {});
        } catch {
          /* no-op */
        }
      }
    },
    [router]
  );

  // Warm the keyboard-highlighted suggestion as the user arrows through.
  useEffect(() => {
    if (selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
      warmCity(suggestions[selectedSuggestionIndex]);
    }
  }, [selectedSuggestionIndex, suggestions, warmCity]);

  return (
    <div className="flex-1 relative" ref={ref}>
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
          onFocus={onFocus}
          onKeyDown={onKeyDown}
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
      {isSearchFocused && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Suggestions
            </span>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {suggestions.map((city, index) => (
              <Link
                key={city.id}
                href={`/city-guides/${city.id}`}
                onMouseEnter={() => warmCity(city)}
                onFocus={() => warmCity(city)}
                onTouchStart={() => warmCity(city)}
                onClick={() => onSuggestionClick(city)}
                className={`
                  flex items-center gap-3 px-4 py-2.5 transition-colors
                  ${index === selectedSuggestionIndex
                    ? 'bg-blue-50'
                    : 'hover:bg-gray-50'}
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
            <span className="text-xs text-gray-400">
              Press ↑↓ to navigate, Enter to select, Esc to close
            </span>
          </div>
        </div>
      )}
    </div>
  );
});

export default SearchWithSuggestions;
