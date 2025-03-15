'use client';

import { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Set Mapbox token - using a default public token for demo purposes
// In production, you should use an environment variable
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4M29iazA2Z2gycXA4N2pmbDZmangifQ.-g_vE53SD2WrJ6tFX7QHmA';

// Define category colors for attractions
const CATEGORY_COLORS = {
  'Museum': '#E53E3E', // Red
  'Monument': '#DD6B20', // Orange
  'Park': '#38A169', // Green
  'Church': '#805AD5', // Purple
  'Cathedral': '#805AD5', // Purple (same as Church)
  'Basilica': '#805AD5', // Purple (same as Church)
  'Chapel': '#805AD5', // Purple (same as Church)
  'Religious': '#805AD5', // Purple (same as Church)
  'Shopping': '#3182CE', // Blue
  'Entertainment': '#D69E2E', // Yellow
  'Historical': '#6B46C1', // Indigo
  'Architecture': '#2C7A7B', // Teal
  'Cultural': '#ED64A6', // Pink
  'Landmark': '#4299E1', // Light Blue
  'District': '#F6AD55', // Orange 
  'Square': '#F6AD55', // Orange
  'Street': '#F6AD55', // Orange
  'Garden': '#38A169', // Green (same as Park)
  'Food': '#F56565', // Light Red
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
  const [activeCategories, setActiveCategories] = useState([]);
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);

  // Initialize map
  useEffect(() => {
    if (map.current) return; // Map already initialized

    // Initialize map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11', // Use a lighter style
      center: center,
      zoom: zoom,
      attributionControl: false,
      pitchWithRotate: false
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
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
      
      // Process attractions to extract categories if not provided
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
      } else if (categories.length > 0) {
        setActiveCategories(categories.map(cat => cat.category));
        setShowCategoryFilter(categories.length > 1);
      }
    });

    // Cleanup on unmount
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [center, zoom, cityName, categories, attractions]);

  // Add markers when map is loaded and attractions data changes
  useEffect(() => {
    if (!mapLoaded || !map.current) return;

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
        <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-md border-2 border-white transition-all hover:scale-110"
             style="background-color: ${color}; color: white;">
          ${index + 1}
        </div>
      `;
      
      // Create popup content
      let popupContent = `
        <div class="p-3">
          <h3 class="font-bold text-lg">${attraction.name}</h3>
          ${category ? `<p class="text-sm mb-2" style="color: ${color};">${category}</p>` : ''}
      `;
      
      // Add description if available
      if (attraction.description) {
        popupContent += `<p class="text-sm text-gray-600 mt-1">${attraction.description.substring(0, 100)}${attraction.description.length > 100 ? '...' : ''}</p>`;
      }
      
      // Add address if available
      if (attraction.address) {
        popupContent += `<p class="text-xs text-gray-500 mt-2"><strong>Address:</strong> ${attraction.address}</p>`;
      }
      
      // Add hours if available
      if (attraction.hours) {
        popupContent += `<p class="text-xs text-gray-500 mt-1"><strong>Hours:</strong> ${attraction.hours}</p>`;
      }
      
      // Add price if available (from various fields that might contain it)
      if (attraction.ticket_price || attraction.price_range || attraction.price) {
        const priceInfo = attraction.ticket_price || attraction.price_range || attraction.price;
        popupContent += `<p class="text-xs text-gray-500 mt-1"><strong>Price:</strong> ${priceInfo}</p>`;
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
          popupContent += `<p class="text-xs text-gray-500 mt-1"><strong>Rating:</strong> ${ratingInfo}</p>`;
        }
      }
      
      // Close popup div
      popupContent += `</div>`;
      
      // Create popup
      const popup = new mapboxgl.Popup({ 
        offset: 25, 
        closeButton: true,
        maxWidth: '300px'
      }).setHTML(popupContent);
      
      // Create and store the marker
      const marker = new mapboxgl.Marker(markerEl)
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map.current);
      
      markersRef.current.push(marker);
    });
    
    // Add a map layer with all attraction points for easier visibility
    if (attractions.length > 0) {
      // Remove existing layers if they exist to prevent duplicates
      if (map.current.getSource('attractions')) {
        map.current.removeLayer('attractions-layer');
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
      
      // Add halo circles under markers
      map.current.addLayer({
        id: 'attractions-layer',
        type: 'circle',
        source: 'attractions',
        paint: {
          'circle-radius': 12,
          'circle-opacity': 0.4,
          'circle-color': ['get', 'color'],
          'circle-stroke-width': 1,
          'circle-stroke-color': '#ffffff'
        }
      });
      
      // Fit map to visible attractions
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
          padding: 50,
          maxZoom: 15,
          duration: 1000
        });
      }
    }
  }, [mapLoaded, attractions, activeCategories]);

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
    return filterCats.length <= 8 ? filterCats : filterCats.slice(0, 8);
  };

  return (
    <div className="relative w-full h-full">
      {/* CSS Styles for custom markers */}
      <style jsx global>{`
        .custom-marker {
          cursor: pointer;
          transition: transform 0.2s;
        }
        .custom-marker:hover {
          transform: scale(1.2);
        }
        .mapboxgl-popup-content {
          border-radius: 10px;
          padding: 10px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }
        .category-filter-btn {
          transition: all 0.2s;
        }
        .category-filter-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
      `}</style>
      
      {/* Category filter panel - only show if we have categories */}
      {showCategoryFilter && (
        <div className="absolute top-4 left-4 z-10 bg-white p-4 rounded-lg shadow-md max-w-xs max-h-[calc(100%-32px)] overflow-y-auto">
          <h3 className="font-bold text-gray-800 mb-2">Filter by Category</h3>
          <div className="flex space-x-2 mb-3">
            <button 
              onClick={selectAllCategories}
              className="text-xs bg-blue-500 hover:bg-blue-600 text-white py-1 px-2 rounded"
            >
              Select All
            </button>
            <button 
              onClick={clearAllCategories}
              className="text-xs bg-gray-500 hover:bg-gray-600 text-white py-1 px-2 rounded"
            >
              Clear All
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {getFilterCategories().map((cat) => (
              <button
                key={cat.category || 'uncategorized'}
                onClick={() => toggleCategory(cat.category || 'Uncategorized')}
                className={`category-filter-btn px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                  activeCategories.includes(cat.category || 'Uncategorized')
                    ? 'border-transparent text-white' 
                    : 'border-gray-300 text-gray-700 bg-gray-100'
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
      
      {/* Map container */}
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* Loading indicator */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-2"></div>
            <div className="text-lg text-gray-600">Loading map...</div>
          </div>
        </div>
      )}
      
      {/* Legend for categories */}
      <div className="absolute bottom-4 right-4 z-10 bg-white p-3 rounded-lg shadow-md max-w-xs">
        <h4 className="text-xs font-bold text-gray-700 mb-2">Legend</h4>
        <div className="grid grid-cols-2 gap-1">
          {getLegendCategories().map((cat) => (
            <div key={cat.category || 'uncategorized'} className="flex items-center space-x-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getCategoryColor(cat.category) }}></div>
              <span className="text-xs text-gray-600 truncate">{cat.category || 'Other'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}