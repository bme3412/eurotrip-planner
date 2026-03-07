'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { motion } from 'framer-motion';

/**
 * RouteMap - Mapbox route visualization with per-leg rendering
 *
 * @param {Array} cities - Array of city objects with latitude/longitude
 * @param {Array} stops - Array of stop objects with transport details (optional)
 * @param {number} editingStopIndex - Index of stop being edited (for highlighting)
 */
export default function RouteMap({ cities = [], stops = [], editingStopIndex = null }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const mapboxglRef = useRef(null);
  const markersRef = useRef([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState(null);

  // Valid cities with coordinates
  const validCities = useMemo(() => {
    return cities.filter(c => c && c.latitude && c.longitude);
  }, [cities]);

  // Build route segments for per-leg rendering
  const routeSegments = useMemo(() => {
    if (validCities.length < 2) return [];

    const segments = [];
    for (let i = 0; i < validCities.length - 1; i++) {
      const from = validCities[i];
      const to = validCities[i + 1];
      const stop = stops[i]; // Corresponding stop (has transport info)

      let state = 'normal';
      if (editingStopIndex !== null) {
        if (i === editingStopIndex) {
          state = 'editing';
        } else if (i > editingStopIndex) {
          state = 'downstream';
        }
      }

      segments.push({
        id: `segment-${i}`,
        from,
        to,
        stop,
        state,
        coordinates: [
          [from.longitude, from.latitude],
          [to.longitude, to.latitude],
        ],
      });
    }
    return segments;
  }, [validCities, stops, editingStopIndex]);

  // Calculate bounds for all cities
  const bounds = useMemo(() => {
    if (validCities.length === 0) return null;

    const lngs = validCities.map(c => c.longitude);
    const lats = validCities.map(c => c.latitude);

    return [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    ];
  }, [validCities]);

  // Initialize map
  useEffect(() => {
    if (map.current) return;
    if (validCities.length === 0) return;

    const initMap = async () => {
      try {
        const mapboxgl = (await import('mapbox-gl')).default;
        mapboxglRef.current = mapboxgl;
        mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

        if (mapContainer.current) {
          mapContainer.current.innerHTML = '';
        }

        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/light-v11',
          center: [10, 50],
          zoom: 4,
          attributionControl: false,
          interactive: true,
          pitchWithRotate: false,
        });

        map.current.addControl(
          new mapboxgl.AttributionControl({ compact: true }),
          'bottom-right'
        );

        map.current.on('load', () => {
          setMapLoaded(true);
        });

        map.current.on('error', (e) => {
          console.error('Map error:', e);
          setError('Failed to load map');
        });
      } catch (err) {
        console.error('Map init error:', err);
        setError(err.message);
      }
    };

    initMap();

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [validCities.length > 0]);

  // Render route segments and markers
  useEffect(() => {
    if (!mapLoaded || !map.current || !mapboxglRef.current) return;

    const mapboxgl = mapboxglRef.current;

    try {
      // Remove existing layers and sources
      routeSegments.forEach((_, i) => {
        const lineId = `route-line-${i}`;
        const glowId = `route-glow-${i}`;
        if (map.current.getLayer(lineId)) map.current.removeLayer(lineId);
        if (map.current.getLayer(glowId)) map.current.removeLayer(glowId);
        if (map.current.getSource(`route-${i}`)) map.current.removeSource(`route-${i}`);
      });

      // Also clean up any legacy single route
      if (map.current.getLayer('route-line')) map.current.removeLayer('route-line');
      if (map.current.getLayer('route-line-glow')) map.current.removeLayer('route-line-glow');
      if (map.current.getSource('route')) map.current.removeSource('route');

      // Remove old markers
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];

      // Add route segments
      routeSegments.forEach((segment, i) => {
        const sourceId = `route-${i}`;
        const lineId = `route-line-${i}`;
        const glowId = `route-glow-${i}`;

        // Colors based on state
        let lineColor = '#6366f1'; // indigo
        let glowColor = '#818cf8';
        let opacity = 1;

        if (segment.state === 'editing') {
          lineColor = '#f59e0b'; // amber
          glowColor = '#fbbf24';
        } else if (segment.state === 'downstream') {
          lineColor = '#9ca3af'; // gray
          glowColor = '#d1d5db';
          opacity = 0.5;
        }

        // Add source
        map.current.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: segment.coordinates,
            },
          },
        });

        // Add glow layer
        map.current.addLayer({
          id: glowId,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': glowColor,
            'line-width': 8,
            'line-opacity': 0.3 * opacity,
            'line-blur': 3,
          },
        });

        // Add line layer
        map.current.addLayer({
          id: lineId,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': lineColor,
            'line-width': 3,
            'line-opacity': opacity,
            'line-dasharray': [2, 1],
          },
        });
      });

      // Add markers with transport pills
      validCities.forEach((city, index) => {
        const isFirst = index === 0;
        const isLast = index === validCities.length - 1;

        // Determine marker state
        let markerState = 'normal';
        if (editingStopIndex !== null) {
          if (index === editingStopIndex + 1) {
            markerState = 'editing';
          } else if (index > editingStopIndex + 1) {
            markerState = 'downstream';
          }
        }

        // Get transport info for this leg (arriving at this city)
        const stop = index > 0 ? stops[index - 1] : null;
        const transport = stop?.transport;

        // Create marker element
        const el = document.createElement('div');
        el.className = `route-marker ${markerState === 'downstream' ? 'marker-downstream' : ''}`;

        let markerClass = 'marker-mid';
        if (isFirst) markerClass = 'marker-start';
        else if (isLast) markerClass = 'marker-end';
        if (markerState === 'editing') markerClass += ' marker-editing';

        el.innerHTML = `
          <div class="route-marker-inner ${markerClass}">
            <span class="marker-num">${index + 1}</span>
          </div>
          ${transport ? `
            <div class="marker-transport-pill ${markerState === 'downstream' ? 'pill-downstream' : markerState === 'editing' ? 'pill-editing' : ''}">
              <span>${transport.icon || '🚂'}</span>
              <span>${transport.durationFormatted || ''}</span>
            </div>
          ` : ''}
          <div class="marker-city-label">${city.name}</div>
        `;

        const marker = new mapboxgl.Marker(el)
          .setLngLat([city.longitude, city.latitude])
          .addTo(map.current);

        markersRef.current.push(marker);
      });

      // Fit bounds
      if (bounds) {
        map.current.fitBounds(bounds, {
          padding: { top: 50, bottom: 50, left: 50, right: 50 },
          duration: 800,
          maxZoom: 7,
        });
      }
    } catch (err) {
      console.error('Route render error:', err);
    }
  }, [mapLoaded, routeSegments, validCities, stops, bounds, editingStopIndex]);

  // Show placeholder if no cities
  if (validCities.length === 0) {
    return (
      <div className="w-full h-full bg-slate-100 flex items-center justify-center">
        <p className="text-sm text-slate-400">Select a city to see the map</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />

      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-slate-500 text-sm">
          Map unavailable
        </div>
      )}

      <style jsx global>{`
        .route-marker {
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          transition: opacity 0.3s ease;
        }

        .route-marker.marker-downstream {
          opacity: 0.5;
        }

        .route-marker-inner {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
          color: white;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .route-marker:hover .route-marker-inner {
          transform: scale(1.15);
        }

        .marker-start {
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          border: 2px solid white;
        }

        .marker-end {
          background: linear-gradient(135deg, #10b981, #059669);
          border: 2px solid white;
        }

        .marker-mid {
          background: linear-gradient(135deg, #8b5cf6, #6d28d9);
          border: 2px solid white;
        }

        .marker-editing {
          background: linear-gradient(135deg, #f59e0b, #d97706) !important;
          box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .marker-num {
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }

        .marker-transport-pill {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 2px;
          background: white;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: 600;
          color: #6366f1;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
          border: 1px solid #e2e8f0;
          white-space: nowrap;
        }

        .pill-editing {
          color: #f59e0b;
          border-color: #fcd34d;
          background: #fffbeb;
        }

        .pill-downstream {
          color: #9ca3af;
          background: #f3f4f6;
          border-color: #e5e7eb;
        }

        .marker-city-label {
          margin-top: 4px;
          background: white;
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 600;
          color: #334155;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
}
