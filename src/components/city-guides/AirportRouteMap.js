'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Plane, MapPin, AlertCircle } from 'lucide-react';

// Dynamically import mapbox-gl to avoid SSR issues
let mapboxgl = null;

/**
 * AirportRouteMap - Interactive map showing airport-to-city routes
 *
 * @param {Object} data - Getting-in data with airports and routes
 * @param {string} selectedRouteId - Currently selected route ID
 * @param {function} onSelectRoute - Callback when clicking a route on the map
 * @param {string} selectedAirport - Currently selected airport code (CDG, ORY, etc.)
 * @param {function} onSelectAirport - Callback when clicking an airport marker
 * @param {string} className - Additional CSS classes
 */
const AirportRouteMap = ({
  data,
  selectedRouteId,
  onSelectRoute,
  selectedAirport,
  onSelectAirport,
  className = '',
}) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState(null);

  // Calculate map bounds to fit all airports and city center
  const calculateBounds = useCallback(() => {
    if (!data?.airports?.length || !data?.cityCenter) return null;

    const coordinates = [
      data.cityCenter.coordinates,
      ...data.airports.map((a) => a.coordinates),
    ];

    const lngs = coordinates.map((c) => c[0]);
    const lats = coordinates.map((c) => c[1]);

    return [
      [Math.min(...lngs), Math.min(...lats)], // SW
      [Math.max(...lngs), Math.max(...lats)], // NE
    ];
  }, [data]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || !data) return;

    const initMap = async () => {
      try {
        // Dynamic import of mapbox-gl
        if (!mapboxgl) {
          const mapboxModule = await import('mapbox-gl');
          mapboxgl = mapboxModule.default;
          await import('mapbox-gl/dist/mapbox-gl.css');
        }

        const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
        if (!token) {
          setError('Map unavailable - missing configuration');
          return;
        }

        mapboxgl.accessToken = token;

        const bounds = calculateBounds();

        const map = new mapboxgl.Map({
          container: mapContainerRef.current,
          style: 'mapbox://styles/mapbox/light-v11',
          bounds: bounds,
          fitBoundsOptions: { padding: 50 },
          attributionControl: false,
        });

        // Add minimal controls
        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

        map.on('load', () => {
          mapRef.current = map;
          setMapLoaded(true);
        });

        map.on('error', (e) => {
          console.error('Map error:', e);
          setError('Failed to load map');
        });

        return () => {
          map.remove();
        };
      } catch (err) {
        console.error('Error initializing map:', err);
        setError('Failed to initialize map');
      }
    };

    initMap();
  }, [data, calculateBounds]);

  // Add markers when map is loaded
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !data) return;

    const map = mapRef.current;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Add city center marker
    if (data.cityCenter) {
      const el = document.createElement('div');
      el.className = 'city-center-marker';
      el.innerHTML = `
        <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
          <svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
        </div>
      `;

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat(data.cityCenter.coordinates)
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(
            `<div class="p-2"><strong>${data.cityCenter.name}</strong></div>`
          )
        )
        .addTo(map);

      markersRef.current.push(marker);
    }

    // Add airport markers
    data.airports?.forEach((airport) => {
      const isSelected = selectedAirport === airport.code;
      const el = document.createElement('div');
      el.className = 'airport-marker cursor-pointer';
      el.innerHTML = `
        <div class="relative">
          <div class="w-10 h-10 ${isSelected ? 'bg-sky-500 scale-110' : 'bg-gray-700'} rounded-full flex items-center justify-center shadow-lg border-2 border-white transition-all duration-200 hover:scale-110">
            <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
            </svg>
          </div>
          <div class="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
            <span class="px-2 py-0.5 bg-white rounded-full text-xs font-medium shadow-sm border ${isSelected ? 'border-sky-400 text-sky-700' : 'border-gray-200 text-gray-700'}">
              ${airport.code}
            </span>
          </div>
        </div>
      `;

      el.addEventListener('click', () => {
        onSelectAirport?.(airport.code);
      });

      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat(airport.coordinates)
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(
            `<div class="p-2">
              <strong>${airport.fullName || airport.name}</strong>
              <p class="text-sm text-gray-600">${airport.distanceKm}km from center</p>
              ${airport.terminals ? `<p class="text-xs text-gray-500">Terminals: ${airport.terminals}</p>` : ''}
            </div>`
          )
        )
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [mapLoaded, data, selectedAirport, onSelectAirport]);

  // Draw route line when a route is selected
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !data || !selectedRouteId) return;

    const map = mapRef.current;
    const sourceId = 'selected-route';
    const layerId = 'selected-route-line';

    // Find the selected route
    let selectedRoute = null;
    for (const airport of data.airports || []) {
      const route = airport.routes?.find((r) => r.id === selectedRouteId);
      if (route) {
        selectedRoute = route;
        break;
      }
    }

    // Remove existing route layer
    if (map.getLayer(layerId)) {
      map.removeLayer(layerId);
    }
    if (map.getSource(sourceId)) {
      map.removeSource(sourceId);
    }

    if (!selectedRoute || !selectedRoute.waypoints) return;

    // Add route source and layer
    map.addSource(sourceId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: selectedRoute.waypoints,
        },
      },
    });

    map.addLayer({
      id: layerId,
      type: 'line',
      source: sourceId,
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': selectedRoute.color || '#3B82F6',
        'line-width': 4,
        'line-opacity': 0.8,
        'line-dasharray': selectedRoute.type === 'taxi' || selectedRoute.type === 'rideshare'
          ? [2, 1]
          : [1],
      },
    });

    // Fit bounds to show route
    const coordinates = selectedRoute.waypoints;
    if (coordinates.length > 1) {
      const lngs = coordinates.map((c) => c[0]);
      const lats = coordinates.map((c) => c[1]);
      const bounds = [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ];
      map.fitBounds(bounds, { padding: 60, duration: 500 });
    }
  }, [mapLoaded, data, selectedRouteId]);

  // Clear route when deselected
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || selectedRouteId) return;

    const map = mapRef.current;
    const layerId = 'selected-route-line';
    const sourceId = 'selected-route';

    if (map.getLayer(layerId)) {
      map.removeLayer(layerId);
    }
    if (map.getSource(sourceId)) {
      map.removeSource(sourceId);
    }

    // Reset to show all airports
    const bounds = calculateBounds();
    if (bounds) {
      map.fitBounds(bounds, { padding: 50, duration: 500 });
    }
  }, [mapLoaded, selectedRouteId, calculateBounds]);

  // Error state
  if (error) {
    return (
      <div className={`bg-gray-100 rounded-xl flex items-center justify-center ${className}`}>
        <div className="text-center p-6">
          <AlertCircle className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">{error}</p>
          <p className="text-sm text-gray-500 mt-1">Airport route information is shown below</p>
        </div>
      </div>
    );
  }

  // No data state
  if (!data) {
    return (
      <div className={`bg-gray-100 rounded-xl flex items-center justify-center ${className}`}>
        <div className="text-center p-6">
          <Plane className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Airport routes map coming soon</p>
          <p className="text-sm text-gray-500 mt-1">See arrival tips below</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative rounded-xl overflow-hidden ${className}`}>
      {/* Map container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Loading overlay */}
      {!mapLoaded && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-600">Loading map...</span>
          </div>
        </div>
      )}

      {/* Legend */}
      {mapLoaded && (
        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm rounded-lg shadow-sm border border-gray-200 px-3 py-2 text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-gray-700 rounded-full" />
              <span className="text-gray-600">Airport</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-blue-600 rounded-full" />
              <span className="text-gray-600">City Center</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AirportRouteMap;
