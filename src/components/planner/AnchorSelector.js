'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, X } from 'lucide-react';
import { getAllCities } from '@/lib/planning/easeScoreCalculator';

const POPULAR_CITIES = [
  { id: 'paris', name: 'Paris', country: 'France' },
  { id: 'barcelona', name: 'Barcelona', country: 'Spain' },
  { id: 'rome', name: 'Rome', country: 'Italy' },
  { id: 'amsterdam', name: 'Amsterdam', country: 'Netherlands' },
  { id: 'london', name: 'London', country: 'UK' },
  { id: 'berlin', name: 'Berlin', country: 'Germany' },
  { id: 'prague', name: 'Prague', country: 'Czechia' },
  { id: 'vienna', name: 'Vienna', country: 'Austria' },
];

export default function AnchorSelector({ value, onChange }) {
  const [query, setQuery] = useState('');
  const [allCities, setAllCities] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    getAllCities().then(setAllCities);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = query.length > 0
    ? allCities.filter(c =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.country.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
    : [];

  const selectedCity = allCities.find(c => c.id === value) ||
    POPULAR_CITIES.find(c => c.id === value) ||
    { id: value, name: value.charAt(0).toUpperCase() + value.slice(1), country: '' };

  const handleSelect = useCallback((city) => {
    onChange(city.id);
    setQuery('');
    setIsOpen(false);
    setHighlightIndex(-1);
  }, [onChange]);

  const handleKeyDown = useCallback((e) => {
    if (!isOpen || filtered.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault();
      handleSelect(filtered[highlightIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setQuery('');
    }
  }, [isOpen, filtered, highlightIndex, handleSelect]);

  return (
    <div className="w-full max-w-xl mx-auto">
      <label className="block text-sm font-medium text-slate-400 mb-3 text-center tracking-wide uppercase">
        Where does your journey begin?
      </label>

      <div className="relative" ref={dropdownRef}>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(e.target.value.length > 0);
              setHighlightIndex(-1);
            }}
            onFocus={() => { if (query.length > 0) setIsOpen(true); }}
            onKeyDown={handleKeyDown}
            placeholder={`Search cities... (current: ${selectedCity.name})`}
            className="w-full pl-11 pr-10 py-3.5 bg-slate-900/80 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setIsOpen(false); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <AnimatePresence>
          {isOpen && filtered.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute z-50 w-full mt-2 bg-slate-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden"
            >
              {filtered.map((city, i) => (
                <button
                  key={city.id}
                  onClick={() => handleSelect(city)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    i === highlightIndex
                      ? 'bg-blue-600/20 text-white'
                      : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <MapPin className="h-4 w-4 text-slate-500 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-sm">{city.name}</span>
                    <span className="text-xs text-slate-500 ml-2">{city.country}</span>
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Popular city chips */}
      <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
        {POPULAR_CITIES.map(city => (
          <button
            key={city.id}
            onClick={() => handleSelect(city)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
              value === city.id
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-white'
            }`}
          >
            {city.name}
          </button>
        ))}
      </div>
    </div>
  );
}
