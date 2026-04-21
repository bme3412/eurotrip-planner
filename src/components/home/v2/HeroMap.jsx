"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import MapPoster, { FEATURED_CITIES } from "./MapPoster";

// Lazy load Mapbox - only on desktop and after interaction
const MapboxMap = dynamic(() => import("./MapboxMap"), {
  ssr: false,
  loading: () => null,
});

/**
 * HeroMap - Two-stage map rendering for optimal LCP.
 *
 * Stage 1: Static MapPoster with CSS-only animations (synchronous, LCP candidate)
 * Stage 2: Live Mapbox swapped in after idle or pointer-enter (deferred)
 *
 * @param {Object} props
 * @param {Array} props.cities - Cities to show on map
 * @param {boolean} props.showRoute - Whether to draw route between cities
 * @param {Function} props.onCityClick - Called when pin is clicked
 */
export default function HeroMap({
  cities = [],
  showRoute = false,
  onCityClick,
}) {
  const [isLive, setIsLive] = useState(false);
  const [shouldLoadMapbox, setShouldLoadMapbox] = useState(false);
  const containerRef = useRef(null);

  // Determine if we should use live map (desktop only)
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    // Check if desktop and not reduced motion
    const mql = window.matchMedia("(min-width: 1024px)");
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    setIsDesktop(mql.matches && !prefersReducedMotion);

    const handler = (e) => setIsDesktop(e.matches && !prefersReducedMotion);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // Trigger Mapbox load on idle or pointer-enter
  useEffect(() => {
    if (!isDesktop || shouldLoadMapbox) return;

    let idleId = null;

    const loadMapbox = () => {
      setShouldLoadMapbox(true);
    };

    // Use requestIdleCallback if available
    if ("requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(loadMapbox, { timeout: 3000 });
    } else {
      // Fallback to setTimeout
      idleId = setTimeout(loadMapbox, 2000);
    }

    // Also load on pointer-enter
    const handlePointerEnter = () => {
      if ("cancelIdleCallback" in window && idleId) {
        window.cancelIdleCallback(idleId);
      } else if (idleId) {
        clearTimeout(idleId);
      }
      loadMapbox();
    };

    const container = containerRef.current;
    container?.addEventListener("pointerenter", handlePointerEnter, { once: true });

    return () => {
      if ("cancelIdleCallback" in window && idleId) {
        window.cancelIdleCallback(idleId);
      } else if (idleId) {
        clearTimeout(idleId);
      }
      container?.removeEventListener("pointerenter", handlePointerEnter);
    };
  }, [isDesktop, shouldLoadMapbox]);

  // Handle Mapbox ready
  const handleMapReady = useCallback(() => {
    setIsLive(true);
  }, []);

  // Display cities - use parsed cities or fall back to featured
  const displayCities = cities.length > 0 ? cities : FEATURED_CITIES;

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Static poster - always rendered for LCP */}
      <div
        className={`transition-opacity duration-500 ${isLive ? "opacity-0 pointer-events-none" : "opacity-100"}`}
      >
        <MapPoster
          cities={displayCities}
          showRoute={showRoute && cities.length > 1}
          onCityClick={onCityClick}
        />
      </div>

      {/* Live Mapbox - rendered on top, fades in when ready */}
      {shouldLoadMapbox && isDesktop && (
        <div
          className={`absolute inset-0 transition-opacity duration-500 ${isLive ? "opacity-100" : "opacity-0"}`}
        >
          <MapboxMap
            cities={displayCities}
            showRoute={showRoute && cities.length > 1}
            onCityClick={onCityClick}
            onReady={handleMapReady}
          />
        </div>
      )}
    </div>
  );
}
