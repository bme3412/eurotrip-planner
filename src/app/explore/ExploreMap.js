"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

const LazyMapComponentWrapper = dynamic(
  () => import("@/components/map/LazyMapComponent"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Interactive Map...</p>
        </div>
      </div>
    ),
  }
);

export default function ExploreMap({ destinations }) {
  const [selectedCity, setSelectedCity] = useState(null);
  const [viewState, setViewState] = useState({
    longitude: 10,
    latitude: 50,
    zoom: 3.5,
    pitch: 0,
    bearing: 0,
  });

  const handleMarkerClick = (city) => {
    setSelectedCity(city);
  };

  return (
    <div className="relative h-full w-full">
      <LazyMapComponentWrapper
        viewState={viewState}
        onViewStateChange={setViewState}
        destinations={destinations}
        onMarkerClick={handleMarkerClick}
      />

      {selectedCity && (
        <div className="absolute bottom-4 left-4 z-20 w-[min(360px,calc(100%-2rem))] rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-xl backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Selected city
          </p>
          <h2 className="mt-1 text-2xl font-bold text-slate-950">{selectedCity.title}</h2>
          {selectedCity.country && (
            <p className="mt-1 text-sm text-slate-500">{selectedCity.country}</p>
          )}
          {selectedCity.description && (
            <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-600">
              {selectedCity.description}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`/city-guides/${selectedCity.id || selectedCity.title?.toLowerCase().replace(/\s+/g, '-')}`}
              className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              View guide
            </Link>
            <Link
              href={`/plan?city=${selectedCity.id || ''}&cityName=${encodeURIComponent(selectedCity.title || '')}`}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300"
            >
              Start plan
            </Link>
            <button
              type="button"
              onClick={() => setSelectedCity(null)}
              className="rounded-full px-3 py-2 text-sm font-semibold text-slate-400 hover:text-slate-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
