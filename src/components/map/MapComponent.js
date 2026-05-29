"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { COUNTRY_COLORS, MAJOR_CITIES, INITIAL_FILTERS, MAP_USE_CLUSTERS } from './constants';
import {
  getCityRatingForDateRangeCached,
  getCityRatingForMonthsCached,
  getCityCalendarInfoCached
} from './mapUtils';
import { generatePopupContent } from './mapPopup';
import {
  initializeMap,
  updateMapView,
  createMarkerElement,
  addLoadingIndicator,
  createPopup,
  centerPopupInView,
  buildCitiesGeoJSON,
  addCitiesSourceAndLayers,
  setCitiesData
} from './mapService';
import { FilterToggleButton } from './FilterComponents';
import FilterContainer from './FilterContainer';
import RankedListPanel from './RankedListPanel';
import MapProgressBar from './MapProgressBar';
import CityDetailsPopup from './CityDetailsPopup';
import CacheManager from './CacheManager';
import DataPreloader from './DataPreloader';
import { useMapData, useCityRatings, useCurrentFilters, useLoadingStates } from '@/contexts/MapDataContext';

/**
 * Map Component
 * Renders an interactive map with city markers and filters
 */
function MapComponent({
  viewState,
  onViewStateChange,
  destinations,
  onMarkerClick,
  // Phase 4: when true (the path used by /explore), MapComponent skips
  // creating the Mapbox HTML popup on marker/feature click. The parent
  // owns the selected-city UI (SelectedCityCard) and we route through
  // `onMarkerClick` only. The HTML popup code in mapPopup.js stays in
  // place for fallback / future reuse.
  suppressHtmlPopup = false,
}) {
  // Refs
  const mapContainer = useRef(null);
  const mapInstance = useRef(null);
  const mapboxGLRef = useRef(null);
  const markersRef = useRef([]);
  const popupsRef = useRef([]);
  const isMoving = useRef(false);
  const mapInitialized = useRef(false); // Ref to track initialization
  // Phase 1: cluster-layer support.
  // We maintain a Map<id, city> for O(1) lookups when a feature is clicked,
  // and a "layers ready" flag so source-updating effects can wait for `load`.
  const cityByIdRef = useRef(new Map());
  const layersReadyRef = useRef(false);
  // Latest click handler is parked in a ref so the once-bound Mapbox
  // event listener always invokes the freshest closure.
  const featureClickHandlerRef = useRef(null);
  // Same ref pattern for updateMarkers — lets the marker-sync effect
  // call the latest version without referencing the const before its
  // declaration (TDZ). The ref is populated by a useEffect below.
  const updateMarkersRef = useRef(null);
  // Phase 2: epoch counter for cancelling stale rating fetches. Each
  // time the date filters change, we bump this value; any in-flight
  // fetch loop that finds its captured epoch != current epoch aborts.
  const ratingFetchEpochRef = useRef(0);
  
  // Global state from context
  const { actions } = useMapData();
  const cityRatings = useCityRatings();
  const [currentFilters, setCurrentFilters] = useCurrentFilters();
  const [loadingStates, setLoadingState] = useLoadingStates();
  
  // Local state.
  // Phase 3: filters default to collapsed. The user's preference is
  // persisted to localStorage so returning visitors get their last choice.
  const [showFilters, setShowFilters] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      const stored = window.localStorage.getItem('explore.showFilters');
      return stored === 'true';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem('explore.showFilters', String(showFilters));
    } catch {
      /* ignore quota / private mode */
    }
  }, [showFilters]);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [filteredDestinations, setFilteredDestinations] = useState([]);
  const [currentPopup, setCurrentPopup] = useState(null);
  const [showRankedListPanel, setShowRankedListPanel] = useState(false);
  const [selectedCityForDetails, setSelectedCityForDetails] = useState(null);
  const [showCacheManager, setShowCacheManager] = useState(false);

  // Memoized values
  const countries = useMemo(() => {
    return ['All', ...new Set(destinations.map(city => city.country))].sort();
  }, [destinations]);

  // Effect for initializing map
  useEffect(() => {
    // Prevent re-initialization if already done or container not ready
    if (mapInitialized.current || !mapContainer.current) {
      return;
    }
    mapInitialized.current = true; // Mark as initialized

    const setupMap = async () => {
      try {
        const { map, mapboxgl, isMoving: movingState } = await initializeMap(
          mapContainer.current,
          viewState,
          onViewStateChange
        );

        mapInstance.current = map;
        mapboxGLRef.current = mapboxgl;
        isMoving.current = movingState;

        map.once('load', async () => {
          if (MAP_USE_CLUSTERS) {
            // Build the source from the full destination list (filtering is
            // expressed by replacing the source data later, not by removing
            // and recreating layers).
            const initialGeoJSON = buildCitiesGeoJSON(destinations);
            // Maintain a lookup so feature clicks can resolve the full city.
            cityByIdRef.current = new Map(
              destinations.map((c) => [c.id || c.title, c])
            );
            addCitiesSourceAndLayers(map, initialGeoJSON);
            layersReadyRef.current = true;

            // Pointer cursor over the city dots.
            map.on('mouseenter', 'unclustered-point', () => {
              map.getCanvas().style.cursor = 'pointer';
            });
            map.on('mouseleave', 'unclustered-point', () => {
              map.getCanvas().style.cursor = '';
            });

            // City dot click: delegate to the latest React handler.
            map.on('click', 'unclustered-point', (e) => {
              const feature = e.features && e.features[0];
              if (!feature) return;
              const id = feature.properties.id;
              const city = cityByIdRef.current.get(id);
              if (!city) return;
              const handler = featureClickHandlerRef.current;
              if (handler) {
                handler(city);
              }
            });
          }
          await updateMarkers();
        });
      } catch (error) {
        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        console.error("[MapComponent] CRITICAL ERROR setting up map:", error);
        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
      }
    };

    setupMap();

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
        mapInitialized.current = false; // Reset on unmount
      }
    };
    // The init effect is intentionally single-shot (guarded by
    // mapInitialized.current). Referencing `updateMarkers` here would
    // create a temporal-dead-zone access since the useCallback is
    // declared further down; downstream syncing happens in the
    // separate effect that depends on `filteredDestinations`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update map view when viewState changes from parent
  useEffect(() => {
    if (!mapInstance.current) return;
    
    const newIsMoving = updateMapView(
      mapInstance.current, 
      viewState, 
      isMoving.current
    );
    
    if (newIsMoving) {
      isMoving.current = newIsMoving;
      setTimeout(() => {
        isMoving.current = false;
      }, 100);
    }
  }, [viewState]);

  // Effect for filtering destinations
  useEffect(() => {
    let results = [...destinations];
    
    if (!currentFilters.countries.includes('All')) {
      results = results.filter(city => currentFilters.countries.includes(city.country));
    }
    
    if (currentFilters.searchTerm) {
      const term = currentFilters.searchTerm.toLowerCase();
      results = results.filter(city => 
        city.title?.toLowerCase().includes(term) || 
        city.country?.toLowerCase().includes(term) ||
        (city.description && city.description.toLowerCase().includes(term))
      );
    }
    
    // Apply rating filters if we have date selection
    if (currentFilters.minRating > 0) {
      const hasDateFilters = 
        (!currentFilters.useFlexibleDates && currentFilters.startDate && currentFilters.endDate) || 
        (currentFilters.useFlexibleDates && currentFilters.selectedMonths.length > 0);
      
      if (hasDateFilters) {
        // Round to first decimal place for more consistent filtering
        const ratingToUse = parseInt(currentFilters.minRating);
        
        // Filter based on ratings
        const filteredByRating = results.filter(city => {
          const rating = cityRatings[city.title] || 0;
          const roundedRating = Math.round(rating * 10) / 10; // Round to 1 decimal
          return roundedRating >= ratingToUse;
        });
        
        results = filteredByRating;
      }
    }
    
    setFilteredDestinations(results);
  }, [destinations, currentFilters, cityRatings]);

  // Fetch ratings for all cities when date range changes.
  //
  // Phase 2 changes:
  //   1. Debounce by 250 ms so rapid filter edits (typing dates, toggling
  //      months) coalesce into a single fetch wave.
  //   2. Cancel via an epoch counter — any wave whose captured epoch is
  //      no longer current discards its results, preventing late stale
  //      writes from clobbering the user's latest selection.
  //   3. Viewport-priority ordering: cities currently rendered on screen
  //      are fetched in the first batch, with their ratings pushed to
  //      context immediately. Off-screen cities backfill in subsequent
  //      batches without blocking the visible result.
  useEffect(() => {
    const shouldFetchRatings =
      (!currentFilters.useFlexibleDates && currentFilters.startDate && currentFilters.endDate) ||
      (currentFilters.useFlexibleDates && currentFilters.selectedMonths.length > 0);

    if (!shouldFetchRatings) {
      // Bump epoch so any in-flight wave aborts on its next checkpoint.
      ratingFetchEpochRef.current += 1;
      actions.setCityRatings({});
      return;
    }

    const myEpoch = ++ratingFetchEpochRef.current;

    const debounceTimer = setTimeout(async () => {
      // Re-check that we're still the most recent request before starting.
      if (myEpoch !== ratingFetchEpochRef.current) return;

      setLoadingState('ratings', true);

      // Determine which cities the user can currently see. We deliberately
      // catch & swallow query errors — viewport prioritization is an
      // optimization; failure just falls back to original order.
      const visibleIds = new Set();
      if (mapInstance.current && layersReadyRef.current) {
        try {
          const features = mapInstance.current.queryRenderedFeatures({
            layers: ['unclustered-point'],
          });
          for (const f of features) {
            if (f.properties && f.properties.id) visibleIds.add(f.properties.id);
          }
        } catch {
          /* noop */
        }
      }

      const orderKey = (c) => c.id || c.title;
      const inViewport = [];
      const offscreen = [];
      for (const c of destinations) {
        if (visibleIds.has(orderKey(c))) inViewport.push(c);
        else offscreen.push(c);
      }
      const ordered = [...inViewport, ...offscreen];

      const fetchRating = async (city) => {
        try {
          const rating = currentFilters.useFlexibleDates
            ? await getCityRatingForMonthsCached(city, currentFilters.selectedMonths)
            : await getCityRatingForDateRangeCached(
                city,
                currentFilters.startDate,
                currentFilters.endDate
              );
          return [city.title, rating];
        } catch (error) {
          console.error(`Error fetching rating for ${city.title}:`, error);
          return [city.title, 0];
        }
      };

      const accumulated = {};
      const BATCH_SIZE = 25;

      try {
        for (let i = 0; i < ordered.length; i += BATCH_SIZE) {
          if (myEpoch !== ratingFetchEpochRef.current) return;
          const batch = ordered.slice(i, i + BATCH_SIZE);
          const results = await Promise.all(batch.map(fetchRating));
          if (myEpoch !== ratingFetchEpochRef.current) return;
          for (const [title, rating] of results) {
            accumulated[title] = rating;
          }
          // Push an incremental update so visible cities light up before
          // off-screen cities finish. This is the user-visible win.
          actions.setCityRatings({ ...accumulated });
        }
      } catch (error) {
        console.error('Error fetching ratings:', error);
      } finally {
        if (myEpoch === ratingFetchEpochRef.current) {
          setLoadingState('ratings', false);
        }
      }
    }, 250);

    return () => {
      clearTimeout(debounceTimer);
    };
  }, [
    destinations,
    currentFilters.startDate,
    currentFilters.endDate,
    currentFilters.useFlexibleDates,
    currentFilters.selectedMonths,
    actions,
    setLoadingState,
  ]);

  // Update markers when destinations or filters change. We dispatch
  // through `updateMarkersRef` to avoid a temporal-dead-zone access
  // on the `updateMarkers` const that's declared later in the file.
  useEffect(() => {
    if (!mapInstance.current || !mapboxGLRef.current) return;
    updateMarkersRef.current?.();
  }, [filteredDestinations]);

  /**
   * Update markers on the map.
   *
   * When MAP_USE_CLUSTERS is true, we keep the cluster layers stable and
   * simply replace the source data with the currently-visible cities.
   * The previous code path (per-city DOM markers) is retained for safe
   * rollback via the feature flag.
   */
  const updateMarkers = useCallback(async () => {
    if (!mapInstance.current || !mapboxGLRef.current) return;

    const citiesToShow = filteredDestinations.length > 0 ? filteredDestinations : destinations;
    if (!citiesToShow || citiesToShow.length === 0) {
      // Empty result set: clear the source (cluster path) or markers (legacy).
      if (MAP_USE_CLUSTERS && layersReadyRef.current) {
        setCitiesData(mapInstance.current, { type: 'FeatureCollection', features: [] });
      }
      return;
    }

    if (MAP_USE_CLUSTERS) {
      if (!layersReadyRef.current) return; // load handler will sync once layers are ready
      setCitiesData(mapInstance.current, buildCitiesGeoJSON(citiesToShow));
      return;
    }

    // -------- Legacy DOM-marker path (kept for rollback) --------
    markersRef.current.forEach(marker => marker.remove());
    popupsRef.current.forEach(popup => popup.remove());
    markersRef.current = [];
    popupsRef.current = [];

    for (const city of citiesToShow) {
      if (!city.longitude || !city.latitude) {
        continue;
      }

      const countryColor = COUNTRY_COLORS[city.country] || '#d63631';

      const isCapital = city.landmarks && city.landmarks.some(landmark =>
        landmark.includes('Capital') || landmark.includes('Palace') ||
        landmark.includes('Parliament') || landmark.includes('Royal')
      );
      const isMajorCity = MAJOR_CITIES.includes(city.title);

      const markerSize = isCapital || isMajorCity ? 28 : 22;
      const el = createMarkerElement(city, countryColor, isCapital, isMajorCity);

      const marker = new mapboxGLRef.current.Marker(el)
        .setLngLat([city.longitude, city.latitude])
        .addTo(mapInstance.current);

      el.addEventListener('click', () => handleMarkerClick(city, el, markerSize, countryColor));

      markersRef.current.push(marker);
    }
    // handleMarkerClick is only referenced from the legacy DOM-marker
    // path (dead while MAP_USE_CLUSTERS === true). It's declared later
    // in the file, so leaving it in the dep list would TDZ. Closure
    // staleness here only matters if the legacy path is ever revived
    // for emergency rollback, in which case React will get a slightly
    // older handler — non-fatal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredDestinations, destinations]);

  // Keep the marker-sync ref pointed at the latest updateMarkers.
  useEffect(() => {
    updateMarkersRef.current = updateMarkers;
  }, [updateMarkers]);

  /**
   * Handle marker click
   * @param {Object} city - City data
   * @param {HTMLElement} markerElement - Marker element
   * @param {number} markerSize - Marker size
   * @param {string} countryColor - Country color
   */
  const handleMarkerClick = useCallback(async (city, markerElement, markerSize, countryColor) => {
    // If the popup for this city is already open, exit early
    if (currentPopup && currentPopup.cityTitle === city.title) {
      return;
    }
    
    // Close any existing popup
    if (currentPopup) {
      currentPopup.remove();
      setCurrentPopup(null);
    }
    
    // Notify parent component
    onMarkerClick(city);

    // Phase 4: parent owns the selected-city UI. Skip popup work.
    if (suppressHtmlPopup) {
      mapInstance.current.flyTo({
        center: [city.longitude, city.latitude],
        zoom: Math.max(mapInstance.current.getZoom(), 5.5),
        duration: 600,
        essential: true,
      });
      return;
    }

    // Add loading indicator
    const loadingEl = addLoadingIndicator(markerElement, markerSize);
    
    try {
      let calendarInfo = null;
      if ((currentFilters.startDate && currentFilters.endDate) || 
          (currentFilters.useFlexibleDates && currentFilters.selectedMonths.length > 0)) {
        calendarInfo = await getCityCalendarInfoCached(
          city, 
          currentFilters.startDate, 
          currentFilters.endDate, 
          currentFilters.useFlexibleDates, 
          currentFilters.selectedMonths
        );
      }
      
      // Fly to the city's location with the popup already displayed
      mapInstance.current.flyTo({
        center: [city.longitude, city.latitude],
        zoom: mapInstance.current.getZoom(),
        duration: 800,
        essential: true
      });
      
      // Wait for flyTo to complete
      await new Promise(resolve => {
        const moveEndHandler = () => {
          mapInstance.current.off('moveend', moveEndHandler);
          resolve();
        };
        mapInstance.current.on('moveend', moveEndHandler);
      });
      
      // Remove loading indicator
      if (loadingEl.parentNode) {
        loadingEl.parentNode.removeChild(loadingEl);
      }
      
      // Create popup content
      const popupContent = generatePopupContent(city, calendarInfo, countryColor, currentFilters);
      
      // Create and set up popup in the center of the viewport
      const popup = createPopup(mapboxGLRef.current, popupContent);
      popup.cityTitle = city.title;
      
      // Use the centerPopupInView function to position the popup
      centerPopupInView(mapInstance.current, popup);
      
      // Add custom style to ensure the popup appears centered
      setTimeout(() => {
        const popupElement = document.querySelector('.mapboxgl-popup');
        if (popupElement) {
          popupElement.style.transform = 'translate(-50%, -50%)';
          popupElement.style.left = '50%';
          popupElement.style.top = '50%';
        }
      }, 10);
      
      setCurrentPopup(popup);
    } catch (error) {
      console.error("Error displaying popup:", error);
      if (loadingEl.parentNode) {
        loadingEl.parentNode.removeChild(loadingEl);
      }
    }
  }, [currentPopup, onMarkerClick, currentFilters, suppressHtmlPopup]);

  /**
   * Cluster-layer click handler. Mirrors handleMarkerClick but skips
   * DOM-marker-specific concerns (no per-marker loading indicator,
   * no marker element to attach to). Used only when MAP_USE_CLUSTERS
   * is true; the Mapbox click event provides the feature/city.
   */
  const handleFeatureClick = useCallback(async (city) => {
    if (!mapInstance.current || !mapboxGLRef.current) return;
    if (currentPopup && currentPopup.cityTitle === city.title) {
      return;
    }
    if (currentPopup) {
      currentPopup.remove();
      setCurrentPopup(null);
    }

    onMarkerClick(city);

    // Phase 4: parent owns the selected-city UI. Recenter the map on
    // the city so the React card and the marker visually connect, then
    // bail before any HTML popup work.
    if (suppressHtmlPopup) {
      mapInstance.current.flyTo({
        center: [city.longitude, city.latitude],
        zoom: Math.max(mapInstance.current.getZoom(), 5.5),
        duration: 600,
        essential: true,
      });
      return;
    }

    try {
      let calendarInfo = null;
      if ((currentFilters.startDate && currentFilters.endDate) ||
          (currentFilters.useFlexibleDates && currentFilters.selectedMonths.length > 0)) {
        calendarInfo = await getCityCalendarInfoCached(
          city,
          currentFilters.startDate,
          currentFilters.endDate,
          currentFilters.useFlexibleDates,
          currentFilters.selectedMonths
        );
      }

      mapInstance.current.flyTo({
        center: [city.longitude, city.latitude],
        zoom: mapInstance.current.getZoom(),
        duration: 800,
        essential: true,
      });

      await new Promise((resolve) => {
        const moveEndHandler = () => {
          mapInstance.current.off('moveend', moveEndHandler);
          resolve();
        };
        mapInstance.current.on('moveend', moveEndHandler);
      });

      const countryColor = COUNTRY_COLORS[city.country] || '#d63631';
      const popupContent = generatePopupContent(city, calendarInfo, countryColor, currentFilters);
      const popup = createPopup(mapboxGLRef.current, popupContent);
      popup.cityTitle = city.title;
      centerPopupInView(mapInstance.current, popup);

      // Match the centering hack used by the DOM-marker path until the
      // unified SelectedCityCard lands in phase 4.
      setTimeout(() => {
        const popupElement = document.querySelector('.mapboxgl-popup');
        if (popupElement) {
          popupElement.style.transform = 'translate(-50%, -50%)';
          popupElement.style.left = '50%';
          popupElement.style.top = '50%';
        }
      }, 10);

      setCurrentPopup(popup);
    } catch (error) {
      console.error('Error displaying popup:', error);
    }
  }, [currentPopup, onMarkerClick, currentFilters, suppressHtmlPopup]);

  // Keep the ref pointing at the freshest handler so the once-bound
  // Mapbox 'click' listener always sees current closures.
  useEffect(() => {
    featureClickHandlerRef.current = handleFeatureClick;
  }, [handleFeatureClick]);

  /**
   * Filter event handlers
   */
  const handleToggleFilters = useCallback(() => {
    if (currentPopup) {
      currentPopup.remove();
      setCurrentPopup(null);
    }
    setShowFilters(prev => !prev);
    setTimeout(() => {
      if (mapInstance.current) {
        mapInstance.current.resize();
      }
    }, 300);
  }, [currentPopup]);

  const handleSearchChange = useCallback((value) => {
    if (currentPopup) {
      currentPopup.remove();
      setCurrentPopup(null);
    }
    setCurrentFilters(prev => ({
      ...prev,
      searchTerm: value
    }));
  }, [currentPopup, setCurrentFilters]);

  const handleDateRangeChange = useCallback((field, value) => {
    if (currentPopup) {
      currentPopup.remove();
      setCurrentPopup(null);
    }
    setCurrentFilters(prev => ({
      ...prev,
      [field]: value
    }));
  }, [currentPopup, setCurrentFilters]);

  const handleMonthSelection = useCallback((month, selected) => {
    if (currentPopup) {
      currentPopup.remove();
      setCurrentPopup(null);
    }
    setCurrentFilters(prev => {
      const currentMonths = prev.selectedMonths || [];
      let newMonths;
      if (selected) {
        newMonths = [...currentMonths, month];
      } else {
        newMonths = currentMonths.filter(m => m !== month);
      }
      return {
        ...prev,
        selectedMonths: newMonths
      };
    });
  }, [currentPopup, setCurrentFilters]);

  const toggleDateMode = useCallback(() => {
    if (currentPopup) {
      currentPopup.remove();
      setCurrentPopup(null);
    }
    setCurrentFilters(prev => ({
      ...prev,
      useFlexibleDates: !prev.useFlexibleDates
    }));
  }, [currentPopup, setCurrentFilters]);

  const handleRatingChange = useCallback((value) => {
    if (currentPopup) {
      currentPopup.remove();
      setCurrentPopup(null);
    }
    setCurrentFilters(prev => ({
      ...prev,
      minRating: parseInt(value)
    }));
  }, [currentPopup, setCurrentFilters]);

  const toggleCountry = useCallback((country) => {
    if (currentPopup) {
      currentPopup.remove();
      setCurrentPopup(null);
    }
    setCurrentFilters(prev => {
      if (country === 'All') {
        return {
          ...prev,
          countries: ['All']
        };
      }
      let newCountries = prev.countries.filter(c => c !== 'All');
      if (newCountries.includes(country)) {
        newCountries = newCountries.filter(c => c !== country);
      } else {
        newCountries.push(country);
      }
      if (newCountries.length === 0) {
        newCountries = ['All'];
      }
      return {
        ...prev,
        countries: newCountries
      };
    });
  }, [currentPopup, setCurrentFilters]);

  const handleToggleCountryDropdown = useCallback(() => {
    setShowCountryDropdown(prev => !prev);
  }, []);

  const toggleRankedListPanel = useCallback(() => {
    setShowRankedListPanel(prev => !prev);
    if (showRankedListPanel) {
      setSelectedCityForDetails(null);
    }
  }, [showRankedListPanel]);

  const handleShowCityDetails = useCallback((city) => {
    setSelectedCityForDetails(city);
  }, []);

  const handleCloseCityDetails = useCallback(() => {
    setSelectedCityForDetails(null);
  }, []);

  // Phase 3: reset filters to their initial state and dismiss any open
  // popup. Wired into FilterContainer's "Clear all filters" link.
  const handleClearFilters = useCallback(() => {
    if (currentPopup) {
      currentPopup.remove();
      setCurrentPopup(null);
    }
    setCurrentFilters(INITIAL_FILTERS);
  }, [currentPopup, setCurrentFilters]);

  return (
    <div className="relative h-screen">
      <DataPreloader destinations={destinations} />
      <div ref={mapContainer} className="absolute top-0 bottom-0 w-full" style={{ height: '100%' }} />
      
      <div className="absolute top-4 left-4 z-30">
        <FilterToggleButton showFilters={showFilters} onToggle={handleToggleFilters} />
      </div>

      {/* Phase 6: filter panel is a bottom-sheet on mobile and a docked
          top-left card on desktop. A tap-shield backdrop sits behind it
          on mobile so the user can dismiss by tapping outside. */}
      {showFilters && (
        <>
          <div
            className="absolute inset-0 z-20 bg-black/30 md:hidden"
            onClick={handleToggleFilters}
            aria-hidden="true"
          />
          <div className="absolute z-30 inset-x-0 bottom-0 md:inset-x-auto md:bottom-auto md:top-16 md:left-4">
            <FilterContainer
              countries={['All', ...Object.keys(destinations.reduce((acc, d) => ({ ...acc, [d.country]: true }), {}))]}
              filters={currentFilters}
              showCountryDropdown={showCountryDropdown}
              dateRangeLoading={loadingStates.ratings}
              destinationCount={filteredDestinations.length}
              totalDestinationCount={destinations.length}
              cityRatings={cityRatings}
              onToggleCountryDropdown={handleToggleCountryDropdown}
              onToggleCountry={toggleCountry}
              onSearchChange={handleSearchChange}
              onDateChange={handleDateRangeChange}
              onDateTypeToggle={toggleDateMode}
              onMonthToggle={handleMonthSelection}
              onRatingChange={handleRatingChange}
              showRankedListPanel={showRankedListPanel}
              onToggleRankedList={toggleRankedListPanel}
              onClearFilters={handleClearFilters}
            />
          </div>
        </>
      )}
      
      {showRankedListPanel && (
        <RankedListPanel 
          destinationsWithRatings={filteredDestinations.map(dest => ({
            ...dest,
            rating: cityRatings[dest.title] || 0
          }))}
          onClose={toggleRankedListPanel} 
          onCitySelect={handleShowCityDetails}
        />
      )}
      
      {selectedCityForDetails && (
        <CityDetailsPopup
          city={selectedCityForDetails}
          dateFilters={{
            startDate: currentFilters.startDate,
            endDate: currentFilters.endDate,
            useFlexibleDates: currentFilters.useFlexibleDates,
            selectedMonths: currentFilters.selectedMonths
          }}
          onClose={handleCloseCityDetails}
        />
      )}
      
      {/* Phase 6: non-blocking top progress bar. The blocking
          LoadingOverlay was removed — with the Phase 2 debounced +
          viewport-priority rating pipeline, visible cities already
          light up first; we no longer need to freeze the whole map. */}
      <MapProgressBar
        visible={loadingStates.ratings}
        label="Scoring cities for your dates…"
      />

      {/* Cache Manager for debugging - only visible in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-4 right-4 z-10">
          <button
            onClick={() => setShowCacheManager(!showCacheManager)}
            className="bg-gray-800 text-white px-3 py-2 rounded-lg text-sm hover:bg-gray-700 transition-colors"
            title="Cache Manager"
          >
            🗄️ Cache
          </button>
        </div>
      )}

      <CacheManager isVisible={showCacheManager} />
    </div>
  );
}

export default MapComponent;