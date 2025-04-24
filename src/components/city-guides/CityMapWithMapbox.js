'use client';

import { useState, useEffect, useRef } from 'react';
// Remove CSS import from here
// import 'mapbox-gl/dist/mapbox-gl.css';

// Define broader category mapping to consolidate attraction types
// This helps organize attractions into more manageable groups
const CATEGORY_MAPPING = {
  // Arts & Culture
  'Museum': 'Arts & Culture',
  'Art Gallery': 'Arts & Culture',
  'Theater': 'Arts & Culture',
  'Opera House': 'Arts & Culture',
  'Concert Hall': 'Arts & Culture',
  'Cultural': 'Arts & Culture',
  
  // Landmarks
  'Monument': 'Landmarks',
  'Landmark': 'Landmarks',
  'Architecture': 'Landmarks',
  'Government Building': 'Landmarks',
  'Historical': 'Landmarks',
  'Historic District': 'Landmarks',
  
  // Religious Sites
  'Church': 'Religious Sites',
  'Cathedral': 'Religious Sites',
  'Basilica': 'Religious Sites',
  'Chapel': 'Religious Sites',
  'Religious': 'Religious Sites',
  
  // Nature & Outdoors
  'Park': 'Nature & Outdoors',
  'Garden': 'Nature & Outdoors',
  'Lake': 'Nature & Outdoors',
  'Zoo': 'Nature & Outdoors',
  
  // Urban Spaces
  'District': 'Urban Spaces',
  'Square': 'Urban Spaces',
  'Street': 'Urban Spaces',
  'Harbor': 'Urban Spaces',
  'Entertainment District': 'Urban Spaces',
  
  // Food & Shopping
  'Food': 'Food & Shopping',
  'Market': 'Food & Shopping',
  'Shopping': 'Food & Shopping',
  
  // Everything else
  'Uncategorized': 'Other'
};

// Define colors for the main categories with a cohesive color palette
const MAIN_CATEGORY_COLORS = {
  'Arts & Culture': '#E53E3E', // Red
  'Landmarks': '#DD6B20', // Orange
  'Religious Sites': '#805AD5', // Purple
  'Nature & Outdoors': '#38A169', // Green
  'Urban Spaces': '#4299E1', // Blue
  'Food & Shopping': '#F56565', // Pink
  'Other': '#718096' // Gray
};

// Helper function to get standardized category from attraction type
const getStandardCategory = (type) => {
  if (!type) return 'Other';
  
  // Try direct mapping first
  if (CATEGORY_MAPPING[type]) {
    return CATEGORY_MAPPING[type];
  }
  
  // Try case-insensitive partial matching
  const lowerType = type.toLowerCase();
  for (const [key, value] of Object.entries(CATEGORY_MAPPING)) {
    if (lowerType.includes(key.toLowerCase())) {
      return value;
    }
  }
  
  return 'Other';
};

// Helper function to get color based on category
const getCategoryColor = (category) => {
  const standardCategory = getStandardCategory(category);
  return MAIN_CATEGORY_COLORS[standardCategory] || MAIN_CATEGORY_COLORS['Other'];
};

