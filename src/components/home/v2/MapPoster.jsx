"use client";

import Image from "next/image";

// Featured cities shown on the poster (default pins before user types)
const FEATURED_CITIES = [
  { id: "paris", name: "Paris", lat: 48.8566, lon: 2.3522 },
  { id: "lisbon", name: "Lisbon", lat: 38.7223, lon: -9.1393 },
  { id: "rome", name: "Rome", lat: 41.9028, lon: 12.4964 },
  { id: "barcelona", name: "Barcelona", lat: 41.3851, lon: 2.1734 },
  { id: "prague", name: "Prague", lat: 50.0755, lon: 14.4378 },
  { id: "copenhagen", name: "Copenhagen", lat: 55.6761, lon: 12.5683 },
  { id: "athens", name: "Athens", lat: 37.9838, lon: 23.7275 },
  { id: "amsterdam", name: "Amsterdam", lat: 52.3676, lon: 4.9041 },
];

// Map bounds for projection (approx Europe view)
const MAP_BOUNDS = {
  west: -15,
  east: 35,
  north: 62,
  south: 34,
};

/**
 * Convert lat/lon to percentage positions on the poster.
 */
function latLonToPercent(lat, lon) {
  const x = ((lon - MAP_BOUNDS.west) / (MAP_BOUNDS.east - MAP_BOUNDS.west)) * 100;
  const y = ((MAP_BOUNDS.north - lat) / (MAP_BOUNDS.north - MAP_BOUNDS.south)) * 100;
  return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
}

/**
 * MapPoster - Static poster image with SVG pins for LCP performance.
 * Shows featured cities with pulsing pins before user interaction.
 *
 * @param {Object} props
 * @param {Array} props.cities - Cities to show pins for (defaults to featured)
 * @param {boolean} props.showRoute - Whether to draw route line between cities
 * @param {Function} props.onCityClick - Called when a pin is clicked
 * @param {string} props.className - Additional classes
 */
export default function MapPoster({
  cities = FEATURED_CITIES,
  showRoute = false,
  onCityClick,
  className = "",
}) {
  const displayCities = cities.length > 0 ? cities : FEATURED_CITIES;

  // Calculate pin positions
  const pins = displayCities.map((city, index) => ({
    ...city,
    ...latLonToPercent(city.lat, city.lon),
    index: index + 1,
  }));

  // Generate route path
  const routePath = showRoute && pins.length > 1
    ? pins.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")
    : null;

  return (
    <div className={`relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 ${className}`}>
      {/* Static poster background - gradient fallback if image unavailable */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-slate-100 to-indigo-50" />
      <Image
        src="/images/hero/europe-poster.webp"
        alt="Map of Europe"
        fill
        priority
        className="object-cover"
        sizes="(max-width: 768px) 100vw, 50vw"
        onError={(e) => {
          // Hide broken image, showing gradient fallback
          e.currentTarget.style.display = 'none';
        }}
      />

      {/* SVG overlay for pins and route */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {/* Route line */}
        {routePath && (
          <path
            d={routePath}
            fill="none"
            stroke="var(--hero-accent, #3b82f6)"
            strokeWidth="0.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="1 0.5"
            className="animate-route-draw"
            style={{
              vectorEffect: "non-scaling-stroke",
              strokeWidth: "2px",
            }}
          />
        )}
      </svg>

      {/* Pins as absolutely positioned elements for better interaction */}
      {pins.map((pin) => (
        <button
          key={pin.id}
          type="button"
          onClick={() => onCityClick?.(pin)}
          className="absolute transform -translate-x-1/2 -translate-y-full pointer-events-auto group"
          style={{
            left: `${pin.x}%`,
            top: `${pin.y}%`,
          }}
          aria-label={`${pin.name}${cities.length > 1 ? `, stop ${pin.index}` : ""}`}
        >
          {/* Pin */}
          <div className="relative">
            {/* Pulse ring - CSS only animation */}
            <span
              className="absolute -inset-2 rounded-full bg-hero-accent/30 animate-ping motion-reduce:animate-none"
              style={{ animationDuration: "2s" }}
            />

            {/* Pin body */}
            <div className="relative w-6 h-6 rounded-full bg-hero-accent text-white flex items-center justify-center text-xs font-bold shadow-md group-hover:scale-110 transition-transform">
              {cities.length > 1 ? pin.index : ""}
            </div>

            {/* Pin pointer */}
            <div
              className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0"
              style={{
                borderLeft: "4px solid transparent",
                borderRight: "4px solid transparent",
                borderTop: "6px solid var(--hero-accent, #3b82f6)",
              }}
            />
          </div>

          {/* City label on hover */}
          <span className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-white/90 backdrop-blur-sm rounded text-xs font-medium text-hero-ink whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
            {pin.name}
          </span>
        </button>
      ))}
    </div>
  );
}

export { FEATURED_CITIES, latLonToPercent, MAP_BOUNDS };
