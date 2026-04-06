'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import citiesData from '@/generated/cities.json';
import { getCountryFlag } from '@/utils/countryFlags';

/**
 * CitySearchInput - Searchable city selector
 */
export default function CitySearchInput({
  purpose = 'start', // 'start' | 'end' | 'stop'
  suggestions = [],
  onSelect,
}) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Filter cities based on query
  const filteredCities = useMemo(() => {
    if (!query.trim()) {
      // Show popular cities when no query
      const popularIds = ['paris', 'rome', 'barcelona', 'amsterdam', 'prague', 'lisbon'];
      return citiesData
        .filter(c => popularIds.includes(c.id))
        .slice(0, 6);
    }

    const lowerQuery = query.toLowerCase();
    return citiesData
      .filter(city =>
        city.name.toLowerCase().includes(lowerQuery) ||
        city.country.toLowerCase().includes(lowerQuery)
      )
      .slice(0, 8);
  }, [query]);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIndex(i => Math.min(i + 1, filteredCities.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredCities[highlightIndex]) {
          handleSelect(filteredCities[highlightIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  const handleSelect = (city) => {
    onSelect({
      id: city.id,
      name: city.name,
      country: city.country,
      latitude: city.latitude,
      longitude: city.longitude,
    }, purpose);
    setQuery('');
    setIsOpen(false);
  };

  // Reset highlight when results change
  useEffect(() => {
    setHighlightIndex(0);
  }, [filteredCities]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (listRef.current && isOpen) {
      const highlighted = listRef.current.children[highlightIndex];
      if (highlighted) {
        highlighted.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightIndex, isOpen]);

  const purposeText = {
    start: 'starting city',
    end: 'ending city',
    stop: 'city to visit',
  };

  return (
    <div className="relative">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={`Search for your ${purposeText[purpose]}...`}
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-[15px] placeholder-slate-400 focus:outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all"
        />
      </div>

      {/* Quick suggestions */}
      {suggestions.length > 0 && !query && (
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="text-xs text-slate-500">Popular:</span>
          {suggestions.map((cityName) => {
            const city = citiesData.find(c => c.name === cityName);
            if (!city) return null;

            return (
              <button
                key={city.id}
                onClick={() => handleSelect(city)}
                className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
              >
                {cityName}
              </button>
            );
          })}
        </div>
      )}

      {/* Dropdown results */}
      <AnimatePresence>
        {isOpen && filteredCities.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute z-50 w-full mt-2 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden"
          >
            <ul ref={listRef} className="max-h-64 overflow-y-auto">
              {filteredCities.map((city, index) => (
                <li key={city.id}>
                  <button
                    onClick={() => handleSelect(city)}
                    onMouseEnter={() => setHighlightIndex(index)}
                    className={`
                      w-full px-4 py-3 flex items-center gap-3 text-left transition-colors
                      ${index === highlightIndex ? 'bg-blue-50' : 'hover:bg-slate-50'}
                    `}
                  >
                    <span className="text-xl">{getCountryFlag(city.country)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 truncate">{city.name}</p>
                      <p className="text-sm text-slate-500">{city.country}</p>
                    </div>
                    <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
