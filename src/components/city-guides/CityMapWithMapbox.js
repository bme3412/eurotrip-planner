'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { CATEGORY_MAPPING, MAIN_CATEGORY_COLORS, getStandardCategory, getCategoryColor, computeTopIconicList, getMarkerSize } from '@/components/map/helpers';
import { matchesSmartFilters } from '@/components/map/filters';
// Remove CSS import from here
// import 'mapbox-gl/dist/mapbox-gl.css';

// (formerly inline) helpers moved to '@/components/map/helpers' and '@/components/map/filters'


// Enhanced priority system based on Paris data structure
const getPriorityColor = (attraction) => {
  const now = new Date();
  const currentHour = now.getHours();
  
  // Check if attraction is currently open based on best_time
  const isOpenNow = () => {
    if (!attraction.best_time) return true;
    const bestTime = attraction.best_time.toLowerCase();
    
    if (bestTime.includes("morning") && currentHour >= 6 && currentHour < 12) return true;
    if (bestTime.includes("afternoon") && currentHour >= 12 && currentHour < 18) return true;
    if (bestTime.includes("evening") && currentHour >= 18) return true;
    if (bestTime.includes("sunset") && currentHour >= 17 && currentHour < 20) return true;
    
    return false;
  };
  
  // Priority color system
  if (attraction.price_range === "Free" && isOpenNow()) {
    return "#10B981"; // Green - Free and open now
  } else if (attraction.price_range === "Free") {
    return "#3B82F6"; // Blue - Free but not optimal time
  } else if (attraction.price_range === "Moderate" && isOpenNow()) {
    return "#F59E0B"; // Yellow - Moderate cost, good timing
  } else if (attraction.price_range === "Expensive") {
    return "#EF4444"; // Red - Expensive
  } else {
    return "#6B7280"; // Gray - Default
  }
};

// getMarkerSize imported

// Get priority level for sorting
const getPriorityLevel = (attraction) => {
  const culturalSignificance = attraction.ratings?.cultural_significance || 3;
  const isFree = attraction.price_range === "Free";
  const isOpenNow = () => {
    if (!attraction.best_time) return true;
    const now = new Date();
    const currentHour = now.getHours();
    const bestTime = attraction.best_time.toLowerCase();
    
    if (bestTime.includes("morning") && currentHour >= 6 && currentHour < 12) return true;
    if (bestTime.includes("afternoon") && currentHour >= 12 && currentHour < 18) return true;
    if (bestTime.includes("evening") && currentHour >= 18) return true;
    if (bestTime.includes("sunset") && currentHour >= 17 && currentHour < 20) return true;
    
    return false;
  };
  
  let priority = culturalSignificance;
  if (isFree) priority += 1;
  if (isOpenNow()) priority += 1;
  
  return priority;
};

// Smart filter functions

const matchesPriceFilter = (attraction, filter) => {
  if (filter === "all") return true;
  return attraction.price_range?.toLowerCase() === filter;
};

const matchesDurationFilter = (attraction, filter) => {
  if (filter === "all") return true;
  const duration = attraction.ratings?.suggested_duration_hours || 1;
  
  if (filter === "quick") return duration <= 1.5;
  if (filter === "medium") return duration > 1.5 && duration <= 3;
  if (filter === "long") return duration > 3;
  return true;
};

const matchesIndoorFilter = (attraction, filter) => {
  if (filter === "all") return true;
  return attraction.indoor === (filter === "indoor");
};

