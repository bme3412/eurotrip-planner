'use client';

import React, { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import { useDebounce, useThrottle, useExpensiveCalculation, useBatchedUpdates } from '@/hooks/usePerformanceOptimization';
import { useAsyncData } from '@/hooks/useAsyncData';
import { AsyncWrapper, LoadingSpinner } from '@/components/common/EnhancedLoadingSystem';
import { COUNTRY_COLORS, MAJOR_CITIES, INITIAL_FILTERS } from './constants';

/**
 * Optimized Map Component with performance improvements
 * - Debounced filter updates
 * - Throttled map interactions  
 * - Memoized expensive calculations
 * - Batched state updates
 */
const OptimizedMapComponent = ({ viewState, onViewStateChange, destinations, onMarkerClick }) => {
  // Refs for map instance and performance tracking
  const mapContainer = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef(new Map());
  const lastRenderTime = useRef(Date.now());

  // Optimized state management
  const { state, batchUpdate, immediateUpdate } = useBatchedUpdates({
    showFilters: true,
    activeCategories: [],
    filteredDestinations: destinations,
    selectedDestination: null,
    isMapLoading: true,
    mapError: null
  });

  // Debounced search and filter values
  const [searchTerm, setSearchTerm] = useState('');
  const [filterConfig, setFilterConfig] = useState(INITIAL_FILTERS);
  const debouncedSearch = useDebounce(searchTerm, 300);
  const debouncedFilters = useDebounce(filterConfig, 200);

  // Throttled map interaction handlers
  const throttledViewChange = useThrottle((newViewState) => {
    if (onViewStateChange) {
      onViewStateChange(newViewState);
    }
  }, 100);

  // Async map initialization
  const { 
    data: mapData, 
    isLoading: mapLoading, 
    error: mapError,
    execute: initializeMap 
  } = useAsyncData(
    useCallback(async () => {
      if (!mapContainer.current) throw new Error('Map container not available');
      
      // Dynamic import of mapbox for code splitting
      const mapboxgl = await import('mapbox-gl');
      const { initializeMap: mapInit } = await import('./mapService');
      
      const { map, isMoving } = await mapInit(
        mapContainer.current,
        viewState,
        throttledViewChange
      );
      
      mapInstance.current = map;
      
      return { map, mapboxgl: mapboxgl.default, isMoving };
    }, [viewState, throttledViewChange]),
    [viewState],
    { 
      cacheKey: 'map-initialization',
      onSuccess: (result) => {
        batchUpdate({ 
          isMapLoading: false, 
          mapError: null 
        });
      },
      onError: (error) => {
        batchUpdate({ 
          isMapLoading: false, 
          mapError: error 
        });
      }
    }
  );

  // Expensive calculation for filtered destinations (memoized)
  const { result: processedDestinations } = useExpensiveCalculation(
    () => {
      const startTime = performance.now();
      
      let filtered = destinations;

      // Apply search filter
      if (debouncedSearch) {
        filtered = filtered.filter(dest => 
          dest.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          dest.country.toLowerCase().includes(debouncedSearch.toLowerCase())
        );
      }

      // Apply category filters
      if (state.activeCategories.length > 0) {
        filtered = filtered.filter(dest => 
          state.activeCategories.includes(dest.category)
        );
      }

      // Apply additional filters from debouncedFilters
      if (debouncedFilters.countryFilter && debouncedFilters.countryFilter !== 'All') {
        filtered = filtered.filter(dest => dest.country === debouncedFilters.countryFilter);
      }

      // Sort by relevance or rating
      filtered.sort((a, b) => {
        if (debouncedSearch) {
          // Prioritize title matches over country matches
          const aScore = a.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ? 2 : 1;
          const bScore = b.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ? 2 : 1;
          if (aScore !== bScore) return bScore - aScore;
        }
        
        // Fallback to rating or alphabetical
        return (b.rating || 0) - (a.rating || 0) || a.title.localeCompare(b.title);
      });

      const endTime = performance.now();
      console.log(`Destination filtering took ${endTime - startTime} milliseconds`);
      
      return filtered;
    },
    [destinations, debouncedSearch, state.activeCategories, debouncedFilters],
    { 
      enableCache: true, 
      cacheSize: 20,
      enableLogging: process.env.NODE_ENV === 'development'
    }
  );

  // Memoized countries list for filter dropdown
  const availableCountries = useMemo(() => {
    return ['All', ...new Set(destinations.map(dest => dest.country))].sort();
  }, [destinations]);

  // Optimized marker update function
  const updateMarkers = useCallback(async () => {
    if (!mapInstance.current || !processedDestinations || !mapData?.mapboxgl) return;

    const map = mapInstance.current;
    const { createMarkerElement } = await import('./mapService');
    const mapboxgl = mapData.mapboxgl;

    // Remove markers that are no longer needed
    markersRef.current.forEach((marker, id) => {
      if (!processedDestinations.find(dest => dest.id === id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    // Add or update markers for visible destinations
    processedDestinations.forEach(destination => {
      const existingMarker = markersRef.current.get(destination.id);
      
      if (!existingMarker) {
        // Create new marker
        const markerElement = createMarkerElement(destination, COUNTRY_COLORS);
        const marker = new mapboxgl.Marker(markerElement)
          .setLngLat([destination.longitude, destination.latitude])
          .addTo(map);

        marker.getElement().addEventListener('click', () => {
          onMarkerClick?.(destination);
          immediateUpdate({ selectedDestination: destination });
        });

        markersRef.current.set(destination.id, marker);
      }
    });
  }, [processedDestinations, onMarkerClick, immediateUpdate, mapData]);

  // Initialize map on mount
  useEffect(() => {
    initializeMap();
  }, [initializeMap]);

  // Update markers when processed destinations change
  useEffect(() => {
    if (mapData && processedDestinations) {
      updateMarkers();
    }
  }, [mapData, processedDestinations, updateMarkers]);

  // Update filtered destinations in state
  useEffect(() => {
    batchUpdate({ filteredDestinations: processedDestinations });
  }, [processedDestinations, batchUpdate]);

  // Filter handlers
  const handleSearchChange = useCallback((value) => {
    setSearchTerm(value);
  }, []);

  const handleCategoryFilter = useCallback((categories) => {
    batchUpdate({ activeCategories: categories });
  }, [batchUpdate]);

  const handleCountryFilter = useCallback((country) => {
    setFilterConfig(prev => ({ ...prev, countryFilter: country }));
  }, []);

  // Render filter controls
  const renderFilterControls = () => (
    <div className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-lg p-4 max-w-sm">
      <div className="space-y-3">
        {/* Search Input */}
        <div>
          <input
            type="text"
            placeholder="Search destinations..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Country Filter */}
        <div>
          <select
            value={debouncedFilters.countryFilter || 'All'}
            onChange={(e) => handleCountryFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          >
            {availableCountries.map(country => (
              <option key={country} value={country}>{country}</option>
            ))}
          </select>
        </div>

        {/* Results count */}
        <div className="text-sm text-gray-600">
          Showing {processedDestinations.length} destinations
          {debouncedSearch && (
            <span className="text-blue-600 ml-1">
              for &quot;{debouncedSearch}&quot;
            </span>
          )}
        </div>

        {/* Clear filters */}
        {(debouncedSearch || debouncedFilters.countryFilter !== 'All') && (
          <button
            onClick={() => {
              setSearchTerm('');
              setFilterConfig(INITIAL_FILTERS);
              batchUpdate({ activeCategories: [] });
            }}
            className="text-sm text-red-600 hover:text-red-800 underline"
          >
            Clear all filters
          </button>
        )}
      </div>
    </div>
  );

  // Render performance stats in development
  const renderDevStats = () => {
    if (process.env.NODE_ENV !== 'development') return null;
    
    return (
      <div className="absolute bottom-4 right-4 z-10 bg-black bg-opacity-75 text-white p-2 rounded text-xs">
        <div>Destinations: {processedDestinations.length}</div>
        <div>Markers: {markersRef.current.size}</div>
        <div>Last render: {Date.now() - lastRenderTime.current}ms ago</div>
      </div>
    );
  };

  return (
    <div className="relative w-full h-full">
      {/* Map Container */}
      <div 
        ref={mapContainer} 
        className="w-full h-full"
        style={{ minHeight: '400px' }}
      />

      {/* Loading/Error States */}
      <AsyncWrapper
        isLoading={mapLoading}
        error={mapError}
        data={mapData}
        loadingComponent={() => (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <LoadingSpinner size="large" text="Loading interactive map..." />
          </div>
        )}
        errorComponent={({ error, retry }) => (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="text-center p-6">
              <div className="text-red-600 text-4xl mb-4">⚠️</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Map Failed to Load</h3>
              <p className="text-gray-600 mb-4">{error.message}</p>
              <button
                onClick={retry}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
        emptyWhen={() => false}
      >
        {/* Filter Controls */}
        {renderFilterControls()}
        
        {/* Development Stats */}
        {renderDevStats()}
      </AsyncWrapper>
    </div>
  );
};

export default OptimizedMapComponent;