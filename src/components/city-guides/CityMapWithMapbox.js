'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  getStandardCategory,
  getCategoryColor,
  computeTopIconicList,
  getMarkerSize,
} from '@/components/map/helpers';
import { matchesSmartFilters } from '@/components/map/filters';

import { getPriorityColor } from './citymap/lib/priority';
import { computeIconicAttractionNames } from './citymap/lib/iconic';
import { getAttractionCoords } from './citymap/lib/coords';
import {
  createMarkerElement,
  applySelectedStyling,
  applyUnselectedStyling,
} from './citymap/dom/markerFactory';
import {
  buildAttractionPopupHtml,
  buildSelectedPopupHtml,
  setupExpandToggle,
} from './citymap/dom/popupContent';
import { buildAttractionsGeoJson } from './citymap/dom/geojson';

import SmartFiltersPanel from './citymap/SmartFiltersPanel';
import MapLegend from './citymap/MapLegend';
import LoadingOverlay from './citymap/LoadingOverlay';
import ErrorOverlay from './citymap/ErrorOverlay';
import MapStyles from './citymap/MapStyles';

/**
 * Mapbox-based interactive city map.
 *
 * The heavy lifting now lives in:
 *   • citymap/lib/{priority,markdown,iconic,coords}.js — pure helpers
 *   • citymap/dom/{markerFactory,popupContent,geojson}.js — DOM/HTML builders
 *   • citymap/{SmartFiltersPanel,MapLegend,LoadingOverlay,ErrorOverlay,MapStyles}.jsx
 *
 * This file orchestrates Mapbox lifecycle: map init, marker rendering, the
 * dedicated "selected attraction" popup, category processing, and local-time
 * display. Selection handling is intentionally split from marker rendering so
 * changing the selected pin doesn't recreate all markers.
 */
