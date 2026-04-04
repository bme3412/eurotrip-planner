'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { getAllCities } from '@/lib/planning/easeScoreCalculator';
import { COUNTRY_FLAGS } from '@/lib/planning/rankDestinations';

const POPULAR_CITIES = [
  { id: 'paris', name: 'Paris', country: 'France' },
  { id: 'rome', name: 'Rome', country: 'Italy' },
  { id: 'barcelona', name: 'Barcelona', country: 'Spain' },
  { id: 'amsterdam', name: 'Amsterdam', country: 'Netherlands' },
  { id: 'prague', name: 'Prague', country: 'Czechia' },
  { id: 'dubrovnik', name: 'Dubrovnik', country: 'Croatia' },
  { id: 'lisbon', name: 'Lisbon', country: 'Portugal' },
  { id: 'berlin', name: 'Berlin', country: 'Germany' },
  { id: 'vienna', name: 'Vienna', country: 'Austria' },
];

function getFlag(country) {
  return COUNTRY_FLAGS[country] || '🏳️';
}

export default function StartingCitySelector({ selectedCity, onSelectCity, onClearCity }) {
  const [allCities, setAllCities] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  const searchRef = useRef(null);
  const dropdownRef = useRef(null);

  // Load all cities on mount
  useEffect(() => {
    getAllCities().then(cities => {
      setAllCities(cities.map(c => ({
        ...c,
        flag: getFlag(c.country),
      })));
    });
  }, []);

  // Handle click outside search
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter cities based on search
  const filteredCities = useMemo(() => {
    if (!searchQuery) return [];
    return allCities
      .filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.country.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .slice(0, 10);
  }, [searchQuery, allCities]);

  // Handle city selection
  const handleSelectCity = useCallback((city) => {
    onSelectCity({
      ...city,
      flag: getFlag(city.country),
    });
    setSearchQuery('');
    setIsSearchOpen(false);
    setHighlightIndex(-1);
  }, [onSelectCity]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (!isSearchOpen || filteredCities.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex(i => Math.min(i + 1, filteredCities.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault();
      handleSelectCity(filteredCities[highlightIndex]);
    } else if (e.key === 'Escape') {
      setIsSearchOpen(false);
      setSearchQuery('');
    }
  }, [isSearchOpen, filteredCities, highlightIndex, handleSelectCity]);

  const handleClear = useCallback(() => {
    onClearCity();
    searchRef.current?.focus();
  }, [onClearCity]);

  return (
    <div className="space-y-3">
      {/* Search */}
      <div>
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
          Your starting city
        </div>
        <div className="relative" ref={dropdownRef}>
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(e.target.value.length > 0);
              setHighlightIndex(-1);
            }}
            onFocus={() => { if (searchQuery) setIsSearchOpen(true); }}
            onKeyDown={handleKeyDown}
            placeholder="Search 200+ European cities..."
            className="w-full pl-10 pr-10 py-3 border-2 border-slate-200 rounded-xl text-slate-900 text-[15px] font-medium placeholder:text-slate-400 placeholder:font-normal outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-400/10 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); setIsSearchOpen(false); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Dropdown */}
          <AnimatePresence>
            {isSearchOpen && filteredCities.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-[220px] overflow-y-auto"
              >
                {filteredCities.map((city, i) => (
                  <button
                    key={city.id}
                    onClick={() => handleSelectCity(city)}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors ${
                      i === highlightIndex ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-lg">{getFlag(city.country)}</span>
                    <span className="text-sm font-medium">{city.name}</span>
                    <span className="text-xs text-slate-400 ml-auto">{city.country}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Popular Cities */}
      {!selectedCity && (
        <div>
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Popular picks
          </div>
          <div className="flex flex-wrap gap-2">
            {POPULAR_CITIES.map(city => (
              <button
                key={city.id}
                onClick={() => handleSelectCity(city)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 border-slate-200 bg-white text-[13px] font-medium text-slate-700 hover:border-blue-400 hover:text-blue-500 transition-all"
              >
                <span>{getFlag(city.country)}</span>
                <span>{city.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected City Badge */}
      <AnimatePresence>
        {selectedCity && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
              <span className="text-xl">{selectedCity.flag || getFlag(selectedCity.country)}</span>
              <span className="text-sm font-semibold text-slate-700">
                {selectedCity.name}, {selectedCity.country}
              </span>
              <button
                onClick={handleClear}
                className="ml-auto text-xs font-semibold text-blue-500 hover:underline"
              >
                Change
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
