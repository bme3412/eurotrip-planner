'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCitiesData } from '@/generated/cityIndex';
import { getFlagForCountry } from '@/utils/countryFlags';

function searchCities(query, cities, limit = 8) {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase().trim();

  const scored = cities
    .map(city => {
      const name = city.name.toLowerCase();
      const country = city.country.toLowerCase();
      const region = (city.region || '').toLowerCase();
      let score = 0;

      if (name.startsWith(q)) score = 100;
      else if (name.split(/[\s-]/).some(w => w.startsWith(q))) score = 80;
      else if (name.includes(q)) score = 60;
      else if (country.startsWith(q)) score = 40;
      else if (country.includes(q)) score = 20;
      else if (region.includes(q)) score = 10;
      else return null;

      return { ...city, _score: score };
    })
    .filter(Boolean)
    .sort((a, b) => b._score - a._score);

  return scored.slice(0, limit);
}

export default function SearchBar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);

  const cities = useRef(null);
  if (!cities.current) {
    try { cities.current = getCitiesData(); } catch { cities.current = []; }
  }

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setResults([]);
    setActiveIdx(-1);
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const r = searchCities(query, cities.current);
      setResults(r);
      setActiveIdx(-1);
    }, 150);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) close();
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, close]);

  // Focus input when opened
  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') { close(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, results.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, -1));
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIdx >= 0 && results[activeIdx]) {
        router.push(`/city-guides/${results[activeIdx].id}`);
        close();
      } else if (query.trim().length >= 2) {
        router.push(`/city-guides?search=${encodeURIComponent(query.trim())}`);
        close();
      }
    }
  };

  // Region color tag
  const regionClass = (region) => {
    const map = {
      'Mediterranean': 'bg-orange-50 text-orange-700',
      'Atlantic Europe': 'bg-sky-50 text-sky-700',
      'Central Europe': 'bg-emerald-50 text-emerald-700',
      'Alpine': 'bg-blue-50 text-blue-700',
      'Imperial Cities': 'bg-violet-50 text-violet-700',
      'Celtic & Nordic': 'bg-indigo-50 text-indigo-700',
      'Arctic': 'bg-pink-50 text-pink-700',
    };
    return map[region] || 'bg-gray-50 text-gray-600';
  };

  return (
    <div ref={wrapperRef} className="relative">
      {/* Search toggle button (collapsed) */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 text-sm transition-colors"
          aria-label="Search cities"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="hidden lg:inline text-xs text-gray-400">Search 220+ cities</span>
        </button>
      )}

      {/* Expanded search input */}
      {open && (
        <div className="flex items-center">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search cities..."
              className="w-48 sm:w-64 pl-9 pr-8 py-1.5 text-sm rounded-full border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={close}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Close search"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Dropdown results */}
      {open && results.length > 0 && (
        <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white rounded-xl border border-gray-200 shadow-xl z-[60] overflow-hidden">
          <div className="py-1">
            {results.map((city, idx) => (
              <Link
                key={city.id}
                href={`/city-guides/${city.id}`}
                onClick={close}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  idx === activeIdx ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
              >
                <span className="text-base">{getFlagForCountry(city.country)}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{city.name}</div>
                  <div className="text-xs text-gray-500">{city.country}</div>
                </div>
                {city.region && (
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${regionClass(city.region)}`}>
                    {city.region}
                  </span>
                )}
              </Link>
            ))}
          </div>
          {query.length >= 2 && (
            <div className="border-t border-gray-100 px-4 py-2">
              <Link
                href={`/city-guides?search=${encodeURIComponent(query)}`}
                onClick={close}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                See all results for &ldquo;{query}&rdquo; &rarr;
              </Link>
            </div>
          )}
        </div>
      )}

      {/* No results message */}
      {open && query.length >= 2 && results.length === 0 && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl border border-gray-200 shadow-xl z-[60] px-4 py-4 text-center">
          <p className="text-sm text-gray-500">No cities found for &ldquo;{query}&rdquo;</p>
          <Link
            href="/city-guides"
            onClick={close}
            className="mt-2 inline-block text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            Browse all cities &rarr;
          </Link>
        </div>
      )}
    </div>
  );
}
