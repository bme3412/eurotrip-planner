"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import Map, { Marker, Source, Layer } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

// Europe center and bounds
const EUROPE_CENTER = { longitude: 10, latitude: 50 };
const EUROPE_ZOOM = 3.5;

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

/**
 * MapboxMap - Live interactive Mapbox map.
 *
 * @param {Object} props
 * @param {Array} props.cities - Cities to show { id, name, lat, lon }
 * @param {boolean} props.showRoute - Whether to draw route line
 * @param {Function} props.onCityClick - Called when pin is clicked
 * @param {Function} props.onReady - Called when map is loaded
 */
export default function MapboxMap({
  cities = [],
  showRoute = false,
  onCityClick,
  onReady,
}) {
  const mapRef = useRef(null);
  const [scrollZoomEnabled, setScrollZoomEnabled] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const prevCitiesRef = useRef([]);

  // Check for reduced motion preference
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    setPrefersReducedMotion(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }, []);

  // Handle map load
  const handleLoad = useCallback(() => {
    setMapLoaded(true);
    onReady?.();
  }, [onReady]);

  // Enable scroll zoom on click
  const handleClick = useCallback((e) => {
    // If clicking on empty map area, enable scroll zoom
    if (!e.features?.length) {
      setScrollZoomEnabled(true);
    }
  }, []);

  // Fly to bounds when cities change
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || cities.length === 0) return;

    const map = mapRef.current.getMap();
    if (!map) return;

    // Check if cities actually changed
    const prevIds = prevCitiesRef.current.map(c => c.id).join(",");
    const currIds = cities.map(c => c.id).join(",");
    if (prevIds === currIds) return;

    prevCitiesRef.current = cities;

    // Calculate bounds
    const lons = cities.map(c => c.lon);
    const lats = cities.map(c => c.lat);

    const bounds = [
      [Math.min(...lons), Math.min(...lats)],
      [Math.max(...lons), Math.max(...lats)],
    ];

    // Fly to bounds
    if (prefersReducedMotion) {
      map.fitBounds(bounds, { padding: 80, duration: 0 });
    } else {
      map.fitBounds(bounds, {
        padding: 80,
        duration: 900,
        easing: (t) => 1 - Math.pow(1 - t, 3), // ease-out cubic
      });
    }
  }, [cities, mapLoaded, prefersReducedMotion]);

  // Generate route GeoJSON
  const routeGeoJSON = showRoute && cities.length > 1
    ? {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: cities.map(c => [c.lon, c.lat]),
        },
      }
    : null;

  if (!MAPBOX_TOKEN) {
    console.warn("NEXT_PUBLIC_MAPBOX_TOKEN is not set");
    return null;
  }

  return (
    <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden">
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{
          ...EUROPE_CENTER,
          zoom: EUROPE_ZOOM,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        scrollZoom={scrollZoomEnabled}
        onClick={handleClick}
        onLoad={handleLoad}
        attributionControl={false}
        reuseMaps
      >
        {/* Route line */}
        {routeGeoJSON && (
          <Source id="route" type="geojson" data={routeGeoJSON}>
            <Layer
              id="route-line"
              type="line"
              paint={{
                "line-color": "var(--hero-accent, #3b82f6)",
                "line-width": 2,
                "line-dasharray": [2, 1],
              }}
            />
          </Source>
        )}

        {/* City markers */}
        {cities.map((city, index) => (
          <Marker
            key={city.id}
            longitude={city.lon}
            latitude={city.lat}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              onCityClick?.(city);
            }}
          >
            <div className="relative group cursor-pointer">
              {/* Pulse ring */}
              <span
                className="absolute -inset-2 rounded-full bg-hero-accent/30 animate-ping motion-reduce:animate-none"
                style={{ animationDuration: "2s" }}
              />

              {/* Pin body */}
              <div className="relative w-7 h-7 rounded-full bg-hero-accent text-white flex items-center justify-center text-xs font-bold shadow-lg group-hover:scale-110 transition-transform border-2 border-white">
                {cities.length > 1 ? index + 1 : ""}
              </div>

              {/* City label */}
              <span className="absolute top-full mt-1 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-white/95 backdrop-blur-sm rounded text-xs font-medium text-hero-ink whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                {city.name}
              </span>
            </div>
          </Marker>
        ))}
      </Map>

      {/* Click to enable scroll hint */}
      {!scrollZoomEnabled && mapLoaded && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-full text-xs text-gray-600 shadow-sm pointer-events-none">
          Click to enable scroll zoom
        </div>
      )}
    </div>
  );
}
