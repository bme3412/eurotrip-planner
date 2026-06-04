"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { COUNTRY_COLORS, MAJOR_CITIES, INITIAL_FILTERS, MAP_USE_CLUSTERS } from './constants';
import { getCityCalendarInfoCached } from './mapUtils';
import { bandFor } from '@/lib/scoring/qualitative';
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
  setCitiesData,
  applyRankedPaint
} from './mapService';
import { FilterToggleButton } from './FilterComponents';
import FilterContainer from './FilterContainer';
import RankedListPanel from './RankedListPanel';
import MapProgressBar from './MapProgressBar';
import CacheManager from './CacheManager';
import { useMapData, useCityRankings, useCurrentFilters, useLoadingStates } from '@/contexts/MapDataContext';

const MONTH_INDEX_RE = /^\d+$/;

/**
 * Resolve the effective {start,end} ISO date range from the current filters —
 * either fixed dates, or flexible months (0-11 indices) spanned into a range.
 * Returns null when there's nothing to rank for.
 */
function resolveDateRange(filters) {
  if (!filters.useFlexibleDates && filters.startDate && filters.endDate) {
    return { start: filters.startDate, end: filters.endDate };
  }
  if (filters.useFlexibleDates && Array.isArray(filters.selectedMonths) && filters.selectedMonths.length > 0) {
    return monthsToDateRange(filters.selectedMonths);
  }
  return null;
}

/** Span an array of month indices (0-11) into a forward-looking ISO range. */
function monthsToDateRange(months) {
  const idx = months
    .map((m) => (MONTH_INDEX_RE.test(String(m)) ? Number(m) : -1))
    .filter((m) => m >= 0 && m <= 11)
    .sort((a, b) => a - b);
  if (!idx.length) return null;
  const now = new Date();
  const year = now.getFullYear();
  const start = new Date(year, idx[0], 1);
  const end = new Date(year, idx[idx.length - 1] + 1, 0); // last day of the latest month
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { start: fmt(start), end: fmt(end) };
}

