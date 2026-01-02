'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import 'mapbox-gl/dist/mapbox-gl.css';
import LazyMapWithMapbox from './LazyMapWithMapbox';

export default function MapSection({ 
  attractions = [], 
  categories = [], 
  cityName = "City", 
  center = [0, 0], 
  zoom = 12,
  title,
  subtitle,
  showHeader = true,
  height = 500 
}) {
  const [isClient, setIsClient] = useState(false);
  const [selectedAttraction, setSelectedAttraction] = useState(null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [hovered, setHovered] = useState(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;
  
  // Ref for scrolling to map
  const mapContainerRef = useRef(null);
  
  // Handle card click - select and scroll to map
  const handleCardClick = useCallback((attraction) => {
    setSelectedAttraction(attraction);
    // Smooth scroll to map container
    if (mapContainerRef.current) {
      const headerOffset = 80; // Account for sticky header
      const elementPosition = mapContainerRef.current.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  }, []);
  
  // Effect to ensure the component only renders on client
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Process default values for title and subtitle
  const mapTitle = title || `${cityName} at a Glance`;
  const mapSubtitle = subtitle || `Interactive map of key attractions and landmarks`;

  const filteredAttractions = useMemo(() => {
    let result = Array.isArray(attractions) ? attractions : [];
    if (activeCategory !== 'all') {
      result = result.filter((a) => (a.category || '').toLowerCase() === activeCategory);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((a) => (a.name || '').toLowerCase().includes(q));
    }
    return result;
  }, [attractions, activeCategory, search]);

  // Always show all filtered attractions on map; selection highlighting is handled by the map component
  const mapAttractions = filteredAttractions;

  // Pagination helpers
  useEffect(() => {
    setPage(1);
  }, [search, activeCategory]);

  useEffect(() => {
    if (!selectedAttraction || filteredAttractions.length === 0) return;
    const idx = filteredAttractions.findIndex((a) => a.name === selectedAttraction.name);
    if (idx >= 0) {
      const targetPage = Math.floor(idx / PAGE_SIZE) + 1;
      setPage(targetPage);
    }
  }, [selectedAttraction, filteredAttractions]);

  const totalPages = Math.max(1, Math.ceil(filteredAttractions.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const currentItems = filteredAttractions.slice(startIdx, startIdx + PAGE_SIZE);

  const cleanText = (text) => (text || '').replace(/\*\*/g, '');
  
  // Build a lookup of attraction name -> global index (1-based) for consistent numbering
  const attractionIndexMap = useMemo(() => {
    const map = new Map();
    filteredAttractions.forEach((a, idx) => {
      map.set(a.name, idx + 1);
    });
    return map;
  }, [filteredAttractions]);

  // Get price color
  const getPriceColor = (priceRange) => {
    if (!priceRange) return 'text-gray-500';
    const p = priceRange.toLowerCase();
    if (p === 'free') return 'text-green-600';
    if (p === 'moderate') return 'text-amber-600';
    if (p === 'expensive') return 'text-red-600';
    return 'text-gray-500';
  };

  return (
    <div className="overflow-hidden">
      {showHeader && (
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-xl font-semibold text-gray-800">{mapTitle}</h3>
          <p className="text-sm text-gray-600">{mapSubtitle}</p>
        </div>
      )}
      
      <div ref={mapContainerRef} style={{ height: `${height}px` }}>
        {isClient && (
          <LazyMapWithMapbox 
            attractions={mapAttractions} 
            categories={categories}
            cityName={cityName}
            center={center}
            zoom={zoom}
            selectedAttraction={selectedAttraction}
            onHover={setHovered}
            onSelect={setSelectedAttraction}
          />
        )}
      </div>
      
      {/* Filters removed per request */}
      
      {/* Compact list of filtered items */}
      {filteredAttractions && filteredAttractions.length > 0 && (
        <div className="p-6 bg-gradient-to-b from-gray-50 to-white border-t border-gray-200">
          <div className="max-w-5xl mx-auto space-y-4">
            {/* List header */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Places to Explore
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({filteredAttractions.length} locations)
                </span>
              </h3>
              {selectedAttraction && (
                <button
                  onClick={() => setSelectedAttraction(null)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  ← Show all on map
                </button>
              )}
            </div>
            {hovered && !selectedAttraction && (
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 shadow-sm p-4 animate-in fade-in duration-200">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">
                    {attractionIndexMap.get(hovered.name) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900">{hovered.name}</p>
                        {(hovered.type || hovered.category) && (
                          <p className="text-xs text-gray-500 mt-0.5">{hovered.type || hovered.category}</p>
                        )}
                      </div>
                      <button 
                        onClick={() => handleCardClick(hovered)} 
                        className="flex-shrink-0 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-full hover:bg-blue-700 transition-colors"
                      >
                        View →
                      </button>
                    </div>
                    {hovered.description && (
                      <p className="mt-2 text-sm text-gray-600 line-clamp-2">{cleanText(hovered.description)}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentItems.map((attraction) => {
                const globalIndex = attractionIndexMap.get(attraction.name) || 0;
                const isSelected = selectedAttraction?.name === attraction.name;
                const dur = attraction.ratings?.suggested_duration_hours || attraction.duration || attraction.duration_minutes;
                const hours = typeof dur === 'number' ? dur : Number(dur) || null;
                const durationText = hours ? `${hours.toFixed(1).replace(/\.0$/, '')}h` : null;
                
                return (
                  <button
                    key={`${attraction.name}-${globalIndex}`}
                    onClick={() => handleCardClick(attraction)}
                    className={`group text-left rounded-xl border transition-all duration-200 ${
                      isSelected 
                        ? 'ring-2 ring-blue-400 border-blue-200 bg-blue-50 shadow-md' 
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    {/* Header with number badge */}
                    <div className="flex items-start gap-3 p-4 pb-2">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 group-hover:bg-gray-200'
                      }`}>
                        {globalIndex}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 leading-tight">{attraction.name}</h4>
                        <p className="text-xs text-gray-500 mt-0.5">{attraction.type || attraction.category}</p>
                      </div>
                    </div>
                    
                    {/* Description */}
                    {attraction.description && (
                      <div className="px-4 pb-2">
                        <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
                          {cleanText(attraction.description)}
                        </p>
                      </div>
                    )}
                    
                    {/* Meta footer */}
                    <div className="px-4 pb-3 pt-1 flex flex-wrap items-center gap-2 text-xs">
                      {attraction.best_time && (
                        <span className="inline-flex items-center gap-1 text-gray-500">
                          <span className="opacity-70">🕒</span>
                          {cleanText(attraction.best_time)}
                        </span>
                      )}
                      {attraction.price_range && (
                        <span className={`inline-flex items-center gap-1 font-medium ${getPriceColor(attraction.price_range)}`}>
                          <span className="opacity-70">💰</span>
                          {attraction.price_range}
                        </span>
                      )}
                      {durationText && (
                        <span className="inline-flex items-center gap-1 text-gray-500">
                          <span className="opacity-70">⏱</span>
                          {durationText}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2 text-sm text-gray-600">
                <div>
                  Showing {filteredAttractions.length === 0 ? 0 : startIdx + 1}–
                  {Math.min(startIdx + PAGE_SIZE, filteredAttractions.length)} of {filteredAttractions.length}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <span className="text-xs text-gray-500">
                    Page {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-8 pt-8 pb-6 px-6 bg-white">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <p className="text-sm font-medium text-gray-900">Plan smarter. Travel better.</p>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/city-guides" className="text-gray-500 hover:text-gray-900 transition-colors">
              Browse all cities
            </Link>
            <a href="mailto:support@eurotripplanner.com" className="text-gray-500 hover:text-gray-900 transition-colors">
              Get support
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}