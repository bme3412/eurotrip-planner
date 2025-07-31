'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import 'mapbox-gl/dist/mapbox-gl.css';

// Dynamically import the map component on the client side
// Using dynamic import with no SSR for reliable rendering
const CityMapWithMapbox = dynamic(
  () => import('./CityMapWithMapbox'),
  {
    ssr: false,
    loading: () => (
      <div className="h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading interactive map...</p>
        </div>
      </div>
    )
  }
);

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
  const [activeFilters, setActiveFilters] = useState([]);
  
  // Effect to ensure the component only renders on client
  useEffect(() => {
    setIsClient(true);
  }, []);

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
          <CityMapWithMapbox 
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
                    const allClusters = ['Landmarks', 'Museums & Arts', 'Parks & Nature', 'Districts & Streets', 'Entertainment', 'Shopping & Markets', 'Historical Sites', 'Other'];
                    setActiveFilters(allClusters);
                  }}
                  className={`text-xs px-3 py-1 rounded transition-colors ${
                    activeFilters.length > 0 
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
                // Define category clusters
                const categoryClusters = {
                  'Landmarks': ['Monument', 'Cathedral', 'Basilica', 'Chapel', 'Church', 'Palace'],
                  'Museums & Arts': ['Museum', 'Contemporary Art Center', 'Art Center', 'Digital Art Center'],
                  'Parks & Nature': ['Park', 'Garden', 'Waterway', 'Bridge'],
                  'Districts & Streets': ['District', 'Street', 'Square'],
                  'Entertainment': ['Opera House', 'Activity', 'River Cruise'],
                  'Shopping & Markets': ['Department Store', 'Market', 'Market Street'],
                  'Historical Sites': ['Historical Site', 'Cemetery'],
                  'Other': ['Exhibition Hall', 'Skyscraper', 'Library']
                };
                
                // Calculate counts for each cluster
                const clusterCounts = {};
                Object.keys(categoryClusters).forEach(cluster => {
                  clusterCounts[cluster] = attractions.filter(attr => {
                    const attrCategory = attr.type || attr.category || 'Other';
                    return categoryClusters[cluster].includes(attrCategory);
                  }).length;
                });
                
                // Only show clusters that have attractions
                return Object.keys(categoryClusters)
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
            // Define category clusters for filtering
            const categoryClusters = {
              'Landmarks': ['Monument', 'Cathedral', 'Basilica', 'Chapel', 'Church', 'Palace'],
              'Museums & Arts': ['Museum', 'Contemporary Art Center', 'Art Center', 'Digital Art Center'],
              'Parks & Nature': ['Park', 'Garden', 'Waterway', 'Bridge'],
              'Districts & Streets': ['District', 'Street', 'Square'],
              'Entertainment': ['Opera House', 'Activity', 'River Cruise'],
              'Shopping & Markets': ['Department Store', 'Market', 'Market Street'],
              'Historical Sites': ['Historical Site', 'Cemetery'],
              'Other': ['Exhibition Hall', 'Skyscraper', 'Library']
            };
            
            // Filter attractions based on active filters
            const filteredAttractions = activeFilters.length > 0 
              ? attractions.filter(attraction => {
                  const attrCategory = attraction.type || attraction.category || 'Other';
                  return activeFilters.some(filter => 
                    categoryClusters[filter]?.includes(attrCategory)
                  );
                })
              : attractions;
            
            return (
              <>
                <h3 className="text-xl font-semibold text-gray-800 mb-4">
                  {activeFilters.length > 0 ? `Filtered Attractions (${filteredAttractions.length})` : `All Attractions (${attractions.length})`}
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {filteredAttractions.map((attraction, index) => (
                    <div 
                      key={index} 
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
                              {index + 1}
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
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}