// City map component that uses Mapbox
export default function CityMapWithMapbox({ 
  attractions = [], 
  categories = [], 
  cityName = "City", 
  center = [0, 0], 
  zoom = 12 
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
  const [mapError, setMapError] = useState(null);
  const [categoriesProcessed, setCategoriesProcessed] = useState(false);
  
  // Convert existing categories to standard categories - called only from useEffect
  const processCategories = () => {
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
  };

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
        });

        // Wait for style to be fully loaded before adding data
        map.current.on('styledata', () => {
          setStyleLoaded(true);
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
  }, [center, zoom, cityName, attractions]); // Include attractions in dependencies

  // Add markers when map is loaded and attractions data changes or filters change
  useEffect(() => {
    // Add check for mapboxglRef.current being loaded
    if (!mapLoaded || !styleLoaded || !map.current || !categoriesProcessed || !mapboxglRef.current) return;

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
        if (activeCategories.length === 0) return true;
        
        // Get original category from attraction
        const origCategory = attraction.category || attraction.type || 'Uncategorized';
        
        // Get standardized category
        const standardCategory = getStandardCategory(origCategory);
        
        return activeCategories.includes(standardCategory);
      };

      // Add markers for each attraction
      attractions.forEach((attraction, index) => {
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
        
        if (!lng || !lat) return;

        // Get attraction category
        const category = attraction.category || attraction.type || 'Uncategorized';
        const standardCategory = getStandardCategory(category);
        
        // Get marker color based on standardized category
        const color = getCategoryColor(category);

        // Create custom marker element
        const markerEl = document.createElement('div');
        markerEl.className = 'custom-marker';
        markerEl.innerHTML = `
          <div class="marker-container">
            <div class="marker-pin"
                style="background-color: ${color}; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">
              <span class="marker-text">${index + 1}</span>
            </div>
            <div class="marker-pulse" style="background-color: ${color}"></div>
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
      });
      
      // Add a map layer with all attraction points for easier visibility
      if (attractions.length > 0 && map.current.isStyleLoaded()) {
        // Remove existing layers if they exist to prevent duplicates
        if (map.current.getSource('attractions')) {
          map.current.removeLayer('attractions-layer');
          map.current.removeLayer('attractions-halo');
          map.current.removeSource('attractions');
        }
        
        // Only include visible attractions
        const visibleAttractions = attractions.filter(isVisible);
        
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
            maxZoom: 15,
            duration: 1500,
            essential: true
          });
        }
      }
    } catch (err) {
      console.error('Error adding map features:', err);
      setMapError(err.message || 'Failed to add map features');
    }
  }, [mapLoaded, styleLoaded, attractions, activeCategories, categoriesProcessed]);

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
      
      {/* Category filter panel - only show if we have categories */}
      {showCategoryFilter && categoriesProcessed && (
        <div className="absolute top-4 left-4 z-10 bg-white p-4 rounded-lg shadow-lg max-w-xs max-h-[calc(100%-32px)] overflow-y-auto">
          <h3 className="font-bold text-gray-800 mb-2 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
            </svg>
            Filter By Category
          </h3>
          <div className="flex space-x-2 mb-3">
            <button 
              onClick={selectAllCategories}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white py-1 px-2 rounded transition-colors duration-200"
            >
              All
            </button>
            <button 
              onClick={clearAllCategories}
              className="text-xs bg-gray-600 hover:bg-gray-700 text-white py-1 px-2 rounded transition-colors duration-200"
            >
              None
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {getFilterCategories().map((cat) => (
              <button
                key={cat.category || 'uncategorized'}
                onClick={() => toggleCategory(cat.category || 'Other')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 border ${
                  activeCategories.includes(cat.category || 'Other')
                    ? 'border-transparent text-white shadow-md' 
                    : 'border-gray-300 text-gray-700 bg-gray-100 hover:bg-gray-200'
                }`}
                style={{
                  backgroundColor: activeCategories.includes(cat.category || 'Other') 
                    ? MAIN_CATEGORY_COLORS[cat.category] || MAIN_CATEGORY_COLORS['Other']
                    : '',
                }}
              >
                {cat.category || 'Other'} ({cat.sites?.length || 0})
              </button>
            ))}
          </div>
        </div>
      )}
      
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
      
      {/* Legend for categories */}
      {categoriesProcessed && (
        <div className="absolute bottom-4 right-4 z-10 bg-white p-3 rounded-lg shadow-lg max-w-xs">
          <h4 className="text-xs font-bold text-gray-700 mb-2 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
            </svg>
            Legend
          </h4>
          <div className="grid grid-cols-2 gap-1">
            {getLegendCategories().map((cat) => (
              <div key={cat.category || 'uncategorized'} className="flex items-center space-x-1">
                <div 
                  className="w-3 h-3 rounded-full border border-white shadow-sm" 
                  style={{ backgroundColor: MAIN_CATEGORY_COLORS[cat.category] || MAIN_CATEGORY_COLORS['Other'] }}
                ></div>
                <span className="text-xs text-gray-700 truncate">{cat.category || 'Other'}</span>
              </div>
            ))}
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