export default function CityMapWithMapbox({
  attractions = [],
  cityName = 'City',
  center = [0, 0],
  zoom = 12,
  selectedAttraction = null,
  onHover = () => {},
  onSelect = () => {},
}) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const popupRef = useRef(null);
  const markersRef = useRef([]);
  const mapboxglRef = useRef(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [styleLoaded, setStyleLoaded] = useState(false);
  const [activeCategories, setActiveCategories] = useState([]);
  const [smartFilters, setSmartFilters] = useState({
    timeFilter: 'all',
    priceFilter: 'all',
    durationFilter: 'all',
    indoorFilter: 'all',
  });
  const [mapError, setMapError] = useState(null);
  const [categoriesProcessed, setCategoriesProcessed] = useState(false);
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);
  const [showingIconicOnly, setShowingIconicOnly] = useState(true);
  const [currentLocalTime, setCurrentLocalTime] = useState('');
  const [renderCue, setRenderCue] = useState(0);
  const [selectedLocal, setSelectedLocal] = useState(selectedAttraction);

  useEffect(() => {
    setSelectedLocal(selectedAttraction);
  }, [selectedAttraction]);

  // Keep latest hover/select handlers without re-running the marker effect when
  // parent passes new function identities.
  const onHoverRef = useRef(onHover);
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onHoverRef.current = onHover;
    onSelectRef.current = onSelect;
  });

  const iconicAttractionNames = useMemo(
    () => computeIconicAttractionNames(attractions, 12),
    [attractions],
  );

  const matchesSmartFiltersLocal = useCallback(
    (attraction) => matchesSmartFilters(attraction, smartFilters),
    [smartFilters],
  );

  // Track previous selection for smooth transitions.
  const prevSelectedRef = useRef(null);

  // Selection animation + map focus. Mounts a dynamic marker for the selected
  // attraction if it's not in the current visible set.
  useEffect(() => {
    if (!map.current || !mapboxglRef.current) return;

    const prevSelected = prevSelectedRef.current;
    prevSelectedRef.current = selectedLocal;

    const isSwitching = prevSelected && selectedLocal && prevSelected.name !== selectedLocal.name;

    let selectedMarkerExists = false;
    if (selectedLocal) {
      selectedMarkerExists = markersRef.current.some(
        (m) => m.getElement()?.getAttribute('data-attraction-name') === selectedLocal.name,
      );
    }

    if (selectedLocal && !selectedMarkerExists) {
      const coords = getAttractionCoords(selectedLocal);
      if (coords) {
        const [lng, lat] = coords;
        const globalIndex = attractions.findIndex((a) => a?.name === selectedLocal.name) + 1;
        const category = selectedLocal.category || selectedLocal.type || 'Uncategorized';
        let color = getPriorityColor(selectedLocal);
        if (!color || color.toLowerCase() === '#6b7280') {
          color = getCategoryColor(category) || '#2563eb';
        }

        const markerEl = createMarkerElement({
          attraction: selectedLocal,
          globalIndex,
          color,
          selected: true,
        });

        markerEl.addEventListener('mouseenter', () => onHover(selectedLocal));
        markerEl.addEventListener('mouseleave', () => onHover(null));
        markerEl.addEventListener('click', () => {
          setSelectedLocal(selectedLocal);
          onSelect(selectedLocal);
        });

        const marker = new mapboxglRef.current.Marker(markerEl)
          .setLngLat([lng, lat])
          .addTo(map.current);

        markersRef.current.push(marker);

        map.current.easeTo({
          center: [lng, lat],
          zoom: Math.max(map.current.getZoom(), 15),
          duration: 600,
          essential: true,
        });
      }
    }

    // Update existing markers — selected vs unselected styling.
    markersRef.current.forEach((marker) => {
      const markerElement = marker.getElement();
      const attractionName = markerElement.getAttribute('data-attraction-name');

      if (selectedLocal && attractionName === selectedLocal.name) {
        applySelectedStyling(markerElement);
        const coordinates = marker.getLngLat();
        if (coordinates && selectedMarkerExists) {
          const animationMethod = isSwitching ? 'easeTo' : 'flyTo';
          const duration = isSwitching ? 600 : 800;
          map.current[animationMethod]({
            center: [coordinates.lng, coordinates.lat],
            zoom: Math.max(map.current.getZoom(), 15),
            duration,
            essential: true,
          });
        }
      } else {
        applyUnselectedStyling(markerElement);
      }
    });

    // On deselection, frame all attractions again.
    if (!selectedLocal && prevSelected) {
      const bounds = new mapboxglRef.current.LngLatBounds();
      attractions.forEach((attraction) => {
        const coords = getAttractionCoords(attraction);
        if (coords) bounds.extend(coords);
      });
      if (!bounds.isEmpty()) {
        map.current.fitBounds(bounds, { padding: 50, duration: 800, essential: true });
      }
    }
  }, [selectedLocal, attractions, onHover, onSelect]);

  // Dedicated popup for the selected attraction. Updates in place when the
  // selection changes for smooth visual transitions.
  useEffect(() => {
    if (!map.current || !mapboxglRef.current) return;

    if (!selectedLocal) {
      if (popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
      }
      return;
    }

    const coords = getAttractionCoords(selectedLocal);
    if (!coords) return;

    const { html, popupId, isLongDesc, cleanDesc, truncatedDesc } = buildSelectedPopupHtml(selectedLocal);
    const wireToggle = () =>
      setupExpandToggle({ popupId, isLongDesc, cleanDesc, truncatedDesc });

    if (popupRef.current) {
      popupRef.current.setLngLat(coords);
      popupRef.current.setHTML(html);
      setTimeout(wireToggle, 50);
    } else {
      const popup = new mapboxglRef.current.Popup({
        offset: [0, 10],
        anchor: 'top',
        closeOnMove: false,
        maxWidth: '440px',
        className: 'selected-popup',
        closeOnClick: false,
      })
        .setLngLat(coords)
        .setHTML(html)
        .addTo(map.current);
      popupRef.current = popup;
      setTimeout(wireToggle, 50);
    }
  }, [selectedLocal]);

  // Standardise + count categories once attractions are available.
  const processCategories = useCallback(() => {
    if (categoriesProcessed) return;

    const uniqueCategories = [
      ...new Set(
        attractions.map((attr) =>
          getStandardCategory(attr.category || attr.type || 'Uncategorized'),
        ),
      ),
    ];

    setActiveCategories(uniqueCategories);
    setCategoriesProcessed(true);
  }, [attractions, categoriesProcessed]);

  // Initialise the Mapbox map exactly once.
  useEffect(() => {
    if (map.current) return;

    const initializeMap = async () => {
      try {
        const mapboxglModule = (await import('mapbox-gl')).default;
        mapboxglRef.current = mapboxglModule;
        mapboxglRef.current.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

        try {
          if (mapContainer.current) mapContainer.current.innerHTML = '';
        } catch (_) {}

        map.current = new mapboxglRef.current.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center,
          zoom,
          attributionControl: false,
          pitchWithRotate: false,
        });

        map.current.addControl(
          new mapboxglRef.current.NavigationControl({ showCompass: true, visualizePitch: true }),
          'top-right',
        );
        map.current.addControl(new mapboxglRef.current.FullscreenControl(), 'top-right');
        map.current.addControl(
          new mapboxglRef.current.AttributionControl({
            compact: true,
            customAttribution: `© ${new Date().getFullYear()} | ${cityName} City Guide`,
          }),
          'bottom-right',
        );

        map.current.on('load', () => {
          setMapLoaded(true);
          processCategories();
          try {
            if (mapContainer.current) mapContainer.current.classList.add('labels-visible');
          } catch (_) {}
          setRenderCue((c) => c + 1);
        });

        map.current.on('styledata', () => setStyleLoaded(true));

        map.current.on('zoom', () => {
          try {
            const z = map.current.getZoom();
            if (mapContainer.current) {
              if (z >= 13.5) mapContainer.current.classList.add('labels-visible');
              else mapContainer.current.classList.remove('labels-visible');
            }
          } catch (_) {}
        });

        map.current.on('error', (e) => {
          console.error('Mapbox error:', e);
          setMapError(e.error ? e.error.message : 'Unknown map error');
        });
      } catch (err) {
        console.error('Error initializing map:', err);
        setMapError(err.message || 'Failed to initialize map');
      }
    };

    initializeMap();

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [center, zoom, cityName, attractions, processCategories]);

  // Collapse filters by default on small screens.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setFiltersCollapsed(window.innerWidth < 640);
    }
  }, []);

  // Local time, updated every minute.
  useEffect(() => {
    const cityTzMap = { paris: 'Europe/Paris' };
    const tz =
      cityName && typeof cityName === 'string'
        ? cityTzMap[cityName.toLowerCase()] || Intl.DateTimeFormat().resolvedOptions().timeZone
        : Intl.DateTimeFormat().resolvedOptions().timeZone;
    const update = () => {
      try {
        const now = new Date();
        const formatted = new Intl.DateTimeFormat(undefined, {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          hourCycle: 'h23',
          timeZone: tz,
        }).format(now);
        setCurrentLocalTime(formatted);
      } catch (_) {
        setCurrentLocalTime('');
      }
    };
    update();
    const id = setInterval(update, 60 * 1000);
    return () => clearInterval(id);
  }, [cityName]);

  // Track previous state so we only recreate markers on actual changes.
  const prevAttractionsRef = useRef([]);
  const prevFiltersRef = useRef({ showingIconicOnly, activeCategories: [], smartFilters: {} });

  // Render DOM markers + the GeoJSON halo/circle layer when attractions or
  // filters change. Selection is handled separately above.
  useEffect(() => {
    if (!mapLoaded || !map.current || !mapboxglRef.current) return;

    const mapboxgl = mapboxglRef.current;

    const attractionsChanged = prevAttractionsRef.current !== attractions;
    const filtersChanged =
      prevFiltersRef.current.showingIconicOnly !== showingIconicOnly ||
      JSON.stringify(prevFiltersRef.current.activeCategories) !== JSON.stringify(activeCategories) ||
      JSON.stringify(prevFiltersRef.current.smartFilters) !== JSON.stringify(smartFilters);

    prevAttractionsRef.current = attractions;
    prevFiltersRef.current = {
      showingIconicOnly,
      activeCategories: [...activeCategories],
      smartFilters: { ...smartFilters },
    };

    if (!attractionsChanged && !filtersChanged) return;

    if (markersRef.current.length > 0) {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
    }

    if (!attractions || attractions.length === 0) return;

    try {
      const isVisible = (attraction) => {
        if (showingIconicOnly) return iconicAttractionNames.has(attraction?.name);
        if (activeCategories.length === 0) return matchesSmartFiltersLocal(attraction);
        const standardCategory = getStandardCategory(
          attraction.category || attraction.type || 'Uncategorized',
        );
        return activeCategories.includes(standardCategory) && matchesSmartFiltersLocal(attraction);
      };

      const visibleList = attractions.filter(isVisible);
      const fallbackHighlights = (() => {
        const fromSet = attractions.filter((a) => iconicAttractionNames.has(a?.name)).slice(0, 12);
        if (fromSet.length > 0) return fromSet;
        return computeTopIconicList(attractions, 12);
      })();
      let listToRender = showingIconicOnly && visibleList.length === 0 ? fallbackHighlights : visibleList;
      if (listToRender.length === 0 && Array.isArray(attractions) && attractions.length > 0) {
        listToRender = attractions.slice(0, Math.min(20, attractions.length));
      }

      const attractionIndexMap = new Map();
      attractions.forEach((a, idx) => {
        if (a?.name) attractionIndexMap.set(a.name, idx + 1);
      });

      listToRender.forEach((attraction) => {
        const coords = getAttractionCoords(attraction);
        if (!coords) {
          try {
            console.warn('[Map] missing coords for', attraction?.name);
          } catch (_) {}
          return;
        }
        if (!isVisible(attraction)) return;

        const [lng, lat] = coords;
        const globalIndex = attractionIndexMap.get(attraction.name) || 0;
        const category = attraction.category || attraction.type || 'Uncategorized';
        const standardCategory = getStandardCategory(category);

        let color = getPriorityColor(attraction);
        if (!color || color.toLowerCase() === '#6b7280') {
          color = getCategoryColor(category) || '#2563eb';
        }
        // Side-effect read kept to preserve marker-size dependency for future use.
        getMarkerSize(attraction);

        const markerEl = createMarkerElement({ attraction, globalIndex, color });

        markerEl.addEventListener('mouseenter', () => onHoverRef.current(attraction));
        markerEl.addEventListener('mouseleave', () => onHoverRef.current(null));
        markerEl.addEventListener('click', () => {
          setSelectedLocal(attraction);
          onSelectRef.current(attraction);
        });

        const popup = new mapboxgl.Popup({
          offset: 35,
          closeButton: true,
          closeOnClick: false,
          maxWidth: '320px',
          className: 'custom-popup',
        }).setHTML(buildAttractionPopupHtml({ attraction, category, standardCategory, color }));

        const marker = new mapboxgl.Marker(markerEl)
          .setLngLat([lng, lat])
          .setPopup(popup)
          .addTo(map.current);

        markersRef.current.push(marker);
      });

      if (listToRender.length > 0 && map.current.isStyleLoaded()) {
        if (map.current.getSource('attractions')) {
          map.current.removeLayer('attractions-layer');
          map.current.removeLayer('attractions-halo');
          map.current.removeSource('attractions');
        }

        const geojson = buildAttractionsGeoJson(listToRender);
        if (geojson.features.length === 0) return;

        map.current.addSource('attractions', { type: 'geojson', data: geojson });

        map.current.addLayer({
          id: 'attractions-halo',
          type: 'circle',
          source: 'attractions',
          paint: {
            'circle-radius': 18,
            'circle-opacity': 0.15,
            'circle-color': ['get', 'color'],
            'circle-blur': 0.8,
          },
        });

        map.current.addLayer({
          id: 'attractions-layer',
          type: 'circle',
          source: 'attractions',
          paint: {
            'circle-radius': 8,
            'circle-opacity': 0.6,
            'circle-color': ['get', 'color'],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
            'circle-stroke-opacity': 0.9,
          },
        });

        const bounds = new mapboxgl.LngLatBounds();
        listToRender.forEach((attr) => {
          const c = getAttractionCoords(attr);
          if (c) bounds.extend(c);
        });
        if (!bounds.isEmpty()) {
          map.current.fitBounds(bounds, {
            padding: { top: 50, bottom: 50, left: 50, right: 50 },
            maxZoom: showingIconicOnly ? 13.5 : 15,
            duration: 1500,
            essential: true,
          });
        }
      }
    } catch (err) {
      console.error('Error adding map features:', err);
      setMapError(err.message || 'Failed to add map features');
    }
  }, [
    mapLoaded,
    styleLoaded,
    attractions,
    activeCategories,
    smartFilters,
    showingIconicOnly,
    iconicAttractionNames,
    categoriesProcessed,
    processCategories,
    renderCue,
    matchesSmartFiltersLocal,
  ]);

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden">
      <div ref={mapContainer} className="w-full h-full" />

      <SmartFiltersPanel
        cityName={cityName}
        currentLocalTime={currentLocalTime}
        showingIconicOnly={showingIconicOnly}
        onShowingIconicOnlyChange={setShowingIconicOnly}
        smartFilters={smartFilters}
        onSmartFiltersChange={setSmartFilters}
        collapsed={filtersCollapsed}
        onToggleCollapsed={() => setFiltersCollapsed((v) => !v)}
      />

      <MapLegend />

      {(!mapLoaded || !styleLoaded) && <LoadingOverlay />}
      {mapError && <ErrorOverlay message={mapError} />}

      <MapStyles />
    </div>
  );
}
