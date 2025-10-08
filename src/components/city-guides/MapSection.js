'use client';

import React, { useState, useEffect } from 'react';
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
  // Define clusters once so we can use them for defaults and filtering
  const CATEGORY_CLUSTERS = {
    'Landmarks': ['Monument', 'Cathedral', 'Basilica', 'Chapel', 'Church', 'Palace'],
    'Museums & Arts': ['Museum', 'Contemporary Art Center', 'Art Center', 'Digital Art Center'],
    'Parks & Nature': ['Park', 'Garden', 'Waterway', 'Bridge'],
    'Districts & Streets': ['District', 'Street', 'Square'],
    'Entertainment': ['Opera House', 'Activity', 'River Cruise'],
    'Shopping & Markets': ['Department Store', 'Market', 'Market Street'],
    'Historical Sites': ['Historical Site', 'Cemetery'],
    'Other': ['Exhibition Hall', 'Skyscraper', 'Library']
  };
  const ALL_CLUSTERS = Object.keys(CATEGORY_CLUSTERS);
  // Default to All selected
  const [activeFilters, setActiveFilters] = useState(ALL_CLUSTERS);
  // Pagination state for the attractions list
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  
  // Effect to ensure the component only renders on client
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [activeFilters, cityName]);

  // Process default values for title and subtitle
  const mapTitle = title || `${cityName} at a Glance`;
  const mapSubtitle = subtitle || `Interactive map of key attractions and landmarks`;

  return (
    <div className="overflow-hidden">
      {showHeader && (
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-xl font-semibold text-gray-800">{mapTitle}</h3>
          <p className="text-sm text-gray-600">{mapSubtitle}</p>
        </div>
      )}
      
      <div style={{ height: `${height}px` }}>
        {isClient && (
          <LazyMapWithMapbox 
            attractions={attractions} 
            categories={categories}
            cityName={cityName}
            center={center}
            zoom={zoom}
            selectedAttraction={selectedAttraction}
          />
        )}
      </div>
      
      {/* Filter Section Below Map */}
      {attractions && attractions.length > 0 && (
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-800 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                </svg>
                Filter Attractions
              </h3>
              <div className="flex space-x-2">
                <button 
                  onClick={() => {
                    setActiveFilters(ALL_CLUSTERS);
                  }}
                  className={`text-xs px-3 py-1 rounded transition-colors ${
                    activeFilters.length === ALL_CLUSTERS.length 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
                  }`}
                >
                  All
                </button>
                <button 
                  onClick={() => {
                    setActiveFilters([]);
                  }}
                  className={`text-xs px-3 py-1 rounded transition-colors ${
                    activeFilters.length === 0 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
                  }`}
                >
                  None
                </button>
              </div>
            </div>
            
            <div className="flex gap-2 overflow-x-auto pb-2">
              {(() => {
                // Calculate counts for each cluster
                const clusterCounts = {};
                Object.keys(CATEGORY_CLUSTERS).forEach(cluster => {
                  clusterCounts[cluster] = attractions.filter(attr => {
                    const attrCategory = attr.type || attr.category || 'Other';
                    return CATEGORY_CLUSTERS[cluster].includes(attrCategory);
                  }).length;
                });
                
                // Only show clusters that have attractions
                return Object.keys(CATEGORY_CLUSTERS)
                  .filter(cluster => clusterCounts[cluster] > 0)
                  .map((cluster) => {
                    const isActive = activeFilters.includes(cluster);
                    return (
                      <button
                        key={cluster}
                        onClick={() => {
                          if (isActive) {
                            setActiveFilters(activeFilters.filter(f => f !== cluster));
                          } else {
                            setActiveFilters([...activeFilters, cluster]);
                          }
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-all duration-200 whitespace-nowrap ${
                          isActive 
                            ? 'border-blue-500 text-white bg-blue-600 shadow-sm' 
                            : 'border-gray-300 text-gray-700 bg-gray-100 hover:bg-gray-200'
                        }`}
                      >
                        {cluster} ({clusterCounts[cluster]})
                      </button>
                    );
                  });
              })()}
            </div>
          </div>
        </div>
      )}
      
      {/* Attractions List Below Filter */}
      {attractions && attractions.length > 0 && (
        <div className="p-6 bg-white border-t border-gray-200">
          {(() => {
            // Filter attractions based on active filters
            const filteredAttractions = activeFilters.length > 0 
              ? attractions.filter(attraction => {
                  const attrCategory = attraction.type || attraction.category || 'Other';
                  return activeFilters.some(filter => CATEGORY_CLUSTERS[filter]?.includes(attrCategory));
                })
              : attractions;

            // Pagination calculations
            const total = filteredAttractions.length;
            const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
            const safePage = Math.min(Math.max(1, page), totalPages);
            const startIndex = (safePage - 1) * PAGE_SIZE;
            const currentItems = filteredAttractions.slice(startIndex, startIndex + PAGE_SIZE);
            
            return (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xl font-semibold text-gray-800">
                    {activeFilters.length > 0 ? `Filtered Attractions (${filteredAttractions.length})` : `All Attractions (${attractions.length})`}
                  </h3>
                  <div className="text-sm text-gray-600">
                    Showing {total === 0 ? 0 : startIndex + 1}–{Math.min(startIndex + PAGE_SIZE, total)} of {total}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {currentItems.map((attraction, index) => (
                    <div 
                      key={`${attraction.name}-${startIndex + index}`} 
                      className={`border-b border-gray-200 pb-4 last:border-b-0 transition-colors cursor-pointer ${
                        selectedAttraction?.name === attraction.name ? 'bg-blue-100 border-l-4 border-l-blue-500' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedAttraction(selectedAttraction?.name === attraction.name ? null : attraction)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold mr-3 transition-all duration-300 ${
                              selectedAttraction?.name === attraction.name 
                                ? 'bg-blue-600 text-white scale-110 shadow-lg' 
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}>
                              {startIndex + index + 1}
                            </span>
                            <h4 className={`font-semibold transition-colors duration-300 ${
                              selectedAttraction?.name === attraction.name ? 'text-blue-700' : 'text-gray-900'
                            }`}>
                              {attraction.name}
                            </h4>
                          </div>
                          <p className="text-sm text-gray-600 mb-2 ml-9">{attraction.type || attraction.category}</p>
                          {attraction.description && (
                            <p className="text-sm text-gray-700 leading-relaxed ml-9">{attraction.description}</p>
                          )}
                        </div>
                        <div className="ml-4 text-sm text-gray-500 flex flex-col items-end">
                          {attraction.price_range && (
                            <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded-full mb-1 text-xs">
                              {attraction.price_range}
                            </span>
                          )}
                          {attraction.best_time && (
                            <div className="text-xs text-gray-500 mb-1">
                              Best: {attraction.best_time}
                            </div>
                          )}
                          {attraction.ratings && (
                            <div className="text-xs text-gray-500">
                              {attraction.ratings.suggested_duration_hours}h • €{attraction.ratings.cost_estimate}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination controls */}
                {totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1.5 rounded border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      disabled={safePage === 1}
                    >
                      Prev
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(n => n === 1 || n === totalPages || Math.abs(n - safePage) <= 1)
                      .map((n, idx, arr) => (
                        <React.Fragment key={n}>
                          {idx > 0 && arr[idx - 1] !== n - 1 && (
                            <span className="px-1 text-gray-400">…</span>
                          )}
                          <button
                            onClick={() => setPage(n)}
                            className={`px-3 py-1.5 rounded border text-sm ${
                              n === safePage ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {n}
                          </button>
                        </React.Fragment>
                      ))}
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="px-3 py-1.5 rounded border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      disabled={safePage === totalPages}
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}