/** Short date for the persistent date-context badge (e.g. "Jun 15"). */
function fmtBadgeDate(iso) {
  if (!iso) return '';
  try {
    return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

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
  // Date context handed off from the homepage "Plan Trip" flow. When present,
  // Explore seeds its filters and ranks cities for these dates on arrival.
  initialStart = null,
  initialEnd = null,
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
  // State mirror of layersReadyRef so data/paint effects re-run once the map's
  // source layers exist (the precomputed ranking can resolve before map load).
  const [layersReady, setLayersReady] = useState(false);
  // Two-way list<->map highlight via Mapbox feature-state.
  const [hoveredId, setHoveredId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const prevHoveredRef = useRef(null);
  const prevSelectedRef = useRef(null);
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
  const cityRankings = useCityRankings();
  const [currentFilters, setCurrentFilters] = useCurrentFilters();
  const [loadingStates, setLoadingState] = useLoadingStates();
  // Guard so the URL date hand-off seeds the filters exactly once.
  const seededDatesRef = useRef(false);
  
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
            const initialGeoJSON = buildCitiesGeoJSON(destinations, cityRankings);
            // Maintain a lookup so feature clicks can resolve the full city.
            cityByIdRef.current = new Map(
              destinations.map((c) => [c.id || c.title, c])
            );
            addCitiesSourceAndLayers(map, initialGeoJSON);
            layersReadyRef.current = true;
            setLayersReady(true);

            // Pointer cursor + hover highlight over the city dots (map -> list).
            map.on('mouseenter', 'unclustered-point', () => {
              map.getCanvas().style.cursor = 'pointer';
            });
            map.on('mousemove', 'unclustered-point', (e) => {
              const id = e.features?.[0]?.properties?.id;
              if (id) setHoveredId(id);
            });
            map.on('mouseleave', 'unclustered-point', () => {
              map.getCanvas().style.cursor = '';
              setHoveredId(null);
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
    
    // Quality is conveyed by the ranked-list bands and marker colors — the map
    // shows every city that matches country/search; ranking never hides cities.
    setFilteredDestinations(results);
  }, [destinations, currentFilters]);

  // Seed the date filters from the homepage hand-off exactly once, and open the
  // ranked list so the page arrives "with context" rather than an empty browse.
  useEffect(() => {
    if (seededDatesRef.current) return;
    if (initialStart && initialEnd) {
      seededDatesRef.current = true;
      setCurrentFilters((prev) => ({
        ...prev,
        startDate: initialStart,
        endDate: initialEnd,
        useFlexibleDates: false,
      }));
      setShowRankedListPanel(true);
    }
  }, [initialStart, initialEnd, setCurrentFilters]);

  // Rank cities for the active date range with the V4 engine — the SAME ranking
  // the /results scoreboard uses — via /api/suggestions. This replaces the
  // former per-city rating path so Explore and the scoreboard never disagree.
  // Debounced + epoch-cancelled so rapid filter edits coalesce and stale waves
  // abort. Populates the rich `cityRankings` (band + why, for the ranked list,
  // selected card, and marker colors).
  useEffect(() => {
    const range = resolveDateRange(currentFilters);

    if (!range) {
      ratingFetchEpochRef.current += 1;
      actions.setCityRankings({});
      actions.setRankedItems([]);
      return;
    }

    const myEpoch = ++ratingFetchEpochRef.current;

    const debounceTimer = setTimeout(async () => {
      if (myEpoch !== ratingFetchEpochRef.current) return;
      setLoadingState('ratings', true);
      try {
        const res = await fetch(
          `/api/suggestions?startDate=${range.start}&endDate=${range.end}&v=4&flat=true&limit=220`
        );
        if (!res.ok) throw new Error(`suggestions ${res.status}`);
        const data = await res.json();
        if (myEpoch !== ratingFetchEpochRef.current) return;

        const items = Array.isArray(data?.items) ? data.items : [];
        const rankings = {};
        items.forEach((item, index) => {
          const id = item.id || item.cityId;
          const score = Number(item.score) || 0;
          if (id) {
            const confidence = typeof item.confidence === 'number' ? item.confidence : null;
            const band = bandFor(score, confidence);
            rankings[id] = {
              id,
              title: item.title,
              country: item.country,
              score,
              confidence,
              tier: item.tier ?? null,
              band,
              limited: band.key === 'limited',
              why: item.why || null,
              whyExpanded: item.whyExpanded || null,
              weather: item.weather || null,
              crowdLevel: item.crowdLevel || null,
              image: item.image || null,
              rank: index + 1,
            };
          }
        });
        actions.setCityRankings(rankings);
        actions.setRankedItems(items);
      } catch (error) {
        console.error('Failed to load ranked suggestions:', error);
      } finally {
        if (myEpoch === ratingFetchEpochRef.current) {
          setLoadingState('ratings', false);
        }
      }
    }, 250);

    return () => {
      clearTimeout(debounceTimer);
    };
    // Intentionally key on the date fields only — re-running on every
    // currentFilters change (countries/search) would refire the
    // ranking fetch needlessly. resolveDateRange reads the full object but
    // only the date fields affect its output.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
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
  }, [filteredDestinations, cityRankings, layersReady]);

  // Repaint markers by band whenever the ranking set changes (or once the
  // layers exist): band color + size + dimmed unranked when dates are active,
  // neutral country dots when not.
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !layersReady) return;
    applyRankedPaint(map, Object.keys(cityRankings).length > 0);
  }, [cityRankings, layersReady]);

  // Mirror hover/selection into Mapbox feature-state so markers glow in sync
  // with the list (and clear the previously-flagged feature).
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !layersReady) return;
    const prev = prevHoveredRef.current;
    if (prev && prev !== hoveredId) {
      try { map.setFeatureState({ source: 'cities', id: prev }, { hovered: false }); } catch { /* feature not yet rendered */ }
    }
    if (hoveredId) {
      try { map.setFeatureState({ source: 'cities', id: hoveredId }, { hovered: true }); } catch { /* noop */ }
    }
    prevHoveredRef.current = hoveredId;
  }, [hoveredId, layersReady]);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !layersReady) return;
    const prev = prevSelectedRef.current;
    if (prev && prev !== selectedId) {
      try { map.setFeatureState({ source: 'cities', id: prev }, { selected: false }); } catch { /* noop */ }
    }
    if (selectedId) {
      try { map.setFeatureState({ source: 'cities', id: selectedId }, { selected: true }); } catch { /* noop */ }
    }
    prevSelectedRef.current = selectedId;
  }, [selectedId, layersReady]);

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
      setCitiesData(mapInstance.current, buildCitiesGeoJSON(citiesToShow, cityRankings));
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
  }, [filteredDestinations, destinations, cityRankings]);

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
    setSelectedId(city.id || city.title);

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

  // Commit an exact { start, end } pick from the in-panel calendar. The ranking
  // fetch keys on these fields; opening the ranked rail keeps the result visible.
  const handlePickDateRange = useCallback(({ start, end }) => {
    if (currentPopup) {
      currentPopup.remove();
      setCurrentPopup(null);
    }
    setCurrentFilters(prev => ({
      ...prev,
      startDate: start || '',
      endDate: end || '',
      useFlexibleDates: false,
    }));
    if (start && end) setShowRankedListPanel(true);
  }, [currentPopup, setCurrentFilters]);

  const toggleDateMode = useCallback(() => {
    setCurrentFilters(prev => ({ ...prev, useFlexibleDates: !prev.useFlexibleDates }));
  }, [setCurrentFilters]);

  const handleMonthSelection = useCallback((month, selected) => {
    setCurrentFilters(prev => {
      const months = prev.selectedMonths || [];
      const next = selected ? [...months, month] : months.filter(m => m !== month);
      return { ...prev, selectedMonths: next };
    });
    setShowRankedListPanel(true);
  }, [setCurrentFilters]);

  // Clear just the date selection (leaves country/search untouched).
  const handleClearDates = useCallback(() => {
    setCurrentFilters(prev => ({
      ...prev,
      startDate: '',
      endDate: '',
      useFlexibleDates: false,
      selectedMonths: [],
    }));
  }, [setCurrentFilters]);

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
    setShowRankedListPanel((prev) => !prev);
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

  // Cities ranked for the active dates, intersected with the country/search
  // filter and ordered by rank — drives the ranked list panel.
  const filteredIds = useMemo(
    () => new Set(filteredDestinations.map((d) => d.id || d.title)),
    [filteredDestinations]
  );
  const rankedItems = useMemo(
    () =>
      Object.values(cityRankings)
        .filter((r) => filteredIds.has(r.id))
        .sort((a, b) => (a.rank || 999) - (b.rank || 999)),
    [cityRankings, filteredIds]
  );
  const activeDateRange = useMemo(() => resolveDateRange(currentFilters), [currentFilters]);

  // Selecting a ranked city focuses it on the map and opens the same
  // SelectedCityCard a marker click would (one unified selection path).
  const handleRankedSelect = useCallback(
    (entry) => {
      const dest = destinations.find((d) => (d.id || d.title) === entry.id);
      if (dest) handleFeatureClick(dest);
    },
    [destinations, handleFeatureClick]
  );

  return (
    <div className="relative h-screen">
      <div ref={mapContainer} className="absolute top-0 bottom-0 w-full" style={{ height: '100%' }} />
      
      <div className="absolute top-4 left-4 z-30 flex items-center gap-2">
        <FilterToggleButton showFilters={showFilters} onToggle={handleToggleFilters} />
        {/* Persistent date context + entry point. Clicking opens the Filters
            panel, whose first section is the date picker — so dates and the
            browse filters live in one surface (no overlapping panels). */}
        <button
          type="button"
          onClick={() => setShowFilters(true)}
          className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-lg ring-1 ring-slate-200 backdrop-blur hover:bg-white"
        >
          <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {/* Canonical trip-context readout: dates + city count, shown once. */}
          {activeDateRange ? (
            <span>
              {fmtBadgeDate(activeDateRange.start)} – {fmtBadgeDate(activeDateRange.end)}
              <span className="hidden text-slate-400 sm:inline"> · {filteredDestinations.length} {filteredDestinations.length === 1 ? 'city' : 'cities'}</span>
              <span className="ml-1.5 hidden text-blue-600 sm:inline">Change</span>
            </span>
          ) : (
            <span className="text-blue-600">Add travel dates</span>
          )}
        </button>
      </div>

      {/* Phase 6: filter panel is a bottom-sheet on mobile and a docked
          top-left card on desktop. A tap-shield backdrop sits behind it
          on mobile so the user can dismiss by tapping outside. */}
      {showFilters && (
        <>
          <div
            className="absolute inset-0 z-[45] bg-black/30 md:hidden"
            onClick={handleToggleFilters}
            aria-hidden="true"
          />
          <div className="absolute z-50 inset-x-0 bottom-0 md:inset-x-auto md:bottom-auto md:top-[4.75rem] md:left-4">
            <FilterContainer
              countries={['All', ...Object.keys(destinations.reduce((acc, d) => ({ ...acc, [d.country]: true }), {}))]}
              filters={currentFilters}
              showCountryDropdown={showCountryDropdown}
              destinationCount={filteredDestinations.length}
              onToggleCountryDropdown={handleToggleCountryDropdown}
              onToggleCountry={toggleCountry}
              onSearchChange={handleSearchChange}
              onPickDateRange={handlePickDateRange}
              onDateTypeToggle={toggleDateMode}
              onMonthToggle={handleMonthSelection}
              onClearDates={handleClearDates}
              onClearFilters={handleClearFilters}
            />
          </div>
        </>
      )}
      
      {showRankedListPanel ? (
        <RankedListPanel
          items={rankedItems}
          dateRange={activeDateRange}
          loading={loadingStates.ratings}
          highlightId={selectedId || hoveredId}
          onCityHover={setHoveredId}
          onClose={toggleRankedListPanel}
          onCitySelect={handleRankedSelect}
        />
      ) : (
        // Re-open affordance after the rail is closed (replaces the removed
        // filter-panel "List" button).
        <button
          type="button"
          onClick={toggleRankedListPanel}
          className="absolute top-[4.75rem] right-4 z-20 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-lg ring-1 ring-slate-200 backdrop-blur hover:bg-white"
        >
          <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h10" />
          </svg>
          Ranked
        </button>
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