'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';
import citiesData from '@/generated/cities.json';
import { useTransportAnimation } from '@/hooks/useTransportAnimation';
import TransportAnimationOverlay from '@/components/planner/TransportAnimationOverlay';
import { calculateDistance } from '@/utils/lineInterpolation';

// Build coordinate lookup
const cityCoords = {};
for (const city of citiesData) {
  if (city.latitude && city.longitude) {
    cityCoords[city.id] = {
      lng: city.longitude,
      lat: city.latitude,
      name: city.name,
      country: city.country,
    };
  }
}

/**
 * TripMap - Unified map showing trip itinerary and suggestions
 *
 * Shows:
 * - Anchor cities (green markers, numbered)
 * - Filled gap cities (gold markers, numbered)
 * - Animated transport icons moving between cities
 * - Suggestion cities (smaller, score-colored pins) when provided
 */
export default function TripMap({
  itinerary = [],
  suggestions = [],
  hoveredSuggestion = null,
  onSelectSuggestion,
  onHoverSuggestion,
  className = '',
}) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const mapboxglRef = useRef(null);
  const markersRef = useRef([]);
  const suggestionMarkersRef = useRef([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState(null);

  // Extract cities with coordinates from itinerary
  const cities = useMemo(() => {
    return itinerary
      .filter(item => item.type === 'anchor' || item.type === 'gap-filled')
      .map((item, index) => {
        const cityId = item.city || item.cityId;
        const coords = cityCoords[cityId];
        return {
          id: cityId,
          name: item.cityName || coords?.name || cityId,
          country: item.country || coords?.country,
          type: item.type,
          lng: coords?.lng,
          lat: coords?.lat,
          index,
          // Transport info for how you GET to this city
          transportType: item.transportType,
          transportTime: item.transportTime,
        };
      })
      .filter(c => c.lng && c.lat);
  }, [itinerary]);

  // Build route segments for animation
  const routeSegments = useMemo(() => {
    if (cities.length < 2) return [];

    const segments = [];
    for (let i = 0; i < cities.length - 1; i++) {
      const from = cities[i];
      const to = cities[i + 1];

      // Get transport type from destination city, or auto-detect based on distance
      let transportType = to.transportType?.toLowerCase();

      if (!transportType) {
        // Calculate distance between cities
        const distance = calculateDistance([from.lng, from.lat], [to.lng, to.lat]);

        // Auto-detect transport type based on distance
        if (distance > 800) {
          transportType = 'flight'; // > 800km = likely a flight
        } else if (distance > 300) {
          transportType = 'train';  // 300-800km = train
        } else {
          transportType = 'train';  // < 300km = could be train or bus, default train
        }
      }

      segments.push({
        id: `segment-${i}`,
        from,
        to,
        state: 'normal',
        coordinates: [
          [from.lng, from.lat],
          [to.lng, to.lat],
        ],
        stop: {
          transport: {
            mode: transportType,
          },
        },
      });
    }
    return segments;
  }, [cities]);

  // Animated transport icons
  const animationStates = useTransportAnimation(routeSegments, map, mapLoaded);

  // Get pin color based on score
  const getPinColor = useCallback((score) => {
    if (score >= 75) return '#c9a227'; // gold
    if (score >= 55) return '#94a3b8'; // silver
    return '#cbd5e1'; // gray
  }, []);

  // Calculate bounds including both cities and suggestions
  const bounds = useMemo(() => {
    const allCoords = [
      ...cities.map(c => [c.lng, c.lat]),
      ...suggestions.filter(s => s.latitude && s.longitude).map(s => [s.longitude, s.latitude]),
    ];

    if (allCoords.length === 0) return null;

    const lngs = allCoords.map(c => c[0]);
    const lats = allCoords.map(c => c[1]);

    return [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    ];
  }, [cities, suggestions]);

  // Determine if we have data to display
  const hasData = cities.length > 0 || suggestions.length > 0;

  // Initialize map
  useEffect(() => {
    if (map.current) return;
    if (!hasData) return;

    const initMap = async () => {
      try {
        const mapboxgl = (await import('mapbox-gl')).default;
        mapboxglRef.current = mapboxgl;
        mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

        if (mapContainer.current) {
          mapContainer.current.innerHTML = '';
        }

        // Center on first city or first suggestion
        const firstPoint = cities[0] || (suggestions[0] && {
          lng: suggestions[0].longitude,
          lat: suggestions[0].latitude,
        });

        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/light-v11',
          center: firstPoint ? [firstPoint.lng, firstPoint.lat] : [10, 50],
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
          setError('Map failed to load');
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
        setMapLoaded(false);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasData]);

  // Update markers and routes when data changes
  useEffect(() => {
    if (!mapLoaded || !map.current || !mapboxglRef.current) return;

    const mapboxgl = mapboxglRef.current;

    try {
      // Remove old markers
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      suggestionMarkersRef.current.forEach(m => m.remove());
      suggestionMarkersRef.current = [];

      // Clean up any old route layers (no longer drawing lines between cities)
      ['route-line', 'route-glow', 'suggestion-line', 'suggestion-glow'].forEach(id => {
        if (map.current.getLayer(id)) map.current.removeLayer(id);
      });
      ['route', 'suggestion-route'].forEach(id => {
        if (map.current.getSource(id)) map.current.removeSource(id);
      });

      // Add suggestion markers
      suggestions.forEach((suggestion) => {
        if (!suggestion.latitude || !suggestion.longitude) return;

        const isHovered = hoveredSuggestion?.id === suggestion.id;
        const pinColor = getPinColor(suggestion.score || 50);

        const el = document.createElement('div');
        el.className = `suggestion-marker ${isHovered ? 'hovered' : ''}`;
        el.innerHTML = `
          <div class="suggestion-pin" style="background: ${pinColor}; border-color: ${isHovered ? '#c9a227' : pinColor}">
            <span class="suggestion-score">${suggestion.score || ''}</span>
          </div>
          ${isHovered ? `<div class="suggestion-label">${suggestion.name}</div>` : ''}
        `;

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          onSelectSuggestion?.(suggestion);
        });

        el.addEventListener('mouseenter', () => {
          onHoverSuggestion?.(suggestion);
        });

        el.addEventListener('mouseleave', () => {
          onHoverSuggestion?.(null);
        });

        const marker = new mapboxgl.Marker(el)
          .setLngLat([suggestion.longitude, suggestion.latitude])
          .addTo(map.current);

        suggestionMarkersRef.current.push(marker);
      });

      // Add itinerary markers (on top of suggestions)
      cities.forEach((city, index) => {
        const isAnchor = city.type === 'anchor';
        const isFirst = index === 0;
        const isLast = index === cities.length - 1;

        const el = document.createElement('div');
        el.className = 'trip-marker';
        el.innerHTML = `
          <div class="trip-marker-pin ${isAnchor ? 'anchor' : 'gap-filled'} ${isFirst ? 'first' : ''} ${isLast ? 'last' : ''}">
            <span class="marker-num">${index + 1}</span>
          </div>
          <div class="trip-marker-label">${city.name}</div>
        `;

        const marker = new mapboxgl.Marker(el)
          .setLngLat([city.lng, city.lat])
          .addTo(map.current);

        markersRef.current.push(marker);
      });

      // Fit bounds with padding
      if (bounds) {
        map.current.fitBounds(bounds, {
          padding: { top: 50, bottom: 50, left: 50, right: 50 },
          duration: 500,
          maxZoom: 7,
        });
      }
    } catch (err) {
      console.error('Map update error:', err);
    }
  }, [mapLoaded, cities, suggestions, hoveredSuggestion, bounds, getPinColor, onSelectSuggestion, onHoverSuggestion]);

  // Don't render until we have cities or suggestions
  if (cities.length === 0 && suggestions.length === 0) {
    return (
      <div className={`relative rounded-xl overflow-hidden border border-[#e5e0d8] bg-[#faf8f5] flex items-center justify-center ${className}`}>
        <p className="text-sm text-[#8a8578]">Add a city to see the map</p>
      </div>
    );
  }

  return (
    <div className={`relative rounded-xl overflow-hidden border border-[#e5e0d8] ${className}`}>
      <div ref={mapContainer} className="w-full h-full min-h-[200px]" />

      {/* Animated transport icons */}
      {mapLoaded && animationStates.length > 0 && (
        <TransportAnimationOverlay animationStates={animationStates} />
      )}

      {!mapLoaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#faf8f5]">
          <div className="w-5 h-5 border-2 border-[#c9a227]/30 border-t-[#c9a227] rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#faf8f5] text-[#8a8578] text-sm">
          {error}
        </div>
      )}

      {/* Status badge */}
      <div className="absolute top-3 left-3 flex items-center gap-2">
        {cities.length > 0 && (
          <div className="px-2.5 py-1 bg-white/95 backdrop-blur-sm rounded-lg text-xs text-[#6a6459] border border-[#e5e0d8] shadow-sm">
            {cities.length} {cities.length === 1 ? 'city' : 'cities'}
          </div>
        )}
        {suggestions.length > 0 && (
          <div className="px-2.5 py-1 bg-[#faf6eb]/95 backdrop-blur-sm rounded-lg text-xs text-[#a08545] border border-[#c9a227]/30 shadow-sm">
            {suggestions.length} options
          </div>
        )}
      </div>

      {/* Legend when showing suggestions */}
      {suggestions.length > 0 && (
        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm border border-[#e5e0d8]">
          <div className="flex items-center gap-3 text-[10px] text-[#6a6459]">
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
      )}

      <style jsx global>{`
        .trip-marker {
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          z-index: 10;
        }

        .trip-marker-pin {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
          transition: transform 0.15s;
        }

        .trip-marker:hover .trip-marker-pin {
          transform: scale(1.15);
        }

        .trip-marker-pin.anchor {
          background: linear-gradient(135deg, #4a7c59, #3a6249);
        }

        .trip-marker-pin.gap-filled {
          background: linear-gradient(135deg, #c9a227, #a08545);
        }

        .trip-marker-pin.first,
        .trip-marker-pin.last {
          border-width: 3px;
          width: 32px;
          height: 32px;
        }

        .marker-num {
          color: white;
          font-size: 11px;
          font-weight: 700;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }

        .trip-marker-label {
          margin-top: 4px;
          background: white;
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 10px;
          font-weight: 600;
          color: #2a2520;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
          white-space: nowrap;
          border: 1px solid #e5e0d8;
        }

        .suggestion-marker {
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          transition: transform 0.15s;
          z-index: 5;
        }

        .suggestion-marker:hover,
        .suggestion-marker.hovered {
          transform: scale(1.15);
          z-index: 8;
        }

        .suggestion-pin {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
          transition: border-color 0.15s;
        }

        .suggestion-marker.hovered .suggestion-pin {
          border-color: #c9a227 !important;
          box-shadow: 0 0 0 3px rgba(201, 162, 39, 0.2), 0 2px 4px rgba(0, 0, 0, 0.15);
        }

        .suggestion-score {
          font-size: 9px;
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
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
          white-space: nowrap;
          border: 1px solid #e5e0d8;
        }

        .transit-label {
          z-index: 6;
          pointer-events: none;
        }

        .transit-pill {
          display: flex;
          align-items: center;
          gap: 3px;
          background: white;
          padding: 3px 8px;
          border-radius: 12px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
          border: 1px solid #e5e0d8;
          white-space: nowrap;
        }

        .transit-icon {
          font-size: 11px;
          line-height: 1;
        }

        .transit-time {
          font-size: 10px;
          font-weight: 600;
          color: #6a6459;
        }
      `}</style>
    </div>
  );
}