// City map component that uses Mapbox
export default function CityMapWithMapbox({ 
  attractions = [], 
  categories = [], 
  cityName = "City", 
  center = [0, 0], 
  zoom = 12,
  selectedAttraction = null
}) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const popupRef = useRef(null);
  const markersRef = useRef([]);
  const mapboxglRef = useRef(null); // Ref to hold the loaded mapboxgl library
  const [mapLoaded, setMapLoaded] = useState(false);
  const [styleLoaded, setStyleLoaded] = useState(false);
  const [activeCategories, setActiveCategories] = useState([]);
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const [smartFilters, setSmartFilters] = useState({
    timeFilter: "all",
    priceFilter: "all",
    durationFilter: "all",
    indoorFilter: "all"
  });
  const [mapError, setMapError] = useState(null);
  const [categoriesProcessed, setCategoriesProcessed] = useState(false);
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);
  const [showingIconicOnly, setShowingIconicOnly] = useState(true);
  const [currentLocalTime, setCurrentLocalTime] = useState('');
  const [autoOpenedHighlights, setAutoOpenedHighlights] = useState(false);
  const ENABLE_HIGHLIGHT_TOUR = false; // disable auto-opening popups on initial load
  const [renderCue, setRenderCue] = useState(0);

  // Derive a set of iconic attractions (by name) to show on first load
  const iconicAttractionNames = useMemo(() => {
    if (!Array.isArray(attractions) || attractions.length === 0) return new Set();
    const typePriority = new Map([
      ['Monument', 8], ['Landmark', 8], ['Cathedral', 7], ['Basilica', 7],
      ['Museum', 6], ['Chapel', 6], ['Historic District', 5], ['District', 4]
    ]);

    const scored = attractions.map((site, index) => {
      const cultural = Number(site?.ratings?.cultural_significance ?? 0);
      const type = String(site?.type || site?.category || 'Other');
      const typeScore = typePriority.get(type) ?? 0;
      // Slight bonus for earlier items in the list for deterministic ties
      const totalScore = cultural * 2 + typeScore + Math.max(0, 5 - (index % 5));
      return { name: site?.name, score: totalScore };
    }).filter(it => it.name);

    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, 12).map(it => it.name);
    return new Set(top);
  }, [attractions]);
  
  // Smart filter functions
  const matchesTimeFilter = (attraction, filter) => {
    if (filter === "all") return true;
    if (!attraction.best_time) return filter === "now";
    
    const now = new Date();
    const currentHour = now.getHours();
    const bestTime = attraction.best_time.toLowerCase();
    
    if (filter === "now") {
      if (bestTime.includes("morning") && currentHour >= 6 && currentHour < 12) return true;
      if (bestTime.includes("afternoon") && currentHour >= 12 && currentHour < 18) return true;
      if (bestTime.includes("evening") && currentHour >= 18) return true;
      if (bestTime.includes("sunset") && currentHour >= 17 && currentHour < 20) return true;
      return false;
    }
    
    return bestTime.includes(filter);
  };
  
  const matchesPriceFilter = (attraction, filter) => {
    if (filter === "all") return true;
    return attraction.price_range?.toLowerCase() === filter;
  };
  
  const matchesDurationFilter = (attraction, filter) => {
    if (filter === "all") return true;
    const duration = attraction.ratings?.suggested_duration_hours || 1;
    
    if (filter === "quick") return duration <= 1.5;
    if (filter === "medium") return duration > 1.5 && duration <= 3;
    if (filter === "long") return duration > 3;
    return true;
  };
  
  const matchesIndoorFilter = (attraction, filter) => {
    if (filter === "all") return true;
    return attraction.indoor === (filter === "indoor");
  };
  
  const matchesSmartFiltersLocal = useCallback(
    (attraction) => matchesSmartFilters(attraction, smartFilters),
    [smartFilters]
  );
  
  // Handle selected attraction animation and map focus
  useEffect(() => {
    if (!map.current || !markersRef.current.length) return;
    
    markersRef.current.forEach(marker => {
      const markerElement = marker.getElement();
      const attractionName = markerElement.getAttribute('data-attraction-name');
      
      if (selectedAttraction && attractionName === selectedAttraction.name) {
        // Animate the selected marker
        markerElement.style.transform = 'scale(1.8)';
        markerElement.style.zIndex = '1000';
        markerElement.style.transition = 'all 0.4s ease';
        markerElement.style.filter = 'drop-shadow(0 0 15px rgba(59, 130, 246, 0.9))';
        
        // Get marker coordinates and focus the map
        const coordinates = marker.getLngLat();
        if (coordinates) {
          // Fly to the marker with appropriate zoom level
          map.current.flyTo({
            center: [coordinates.lng, coordinates.lat],
            zoom: Math.max(map.current.getZoom(), 15), // Ensure minimum zoom of 15
            duration: 1000,
            essential: true
          });
        }
      } else {
        // Reset other markers
        markerElement.style.transform = 'scale(1)';
        markerElement.style.zIndex = '1';
        markerElement.style.transition = 'all 0.3s ease';
        markerElement.style.filter = 'none';
      }
    });
    
    // If no attraction is selected, zoom out to show all markers
    if (!selectedAttraction) {
      // Calculate bounds to include all attractions
      const bounds = new mapboxglRef.current.LngLatBounds();
      
      attractions.forEach(attraction => {
        let lng, lat;
        if (attraction.coordinates) {
          lng = attraction.coordinates.longitude || attraction.coordinates.lng;
          lat = attraction.coordinates.latitude || attraction.coordinates.lat;
        } else {
          lng = attraction.longitude;
          lat = attraction.latitude;
        }
        
        if (lng && lat) {
          bounds.extend([lng, lat]);
        }
      });
      
      // Add some padding to the bounds
      bounds.extend([bounds.getWest() - 0.01, bounds.getSouth() - 0.01]);
      bounds.extend([bounds.getEast() + 0.01, bounds.getNorth() + 0.01]);
      
      // Fly to the bounds with animation
      map.current.fitBounds(bounds, {
        padding: 50,
        duration: 1000,
        essential: true
      });
    }
  }, [selectedAttraction, attractions]);
  
  // Convert existing categories to standard categories - called only from useEffect
  const processCategories = useCallback(() => {
    if (categoriesProcessed) return;
    
    // Get all unique standard categories from attractions
    const uniqueCategories = [...new Set(attractions.map(attr => {
      const origCategory = attr.category || attr.type || 'Uncategorized';
      return getStandardCategory(origCategory);
    }))];
    
    // Create standardized category objects
    const standardizedCategories = uniqueCategories.map(cat => ({
      category: cat,
      sites: attractions.filter(attr => {
        const origCategory = attr.category || attr.type || 'Uncategorized';
        return getStandardCategory(origCategory) === cat;
      })
    })).sort((a, b) => b.sites.length - a.sites.length); // Sort by number of sites
    
    setActiveCategories(standardizedCategories.map(cat => cat.category));
    setShowCategoryFilter(standardizedCategories.length > 1);
    setCategoriesProcessed(true);
    
    return standardizedCategories;
  }, [attractions, categoriesProcessed]);

  // Initialize map and process categories once
  useEffect(() => {
    if (map.current) return; // Map already initialized

    // Use an async function to load Mapbox dynamically
    const initializeMap = async () => {
      try {
        // Dynamically import mapbox-gl
        const mapboxglModule = (await import('mapbox-gl')).default;
        mapboxglRef.current = mapboxglModule; // Store the loaded library in the ref

        // Set access token *after* import, using the ref
        mapboxglRef.current.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

        // Ensure the container is empty to avoid Mapbox warning
        try {
          if (mapContainer.current) mapContainer.current.innerHTML = '';
        } catch (_) {}
        // Initialize map with a more vibrant style, using the ref
        map.current = new mapboxglRef.current.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/streets-v12', // More colorful style
          center: center,
          zoom: zoom,
          attributionControl: false,
          pitchWithRotate: false
        });

        // Add navigation controls, using the ref
        map.current.addControl(new mapboxglRef.current.NavigationControl({
          showCompass: true,
          visualizePitch: true
        }), 'top-right');
        
        map.current.addControl(new mapboxglRef.current.FullscreenControl(), 'top-right');
        
        map.current.addControl(
          new mapboxglRef.current.AttributionControl({ 
            compact: true,
            customAttribution: `© ${new Date().getFullYear()} | ${cityName} City Guide`
          }), 
          'bottom-right'
        );

        // On map load
        map.current.on('load', () => {
          setMapLoaded(true);
          // Process categories after map is loaded
          processCategories();
          try { if (mapContainer.current) mapContainer.current.classList.add('labels-visible'); } catch (_) {}
          // Nudge marker render once the map is definitively ready
          setRenderCue((c) => c + 1);
        });

        // Wait for style to be fully loaded before adding data
        map.current.on('styledata', () => {
          setStyleLoaded(true);
        });

        // Toggle compact marker labels by zoom level
        map.current.on('zoom', () => {
          try {
            const z = map.current.getZoom();
            if (mapContainer.current) {
              if (z >= 13.5) {
                mapContainer.current.classList.add('labels-visible');
              } else {
                mapContainer.current.classList.remove('labels-visible');
              }
            }
          } catch (_) {}
        });

        // Handle errors
        map.current.on('error', (e) => {
          console.error('Mapbox error:', e);
          setMapError(e.error ? e.error.message : 'Unknown map error');
        });
      } catch (err) {
        console.error('Error initializing map:', err);
        setMapError(err.message || 'Failed to initialize map');
      }
    };

    initializeMap(); // Call the async function

    // Cleanup on unmount
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [center, zoom, cityName, attractions, processCategories]); // Include attractions in dependencies

  // Collapse filters by default on small screens
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setFiltersCollapsed(window.innerWidth < 640);
    }
  }, []);

  // Update current local time every minute (Paris timezone by default)
  useEffect(() => {
    const cityTzMap = { paris: 'Europe/Paris' };
    const tz = cityName && typeof cityName === 'string' ? cityTzMap[cityName.toLowerCase()] || Intl.DateTimeFormat().resolvedOptions().timeZone : Intl.DateTimeFormat().resolvedOptions().timeZone;
    const update = () => {
      try {
        const now = new Date();
        const formatted = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', hour12: false, hourCycle: 'h23', timeZone: tz }).format(now);
        setCurrentLocalTime(formatted);
      } catch (_) {
        setCurrentLocalTime('');
      }
    };
    update();
    const id = setInterval(update, 60 * 1000);
    return () => clearInterval(id);
  }, [cityName]);

  // Add markers when map is loaded and attractions data changes or filters change
  useEffect(() => {
    // Add check for mapboxglRef.current being loaded
    // Render DOM markers as soon as the map exists; style is only needed for layers
    if (!mapLoaded || !map.current || !mapboxglRef.current) return;

    // Access mapboxgl classes via the ref
    const mapboxgl = mapboxglRef.current;

    // Clear any existing markers
    if (markersRef.current.length > 0) {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
    }

    // Clear any existing popups
    if (popupRef.current) {
      popupRef.current.remove();
    }

    // Skip if no attractions
    if (!attractions || attractions.length === 0) return;

    try {
      // Get visibility filter for attractions
      const isVisible = (attraction) => {
        // Always show the currently selected item, regardless of filters/highlights
        if (selectedAttraction && attraction?.name === selectedAttraction?.name) return true;
        // First-load: only show iconic highlights
        if (showingIconicOnly) return iconicAttractionNames.has(attraction?.name);
        // Always apply smart filters; categories are optional
        if (activeCategories.length === 0) return matchesSmartFiltersLocal(attraction);
        
        // Get original category from attraction
        const origCategory = attraction.category || attraction.type || 'Uncategorized';
        
        // Get standardized category
        const standardCategory = getStandardCategory(origCategory);
        
        return activeCategories.includes(standardCategory) && matchesSmartFiltersLocal(attraction);
      };

      // Decide final list to render (fallback if highlight filter yields none)
      const visibleList = attractions.filter(isVisible);
      const fallbackHighlights = (() => {
        // Prefer precomputed iconic set, else compute top-N directly
        const fromSet = attractions.filter(a => iconicAttractionNames.has(a?.name)).slice(0, 12);
        if (fromSet.length > 0) return fromSet;
        return computeTopIconicList(attractions, 12);
      })();
      let listToRender = (showingIconicOnly && visibleList.length === 0) ? fallbackHighlights : visibleList;
      // Final safety fallback: if still empty but we have attractions, show first 20
      if (listToRender.length === 0 && Array.isArray(attractions) && attractions.length > 0) {
        listToRender = attractions.slice(0, Math.min(20, attractions.length));
      }

      // Debug: sizes at render time
      try {
        if (typeof window !== 'undefined') {
          console.debug('[Map] attractions:', attractions?.length, 'visibleList:', visibleList.length, 'fallbackHighlights:', fallbackHighlights.length);
        }
      } catch (_) {}

      // Add markers for each attraction
      listToRender.forEach((attraction, index) => {
        // Skip if no coordinates
        if (!attraction.coordinates && 
            !attraction.latitude && 
            !attraction.longitude) return;
        
        // Skip if this category is not active
        if (!isVisible(attraction)) return;
        
        // Get coordinates (handle different possible structures)
        let lng, lat;
        
        if (attraction.coordinates) {
          lng = attraction.coordinates.longitude || attraction.coordinates.lng;
          lat = attraction.coordinates.latitude || attraction.coordinates.lat;
        } else {
          lng = attraction.longitude;
          lat = attraction.latitude;
        }
        
        if (!lng || !lat) {
          try { console.warn('[Map] missing coords for', attraction?.name); } catch (_) {}
          return;
        }

        // Get attraction category
        const category = attraction.category || attraction.type || 'Uncategorized';
        const standardCategory = getStandardCategory(category);
        
        // Get marker color: prefer priority color; fallback to category color; avoid gray default
        let color = getPriorityColor(attraction);
        if (!color || color.toLowerCase() === '#6b7280') {
          const fallback = getCategoryColor(category) || '#2563eb';
          color = fallback;
        }
        const markerSize = getMarkerSize(attraction);

        // Create custom marker element
        const markerEl = document.createElement('div');
        markerEl.className = 'custom-marker';
        markerEl.setAttribute('data-attraction-name', attraction.name);
        const isSelected = selectedAttraction && attraction?.name === selectedAttraction?.name;
        const scale = isSelected ? 1.4 : 1.0;
        const ring = isSelected ? `box-shadow: 0 0 0 4px rgba(59,130,246,0.25), 0 0 0 8px rgba(59,130,246,0.15);` : '';
        markerEl.innerHTML = `
          <div class="marker-container" style="transform: scale(${scale});">
            <div class="marker-pin"
                style="background-color: ${color}; ${ring} box-shadow: 0 2px 6px rgba(0,0,0,0.25); border: 2px solid white;">
              <span class="marker-text" style="font-weight: bold; font-size: 11px; color: white; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">${index + 1}</span>
            </div>
            <div class="marker-pulse" style="background-color: ${color}"></div>
            <div class="marker-label">${attraction.name || ''}</div>
          </div>
        `;
        
        // Create popup content with enhanced styling
        let popupContent = `
          <div class="popup-container">
            <h3 class="popup-title">${attraction.name}</h3>
            <p class="popup-category" style="color: ${color};">
              <span>${category}</span>
              <span class="popup-main-category">${standardCategory}</span>
            </p>
        `;
        
        // Add description if available
        if (attraction.description) {
          popupContent += `<p class="popup-description">${attraction.description.substring(0, 100)}${attraction.description.length > 100 ? '...' : ''}</p>`;
        }
        
        // Create details section
        popupContent += `<div class="popup-details">`;
        
        // Add address if available
        if (attraction.address) {
          popupContent += `
            <div class="popup-detail-item">
              <span class="popup-detail-icon">📍</span>
              <span class="popup-detail-text">${attraction.address}</span>
            </div>`;
        }
        
        // Add hours if available
        if (attraction.hours) {
          popupContent += `
            <div class="popup-detail-item">
              <span class="popup-detail-icon">🕒</span>
              <span class="popup-detail-text">${attraction.hours}</span>
            </div>`;
        } else if (attraction.best_time) {
          // If no hours but best_time is available
          popupContent += `
            <div class="popup-detail-item">
              <span class="popup-detail-icon">🕒</span>
              <span class="popup-detail-text">Best time: ${attraction.best_time}</span>
            </div>`;
        }
        
        // Add price if available
        if (attraction.ticket_price || attraction.price_range || attraction.price) {
          const priceInfo = attraction.ticket_price || attraction.price_range || attraction.price;
          popupContent += `
            <div class="popup-detail-item">
              <span class="popup-detail-icon">💰</span>
              <span class="popup-detail-text">${priceInfo}</span>
            </div>`;
        }
        
        // Add ratings if available
        if (attraction.ratings) {
          let ratingInfo = '';
          
          // Handle different rating structures
          if (typeof attraction.ratings === 'object') {
            if (attraction.ratings.score) {
              ratingInfo = attraction.ratings.score;
            }
            
            if (attraction.ratings.suggested_duration_hours) {
              ratingInfo += ratingInfo ? ` (${attraction.ratings.suggested_duration_hours} hrs)` : 
                            `${attraction.ratings.suggested_duration_hours} hrs`;
            }
          } else {
            ratingInfo = attraction.ratings;
          }
            
          if (ratingInfo) {
            popupContent += `
              <div class="popup-detail-item">
                <span class="popup-detail-icon">⭐</span>
                <span class="popup-detail-text">${ratingInfo}</span>
              </div>`;
          }
        }
        
        // Close details div and popup container
        popupContent += `</div></div>`;
        
        // Create popup with improved styling, using ref
        const popup = new mapboxgl.Popup({ 
          offset: 35, 
          closeButton: true,
          closeOnClick: false,
          maxWidth: '320px',
          className: 'custom-popup'
        }).setHTML(popupContent);
        
        // Create and store the marker, using ref
        const marker = new mapboxgl.Marker(markerEl)
          .setLngLat([lng, lat])
          .setPopup(popup)
          .addTo(map.current);
        
        markersRef.current.push(marker);

        // If selected, open popup and smoothly pan/zoom to it
        if (isSelected) {
          try {
            marker.togglePopup();
          } catch (_) {}
          const targetZoom = Math.max(map.current.getZoom(), 15);
          map.current.easeTo({ center: [lng, lat], zoom: targetZoom, duration: 900, easing: t => t });
        }
      });
      
      // Add a map layer with all attraction points for easier visibility
      if (listToRender.length > 0 && map.current.isStyleLoaded()) {
        // Remove existing layers if they exist to prevent duplicates
        if (map.current.getSource('attractions')) {
          map.current.removeLayer('attractions-layer');
          map.current.removeLayer('attractions-halo');
          map.current.removeSource('attractions');
        }
        
        // Only include visible attractions
        const visibleAttractions = listToRender;
        
        // Skip if no visible attractions
        if (visibleAttractions.length === 0) return;
        
        const geojson = {
          type: 'FeatureCollection',
          features: visibleAttractions
            .filter(attr => {
              // Check for coordinates
              if (attr.coordinates) {
                return attr.coordinates.longitude || attr.coordinates.lng || 
                      attr.coordinates.latitude || attr.coordinates.lat;
              }
              return attr.latitude && attr.longitude;
            })
            .map(attr => {
              // Get coordinates
              let lng, lat;
              if (attr.coordinates) {
                lng = attr.coordinates.longitude || attr.coordinates.lng;
                lat = attr.coordinates.latitude || attr.coordinates.lat;
              } else {
                lng = attr.longitude;
                lat = attr.latitude;
              }
              
              // Get category
              const category = attr.category || attr.type || 'Uncategorized';
              const standardCategory = getStandardCategory(category);
              
              return {
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: [lng, lat]
                },
                properties: {
                  name: attr.name,
                  category: category,
                  standardCategory: standardCategory,
                  description: attr.description || '',
                  color: getCategoryColor(category)
                }
              };
            })
        };
        
        // Add the data source
        map.current.addSource('attractions', {
          type: 'geojson',
          data: geojson
        });
        
        // Add glow halo effect
        map.current.addLayer({
          id: 'attractions-halo',
          type: 'circle',
          source: 'attractions',
          paint: {
            'circle-radius': 18,
            'circle-opacity': 0.15,
            'circle-color': ['get', 'color'],
            'circle-blur': 0.8
          }
        });
        
        // Add smaller circles under markers
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
            'circle-stroke-opacity': 0.9
          }
        });
        
        // Fit map to visible attractions with animation, using ref
        const bounds = new mapboxgl.LngLatBounds();
        
        visibleAttractions.forEach(attr => {
          let lng, lat;
          if (attr.coordinates) {
            lng = attr.coordinates.longitude || attr.coordinates.lng;
            lat = attr.coordinates.latitude || attr.coordinates.lat;
          } else {
            lng = attr.longitude;
            lat = attr.latitude;
          }
          
          if (lng && lat) {
            bounds.extend([lng, lat]);
          }
        });
        
        if (!bounds.isEmpty()) {
          map.current.fitBounds(bounds, {
            padding: { top: 50, bottom: 50, left: 50, right: 50 },
            maxZoom: showingIconicOnly ? 13.5 : 15,
            duration: 1500,
            essential: true
          });
        }
      }

      // On initial load, auto-open 1-2 iconic popups and frame them
      if (ENABLE_HIGHLIGHT_TOUR && !autoOpenedHighlights && showingIconicOnly && !selectedAttraction && markersRef.current.length > 0) {
        try {
          const preferredOrder = [
            'Eiffel Tower',
            'Louvre Museum',
            'Notre-Dame Cathedral',
            'Arc de Triomphe',
            'Sacré-Cœur Basilica'
          ];
          // Build a lookup of name -> marker and coordinates
          const nameToMarker = new Map();
          markersRef.current.forEach(m => {
            const el = m.getElement();
            const nm = el?.getAttribute('data-attraction-name');
            if (nm) nameToMarker.set(nm, m);
          });

          const chosen = [];
          // Prefer the known list first
          preferredOrder.forEach(nm => {
            if (nameToMarker.has(nm) && chosen.length < 2) chosen.push(nm);
          });
          // Fallback to any two from iconic set
          if (chosen.length < 2) {
            // Try precomputed iconic names
            for (const nm of iconicAttractionNames) {
              if (nameToMarker.has(nm)) chosen.push(nm);
              if (chosen.length >= 2) break;
            }
          }
          if (chosen.length < 2) {
            // As a final fallback, pick the first two visible markers
            markersRef.current.some(m => {
              const nm = m.getElement()?.getAttribute('data-attraction-name');
              if (nm && !chosen.includes(nm)) chosen.push(nm);
              return chosen.length >= 2;
            });
          }

          if (chosen.length > 0) {
            const b = new mapboxgl.LngLatBounds();
            chosen.forEach((nm, idx) => {
              const marker = nameToMarker.get(nm);
              if (!marker) return;
              const ll = marker.getLngLat();
              if (ll) b.extend([ll.lng, ll.lat]);
              setTimeout(() => {
                try { marker.togglePopup(); } catch (_) {}
              }, 350 * idx);
            });
            if (!b.isEmpty()) {
              map.current.fitBounds(b, {
                padding: { top: 80, bottom: 80, left: 80, right: 80 },
                maxZoom: 13,
                duration: 1200,
                essential: true
              });
            }
            setAutoOpenedHighlights(true);
          }
        } catch (_) {}
      }
    } catch (err) {
      console.error('Error adding map features:', err);
      setMapError(err.message || 'Failed to add map features');
    }
  }, [mapLoaded, styleLoaded, attractions, activeCategories, smartFilters, showingIconicOnly, iconicAttractionNames, selectedAttraction, categoriesProcessed, processCategories, renderCue, ENABLE_HIGHLIGHT_TOUR, autoOpenedHighlights, matchesSmartFiltersLocal]);

  // Get the list of categories to show in filters - now memoized
  const getFilterCategories = () => {
    // Only return categories that have already been processed
    if (!categoriesProcessed) return [];
    
    // Get all unique standard categories from attractions
    const uniqueCategories = [...new Set(attractions.map(attr => {
      const origCategory = attr.category || attr.type || 'Uncategorized';
      return getStandardCategory(origCategory);
    }))];
    
    // Create standardized category objects
    return uniqueCategories.map(cat => ({
      category: cat,
      sites: attractions.filter(attr => {
        const origCategory = attr.category || attr.type || 'Uncategorized';
        return getStandardCategory(origCategory) === cat;
      })
    })).sort((a, b) => b.sites.length - a.sites.length);
  };

  // Get a list of categories to show in the legend - limited to main categories
  const getLegendCategories = () => {
    const filterCats = getFilterCategories();
    // Always limit to a reasonable number for the legend
    return filterCats.length <= 7 ? filterCats : filterCats.slice(0, 7);
  };

  // Toggle a category filter
  const toggleCategory = (category) => {
    setActiveCategories(prev => {
      if (prev.includes(category)) {
        return prev.filter(cat => cat !== category);
      } else {
        return [...prev, category];
      }
    });
  };

  // Select all categories
  const selectAllCategories = () => {
    const standardizedCategories = getFilterCategories();
    setActiveCategories(standardizedCategories.map(cat => cat.category));
  };

  // Clear all categories
  const clearAllCategories = () => {
    setActiveCategories([]);
  };

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden">
      {/* Map container */}
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* Smart Filter Controls */}
      <div className="absolute top-4 left-4 z-20 w-72 max-w-xs bg-white/95 backdrop-blur-md border border-gray-200 rounded-xl shadow-xl p-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">Smart Filters</h3>
          <button
            onClick={() => setFiltersCollapsed(!filtersCollapsed)}
            aria-label={filtersCollapsed ? 'Expand filters' : 'Collapse filters'}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            {filtersCollapsed ? '▾' : '▴'}
          </button>
        </div>
        <div className={`${filtersCollapsed ? 'hidden' : 'block'} mt-3`}>
          {/* Context row: local time and initial view mode */}
          <div className="mb-3 flex items-center justify-between text-[11px] text-gray-600">
            <span className="font-medium">Local time ({cityName ? (cityName.charAt(0).toUpperCase() + cityName.slice(1)) : 'City'}): {currentLocalTime || '—'}</span>
            <label className="inline-flex items-center gap-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showingIconicOnly}
                onChange={(e) => setShowingIconicOnly(e.target.checked)}
                className="accent-blue-600"
              />
              <span>{showingIconicOnly ? 'Highlights' : 'All'}</span>
            </label>
          </div>
        
        {/* Time Filter */}
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-600 mb-1">Time</label>
          <select 
            value={smartFilters.timeFilter} 
            onChange={(e) => setSmartFilters(prev => ({ ...prev, timeFilter: e.target.value }))}
            className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1 bg-white"
          >
            <option value="all">All Times</option>
            <option value="now">Open Now</option>
            <option value="morning">Morning</option>
            <option value="afternoon">Afternoon</option>
            <option value="evening">Evening</option>
          </select>
        </div>
        
        {/* Price Filter */}
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-600 mb-1">Price</label>
          <select 
            value={smartFilters.priceFilter} 
            onChange={(e) => setSmartFilters(prev => ({ ...prev, priceFilter: e.target.value }))}
            className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1 bg-white"
          >
            <option value="all">All Prices</option>
            <option value="free">Free</option>
            <option value="moderate">Moderate</option>
            <option value="expensive">Expensive</option>
          </select>
        </div>
        
        {/* Duration Filter */}
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-600 mb-1">Duration</label>
          <select 
            value={smartFilters.durationFilter} 
            onChange={(e) => setSmartFilters(prev => ({ ...prev, durationFilter: e.target.value }))}
            className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1 bg-white"
          >
            <option value="all">Any Duration</option>
            <option value="quick">Quick (≤1.5h)</option>
            <option value="medium">Medium (1.5-3h)</option>
            <option value="long">Long (&gt;3h)</option>
          </select>
        </div>
        
        {/* Indoor/Outdoor Filter */}
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
          <select 
            value={smartFilters.indoorFilter} 
            onChange={(e) => setSmartFilters(prev => ({ ...prev, indoorFilter: e.target.value }))}
            className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1 bg-white"
          >
            <option value="all">All Locations</option>
            <option value="indoor">Indoor Only</option>
            <option value="outdoor">Outdoor Only</option>
          </select>
        </div>
        
        {/* Clear Filters Button */}
        <button 
          onClick={() => setSmartFilters({ timeFilter: "all", priceFilter: "all", durationFilter: "all", indoorFilter: "all" })}
          className="w-full text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 py-1 px-2 rounded-lg transition-colors"
        >
          Clear All Filters
        </button>
        </div>
      </div>      
      {/* Priority Color Legend */}
      <div className="absolute bottom-4 right-4 z-20 bg-white/95 backdrop-blur-md border border-gray-200 rounded-xl shadow-xl p-4 max-w-xs">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Map Legend</h3>
        <div className="space-y-2 text-xs">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
            <span>Free & Open Now</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
            <span>Free (Other Times)</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
            <span>Moderate & Good Time</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
            <span>Expensive</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-gray-500 mr-2"></div>
            <span>Other</span>
          </div>
        </div>
        <div className="mt-3 pt-2 border-t border-gray-200">
          <p className="text-xs text-gray-600">Pin size = Cultural significance</p>
      </div>
        </div>
      

      
      {/* Loading indicator */}
      {(!mapLoaded || !styleLoaded) && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-80 backdrop-blur-sm">
          <div className="flex flex-col items-center">
            <div className="h-12 w-12 rounded-full border-4 border-blue-600 border-t-transparent animate-spin mb-3"></div>
            <div className="text-lg font-medium text-blue-600">Loading map...</div>
          </div>
        </div>
      )}
      
      {/* Error message */}
      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-90">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md">
            <h3 className="text-lg font-bold text-red-600 mb-2">Map Error</h3>
            <p className="text-gray-700">{mapError}</p>
            <p className="text-gray-500 mt-2 text-sm">Please refresh the page to try again.</p>
          </div>
        </div>
      )}
      


      {/* Add CSS for custom markers and popups */}
      <style jsx global>{`
        .marker-container {
          position: relative;
          width: 30px;
          height: 40px;
          cursor: pointer;
        }
        
        .marker-pin {
          width: 30px;
          height: 30px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .marker-pin:hover {
          transform: rotate(-45deg) scale(1.2);
        }
        
        .marker-text {
          transform: rotate(45deg);
          color: white;
          font-size: 12px;
          font-weight: bold;
        }
        
        .marker-pulse {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          transform: translateX(8px);
          animation: pulse 2s infinite;
        }
        .marker-label {
          position: absolute;
          top: -18px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(255,255,255,0.9);
          color: #111827;
          border: 1px solid rgba(0,0,0,0.08);
          border-radius: 6px;
          padding: 2px 6px;
          font-size: 11px;
          white-space: nowrap;
          box-shadow: 0 1px 2px rgba(0,0,0,0.08);
          display: none;
        }
        .labels-visible .marker-label { display: block; }
        
        @keyframes pulse {
          0% {
            transform: translateX(8px) scale(0.5);
            opacity: 1;
          }
          70% {
            transform: translateX(8px) scale(2);
            opacity: 0;
          }
          100% {
            transform: translateX(8px) scale(0.5);
            opacity: 0;
          }
        }
        
        /* Custom popup styling */
        .mapboxgl-popup-content {
          padding: 0 !important;
          overflow: hidden;
          border-radius: 8px !important;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1) !important;
        }
        
        .popup-container {
          padding: 12px;
          max-width: 300px;
        }
        
        .popup-title {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 4px;
          line-height: 1.2;
        }
        
        .popup-category {
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 8px;
          display: flex;
          justify-content: space-between;
        }
        
        .popup-main-category {
          opacity: 0.8;
          font-style: italic;
        }
        
        .popup-description {
          font-size: 13px;
          color: #4B5563;
          margin-bottom: 12px;
          line-height: 1.4;
        }
        
        .popup-details {
          background-color: #F9FAFB;
          margin: 0 -12px -12px -12px;
          padding: 8px 12px;
          border-top: 1px solid #E5E7EB;
        }
        
        .popup-detail-item {
          display: flex;
          align-items: center;
          margin-bottom: 4px;
          font-size: 12px;
        }
        
        .popup-detail-item:last-child {
          margin-bottom: 0;
        }
        
        .popup-detail-icon {
          margin-right: 6px;
          flex-shrink: 0;
        }
        
        .popup-detail-text {
          color: #4B5563;
        }
        
        /* Mapbox controls styling */
        .mapboxgl-ctrl-group {
          border-radius: 8px !important;
          overflow: hidden;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1) !important;
        }
        
        .mapboxgl-ctrl button {
          width: 32px !important;
          height: 32px !important;
        }
      `}</style>
    </div>
  );
}
