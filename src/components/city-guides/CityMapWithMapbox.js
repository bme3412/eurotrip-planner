'use client';

import { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Set Mapbox token - using a default public token for demo purposes
// In production, you should use an environment variable
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4M29iazA2Z2gycXA4N2pmbDZmangifQ.-g_vE53SD2WrJ6tFX7QHmA';

// Define category colors for attractions with modern color palette
const CATEGORY_COLORS = {
  'Museum': '#E53E3E', // Red
  'Monument': '#DD6B20', // Orange
  'Park': '#38A169', // Green
  'Garden': '#48BB78', // Light Green
  'Church': '#805AD5', // Purple
  'Cathedral': '#6B46C1', // Indigo-Purple
  'Basilica': '#9F7AEA', // Medium Purple
  'Chapel': '#B794F4', // Light Purple
  'Religious': '#7B61FF', // Blue-Purple
  'Shopping': '#3182CE', // Blue
  'Entertainment': '#F6E05E', // Yellow
  'Historical': '#6B46C1', // Indigo
  'Architecture': '#2C7A7B', // Teal
  'Cultural': '#ED64A6', // Pink
  'Landmark': '#4299E1', // Light Blue
  'District': '#F6AD55', // Orange 
  'Square': '#FBD38D', // Light Orange
  'Street': '#F6AD55', // Orange
  'Food': '#F56565', // Light Red
  'Residential': '#718096', // Gray-Blue
  'Uncategorized': '#718096' // Gray
};

// Helper function to get category color
const getCategoryColor = (category) => {
  if (!category) return CATEGORY_COLORS['Uncategorized'];
  
  // Try to find exact match
  if (CATEGORY_COLORS[category]) {
    return CATEGORY_COLORS[category];
  }
  
  // Try to find partial match (case insensitive)
  const lowerCategory = category.toLowerCase();
  for (const key of Object.keys(CATEGORY_COLORS)) {
    if (lowerCategory.includes(key.toLowerCase())) {
      return CATEGORY_COLORS[key];
    }
  }
  
  return CATEGORY_COLORS['Uncategorized'];
};

// City map component that uses Mapbox
export default function CityMapWithMapbox({ 
  attractions = [], 
  categories = [], 
  cityName, 
  center = [0, 0], 
  zoom = 12 
}) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const popupRef = useRef(null);
  const markersRef = useRef([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [styleLoaded, setStyleLoaded] = useState(false);
  const [activeCategories, setActiveCategories] = useState([]);
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const [mapError, setMapError] = useState(null);

  // Process attractions to extract categories
  const processCategories = () => {
    if (categories.length === 0 && attractions.length > 0) {
      // Extract categories from attractions
      const uniqueCategories = [...new Set(attractions.map(attr => {
        // Look for category field first, then try type, then default to Uncategorized
        return attr.category || attr.type || 'Uncategorized';
      }))];
      
      // Create category objects
      const derivedCategories = uniqueCategories.map(cat => ({
        category: cat,
        sites: attractions.filter(attr => (attr.category || attr.type || 'Uncategorized') === cat)
      }));
      
      setActiveCategories(derivedCategories.map(cat => cat.category));
      setShowCategoryFilter(derivedCategories.length > 1);
      return derivedCategories;
    } else if (categories.length > 0) {
      setActiveCategories(categories.map(cat => cat.category));
      setShowCategoryFilter(categories.length > 1);
      return categories;
    }
    return [];
  };

  // Initialize map
  useEffect(() => {
    if (map.current) return; // Map already initialized

    try {
      // Initialize map with a more vibrant style
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12', // More colorful style
        center: center,
        zoom: zoom,
        attributionControl: false,
        pitchWithRotate: false
      });

      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl({
        showCompass: true,
        visualizePitch: true
      }), 'top-right');
      
      map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');
      
      map.current.addControl(
        new mapboxgl.AttributionControl({ 
          compact: true,
          customAttribution: `© ${new Date().getFullYear()} | ${cityName} City Guide`
        }), 
        'bottom-right'
      );

      // On map load
      map.current.on('load', () => {
        setMapLoaded(true);
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

    // Cleanup on unmount
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [center, zoom, cityName]);

  // Add markers when map is loaded and attractions data changes
  useEffect(() => {
    if (!mapLoaded || !styleLoaded || !map.current) return;

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
        
        // Get category from attraction (try category, then type, then default)
        const attrCategory = attraction.category || attraction.type || 'Uncategorized';
        return activeCategories.includes(attrCategory);
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
        
        // Get marker color based on category
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
            ${category ? `<p class="popup-category" style="color: ${color};">${category}</p>` : ''}
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
          // Handle different rating structures
          const ratingInfo = typeof attraction.ratings === 'object' 
            ? (attraction.ratings.score || attraction.ratings.suggested_duration_hours 
                ? `${attraction.ratings.score || ''} ${attraction.ratings.suggested_duration_hours ? `(${attraction.ratings.suggested_duration_hours} hrs)` : ''}` 
                : '')
            : attraction.ratings;
            
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
        
        // Create popup with improved styling
        const popup = new mapboxgl.Popup({ 
          offset: 35, 
          closeButton: true,
          closeOnClick: false,
          maxWidth: '320px',
          className: 'custom-popup'
        }).setHTML(popupContent);
        
        // Create and store the marker
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
              
              return {
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: [lng, lat]
                },
                properties: {
                  name: attr.name,
                  category: category,
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
        
        // Fit map to visible attractions with animation
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
  }, [mapLoaded, styleLoaded, attractions, activeCategories]);

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
    if (categories.length > 0) {
      setActiveCategories(categories.map(cat => cat.category));
    } else {
      // If no categories are provided, extract them from attractions
      const uniqueCategories = [...new Set(attractions.map(attr => 
        attr.category || attr.type || 'Uncategorized'
      ))];
      setActiveCategories(uniqueCategories);
    }
  };

  // Clear all categories
  const clearAllCategories = () => {
    setActiveCategories([]);
  };

  // Get the list of categories to show in filters
  const getFilterCategories = () => {
    if (categories.length > 0) return categories;
    
    // Extract categories from attractions
    const uniqueCategories = [...new Set(attractions.map(attr => {
      // Look for category field first, then try type, then default to Uncategorized
      return attr.category || attr.type || 'Uncategorized';
    }))];
    
    // Create category objects
    return uniqueCategories.map(cat => ({
      category: cat,
      sites: attractions.filter(attr => (attr.category || attr.type || 'Uncategorized') === cat)
    }));
  };

  // Get a list of categories to show in the legend
  const getLegendCategories = () => {
    const filterCats = getFilterCategories();
    return filterCats.length <= 10 ? filterCats : filterCats.slice(0, 10);
  };

  return (
    <div className="relative w-full h-[500px] rounded-lg overflow-hidden">
      {/* Map container */}
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* Category filter panel - only show if we have categories */}
      {showCategoryFilter && (
        <div className="absolute top-4 left-4 z-10 bg-white p-4 rounded-lg shadow-lg max-w-xs max-h-[calc(100%-32px)] overflow-y-auto">
          <h3 className="font-bold text-gray-800 mb-2 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
            </svg>
            Filter Attractions
          </h3>
          <div className="flex space-x-2 mb-3">
            <button 
              onClick={selectAllCategories}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white py-1 px-2 rounded transition-colors duration-200"
            >
              Select All
            </button>
            <button 
              onClick={clearAllCategories}
              className="text-xs bg-gray-600 hover:bg-gray-700 text-white py-1 px-2 rounded transition-colors duration-200"
            >
              Clear All
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {getFilterCategories().map((cat) => (
              <button
                key={cat.category || 'uncategorized'}
                onClick={() => toggleCategory(cat.category || 'Uncategorized')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 border ${
                  activeCategories.includes(cat.category || 'Uncategorized')
                    ? 'border-transparent text-white shadow-md' 
                    : 'border-gray-300 text-gray-700 bg-gray-100 hover:bg-gray-200'
                }`}
                style={{
                  backgroundColor: activeCategories.includes(cat.category || 'Uncategorized') 
                    ? getCategoryColor(cat.category) 
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
                style={{ backgroundColor: getCategoryColor(cat.category) }}
              ></div>
              <span className="text-xs text-gray-700 truncate">{cat.category || 'Other'}</span>
            </div>
          ))}
        </div>
      </div>

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
          text-transform: uppercase;
          letter-spacing: 0.5px;
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