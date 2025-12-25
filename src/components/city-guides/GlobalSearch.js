'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function GlobalSearch({ 
  cityData, 
  activeTab, 
  onResultClick,
  placeholder = "Search attractions, neighborhoods, experiences..."
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const searchResults = performSearch(query, cityData, activeTab);
    setResults(searchResults);
    setIsOpen(searchResults.length > 0);
  }, [query, cityData, activeTab]);

  const performSearch = (searchQuery, data, tab) => {
    const normalizedQuery = searchQuery.toLowerCase().trim();
    const allResults = [];

    // Search attractions
    if (data?.attractions?.sites) {
      data.attractions.sites
        .filter(site => 
          site.name?.toLowerCase().includes(normalizedQuery) ||
          site.description?.toLowerCase().includes(normalizedQuery) ||
          site.category?.toLowerCase().includes(normalizedQuery)
        )
        .forEach(site => {
          allResults.push({
            type: 'attraction',
            title: site.name,
            description: site.description?.substring(0, 80) + '...',
            category: site.category,
            tab: 'attractions',
            data: site
          });
        });
    }

    // Search neighborhoods
    if (data?.neighborhoods?.neighborhoods) {
      data.neighborhoods.neighborhoods
        .filter(neighborhood =>
          neighborhood.name?.toLowerCase().includes(normalizedQuery) ||
          neighborhood.description?.toLowerCase().includes(normalizedQuery) ||
          neighborhood.vibe?.toLowerCase().includes(normalizedQuery)
        )
        .forEach(neighborhood => {
          allResults.push({
            type: 'neighborhood',
            title: neighborhood.name,
            description: neighborhood.description?.substring(0, 80) + '...',
            vibe: neighborhood.vibe,
            tab: 'neighborhoods',
            data: neighborhood
          });
        });
    }

    // Search monthly events
    if (data?.monthlyEvents) {
      Object.entries(data.monthlyEvents).forEach(([month, monthData]) => {
        if (monthData?.events) {
          monthData.events
            .filter(event =>
              event.name?.toLowerCase().includes(normalizedQuery) ||
              event.description?.toLowerCase().includes(normalizedQuery)
            )
            .forEach(event => {
              allResults.push({
                type: 'event',
                title: event.name,
                description: event.description?.substring(0, 80) + '...',
                month: month,
                tab: 'monthly',
                data: event
              });
            });
        }
      });
    }

    return allResults.slice(0, 10); // Limit to top 10 results
  };

  const handleResultClick = (result) => {
    setQuery('');
    setIsOpen(false);
    if (onResultClick) {
      onResultClick(result);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'attraction': return '🎯';
      case 'neighborhood': return '🏘️';
      case 'event': return '📅';
      default: return '📍';
    }
  };

  return (
    <div ref={searchRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
        />
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 touch-manipulation"
            aria-label="Clear search"
          >
            <XMarkIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 max-h-[60vh] sm:max-h-[400px] overflow-y-auto">
          <div className="py-2">
            {results.map((result, index) => (
              <button
                key={index}
                onClick={() => handleResultClick(result)}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left flex items-start gap-2 sm:gap-3 border-b border-gray-100 last:border-b-0 touch-manipulation"
              >
                <span className="text-xl sm:text-2xl flex-shrink-0">{getTypeIcon(result.type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm sm:text-base text-gray-900 truncate">{result.title}</h4>
                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full flex-shrink-0">
                      {result.tab}
                    </span>
                  </div>
                  {result.description && (
                    <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">{result.description}</p>
                  )}
                  {result.category && (
                    <span className="text-xs text-gray-500 mt-1 block">{result.category}</span>
                  )}
                  {result.vibe && (
                    <span className="text-xs text-gray-500 mt-1 block">Vibe: {result.vibe}</span>
                  )}
                  {result.month && (
                    <span className="text-xs text-gray-500 mt-1 block">Month: {result.month}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {query && isOpen && results.length === 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-4">
          <p className="text-gray-500 text-center text-sm">No results found for &quot;{query}&quot;</p>
        </div>
      )}
    </div>
  );
}

