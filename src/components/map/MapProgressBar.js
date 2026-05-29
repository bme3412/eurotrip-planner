"use client";

import React from "react";

/**
 * MapProgressBar
 *
 * Phase 6 (lovely-baking-piglet.md): replaces the full-screen
 * LoadingOverlay during rating fetches. A thin indeterminate progress
 * bar pinned to the top of the map is non-blocking — the user can keep
 * panning/zooming/filtering while ratings stream in via the Phase 2
 * batched fetch pipeline.
 *
 * We don't have a true percentage (the fetch streams batches), so this
 * is a CSS-only indeterminate slider.
 */
function MapProgressBar({ visible, label = "Loading…" }) {
  return (
    <div
      aria-hidden={!visible}
      aria-live="polite"
      className={`pointer-events-none absolute inset-x-0 top-0 z-30 transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="relative h-1 w-full overflow-hidden bg-blue-100/60">
        <div className="map-progress-bar-indicator absolute inset-y-0 w-1/3 rounded-r-full bg-blue-600" />
      </div>
      {visible && (
        <p className="mt-1 text-center text-[11px] font-medium tracking-wide text-blue-700/80">
          {label}
        </p>
      )}
    </div>
  );
}

export default MapProgressBar;
