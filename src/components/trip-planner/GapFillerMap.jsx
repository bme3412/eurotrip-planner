'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import 'mapbox-gl/dist/mapbox-gl.css';
import CityPopup from './CityPopup';

/**
 * GapFillerMap
 *
 * Interactive map showing:
 * - Anchor city as a prominent marker
 * - All reachable cities as colored pins (by score)
 * - Route lines on hover/selection
 * - Click pin -> show detail popup
 */
export default function GapFillerMap({
  anchorCity,
  suggestions = [],
  selectedCity,
  hoveredCity,
  onSelectCity,
  onHoverCity,
}) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const mapboxglRef = useRef(null);
  const markersRef = useRef([]);
  const popupRef = useRef(null);
  const popupRootRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState(null);

  // Get coordinates for anchor city from suggestions or use default
  const anchorCoords = useMemo(() => {
    // Find anchor in suggestions data (it might have coords)
    // For now, we'll need to load from cities.json
    return anchorCity?.coords || null;
  }, [anchorCity]);

  // Calculate map bounds to fit anchor + all suggestions
  const bounds = useMemo(() => {
    const coords = [];

    if (anchorCoords) {
      coords.push(anchorCoords);
    }

    suggestions.forEach(city => {
      if (city.latitude && city.longitude) {
        coords.push([city.longitude, city.latitude]);
      }
    });

    if (coords.length === 0) return null;

    const lngs = coords.map(c => c[0]);
    const lats = coords.map(c => c[1]);

    return [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    ];
  }, [anchorCoords, suggestions]);

  // Get pin color based on score
  const getPinColor = useCallback((score) => {
    if (score >= 75) return '#c9a227'; // gold - highly recommended
    if (score >= 55) return '#94a3b8'; // silver - good option
    return '#cbd5e1'; // gray - viable
  }, []);

  // Initialize map
  useEffect(() => {
    if (map.current) return;
    if (suggestions.length === 0 && !anchorCoords) return;

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
          center: anchorCoords || [10, 50],
          zoom: 4,
          attributionControl: false,
          interactive: true,
          pitchWithRotate: false,
          // Restrict to Europe bounds
          maxBounds: [
            [-25, 34],  // Southwest: Atlantic/Morocco
            [45, 72],   // Northeast: Ural/Scandinavia
          ],
          minZoom: 3,
          maxZoom: 12,
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
      // Cleanup popup root
      if (popupRootRef.current) {
        popupRootRef.current.unmount();
        popupRootRef.current = null;
      }
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [anchorCoords, suggestions.length]);

  // Render markers and route lines
  useEffect(() => {
    if (!mapLoaded || !map.current || !mapboxglRef.current) return;

    const mapboxgl = mapboxglRef.current;

    try {
      // Remove existing markers
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];

      // Remove existing route lines
      suggestions.forEach((_, i) => {
        const lineId = `route-line-${i}`;
        if (map.current.getLayer(lineId)) map.current.removeLayer(lineId);
        if (map.current.getSource(`route-${i}`)) map.current.removeSource(`route-${i}`);
      });

      // Add anchor marker
      if (anchorCoords) {
        const anchorEl = document.createElement('div');
        anchorEl.className = 'anchor-marker';
        anchorEl.innerHTML = `
          <div class="anchor-marker-inner">
            <span class="anchor-icon">📍</span>
          </div>
          <div class="anchor-label">${anchorCity?.name || 'Start'}</div>
        `;

        const anchorMarker = new mapboxgl.Marker(anchorEl)
          .setLngLat(anchorCoords)
          .addTo(map.current);

        markersRef.current.push(anchorMarker);
      }

      // Add suggestion markers
      suggestions.forEach((city, index) => {
        if (!city.latitude || !city.longitude) return;

        const isSelected = selectedCity?.id === city.id;
        const isHovered = hoveredCity?.id === city.id;
        const pinColor = getPinColor(city.score);

        // Create marker element
        const el = document.createElement('div');
        el.className = `suggestion-marker ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''}`;
        el.innerHTML = `
          <div class="suggestion-pin" style="background: ${pinColor}; border-color: ${isSelected ? '#4a7c59' : isHovered ? '#c9a227' : pinColor}">
            <span class="pin-score">${city.score}</span>
          </div>
          ${isHovered || isSelected ? `<div class="suggestion-label">${city.name}</div>` : ''}
        `;

        // Add click handler
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          showPopup(city, [city.longitude, city.latitude]);
        });

        // Add hover handlers
        el.addEventListener('mouseenter', () => {
          onHoverCity?.(city);
        });

        el.addEventListener('mouseleave', () => {
          onHoverCity?.(null);
        });

        const marker = new mapboxgl.Marker(el)
          .setLngLat([city.longitude, city.latitude])
          .addTo(map.current);

        markersRef.current.push(marker);

        // Draw route line from anchor to this city if hovered or selected
        if ((isHovered || isSelected) && anchorCoords) {
          const sourceId = `route-${index}`;
          const lineId = `route-line-${index}`;

          map.current.addSource(sourceId, {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: [anchorCoords, [city.longitude, city.latitude]],
              },
            },
          });

          map.current.addLayer({
            id: lineId,
            type: 'line',
            source: sourceId,
            paint: {
              'line-color': isSelected ? '#4a7c59' : '#c9a227',
              'line-width': 2,
              'line-dasharray': [2, 1],
              'line-opacity': 0.8,
            },
          });
        }
      });

      // Fit bounds
      if (bounds) {
        map.current.fitBounds(bounds, {
          padding: { top: 60, bottom: 60, left: 60, right: 60 },
          duration: 500,
          maxZoom: 7,
        });
      }
    } catch (err) {
      console.error('Marker render error:', err);
    }
  }, [mapLoaded, suggestions, anchorCoords, anchorCity, selectedCity, hoveredCity, bounds, getPinColor, onHoverCity]);

  // Show popup for a city
  const showPopup = useCallback((city, lngLat) => {
    if (!map.current || !mapboxglRef.current) return;

    const mapboxgl = mapboxglRef.current;

    // Remove existing popup
    if (popupRef.current) {
      popupRef.current.remove();
      if (popupRootRef.current) {
        popupRootRef.current.unmount();
        popupRootRef.current = null;
      }
    }

    // Create popup container
    const popupContainer = document.createElement('div');

    // Create React root and render popup
    const root = createRoot(popupContainer);
    popupRootRef.current = root;

    root.render(
      <CityPopup
        city={city}
        onSelect={(c) => {
          onSelectCity?.(c);
          popupRef.current?.remove();
        }}
        onClose={() => {
          popupRef.current?.remove();
        }}
      />
    );

    // Create Mapbox popup
    popupRef.current = new mapboxgl.Popup({
      closeButton: true,
      closeOnClick: true,
      maxWidth: '340px',
      className: 'city-popup',
    })
      .setLngLat(lngLat)
      .setDOMContent(popupContainer)
      .addTo(map.current);
  }, [onSelectCity]);

  // Show placeholder if no data
  if (suggestions.length === 0 && !anchorCoords) {
    return (
      <div className="w-full h-full bg-[#faf8f5] flex items-center justify-center">
        <p className="text-sm text-[#8a8578]">Add an anchor city to see the map</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden">
      <div ref={mapContainer} className="w-full h-full" />

      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#faf8f5]">
          <div className="w-5 h-5 border-2 border-[#c9a227]/30 border-t-[#c9a227] rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#faf8f5] text-[#8a8578] text-sm">
          Map unavailable
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-[#e5e0d8]">
        <div className="flex items-center gap-4 text-[10px] text-[#6a6459]">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#c9a227]" />
            <span>Great</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#94a3b8]" />
            <span>Good</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#cbd5e1]" />
            <span>Viable</span>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .anchor-marker {
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: default;
        }

        .anchor-marker-inner {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, #4a7c59, #3a6249);
          border: 3px solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
        }

        .anchor-icon {
          font-size: 18px;
        }

        .anchor-label {
          margin-top: 4px;
          background: #4a7c59;
          color: white;
          padding: 2px 10px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 600;
          white-space: nowrap;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
        }

        .suggestion-marker {
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          transition: transform 0.15s ease;
        }

        .suggestion-marker:hover,
        .suggestion-marker.hovered {
          transform: scale(1.1);
          z-index: 10;
        }

        .suggestion-marker.selected {
          z-index: 20;
        }

        .suggestion-pin {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
          transition: border-color 0.15s, transform 0.15s;
        }

        .suggestion-marker.selected .suggestion-pin {
          border-color: #4a7c59 !important;
          border-width: 3px;
          box-shadow: 0 0 0 4px rgba(74, 124, 89, 0.2), 0 2px 6px rgba(0, 0, 0, 0.2);
        }

        .suggestion-marker.hovered .suggestion-pin {
          border-color: #c9a227 !important;
        }

        .pin-score {
          font-size: 10px;
          font-weight: 700;
          color: white;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }

        .suggestion-label {
          margin-top: 4px;
          background: white;
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 10px;
          font-weight: 600;
          color: #2a2520;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
          white-space: nowrap;
          border: 1px solid #e5e0d8;
        }

        .city-popup .mapboxgl-popup-content {
          padding: 0;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }

        .city-popup .mapboxgl-popup-close-button {
          padding: 8px;
          font-size: 18px;
          color: #6a6459;
        }

        .city-popup .mapboxgl-popup-close-button:hover {
          color: #2a2520;
          background: transparent;
        }

        .city-popup .mapboxgl-popup-tip {
          border-top-color: white;
        }
      `}</style>
    </div>
  );
}
