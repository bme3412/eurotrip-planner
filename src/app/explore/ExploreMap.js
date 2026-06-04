"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import SelectedCityCard from "@/components/map/SelectedCityCard";
import ShortlistTray from "@/components/map/ShortlistTray";
import ResultsGrid from "@/components/ResultsGrid";
import useShortlist from "@/hooks/useShortlist";
import { useCityRankings, useCurrentFilters, useRankedItems } from "@/contexts/MapDataContext";

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

export default function ExploreMap({ destinations, initialStart = null, initialEnd = null, initialView = "map" }) {
  const [selectedCity, setSelectedCity] = useState(null);
  // Discover surface view: the map and the ranked list are two presentations of
  // the same V4 ranking. (Replaces the separate /results scoreboard page.)
  const [view, setView] = useState(initialView === "list" ? "list" : "map");
  // Rich V4 ranking per city for the active dates — used to show "why" on the
  // selected-city card. Keyed by city id.
  const cityRankings = useCityRankings();
  // Raw flat ranked items for the List view (same data driving the map).
  const rankedItems = useRankedItems();
  // Active trip dates (user-changed filters win over the URL hand-off) so every
  // hand-off to /plan carries the dates — the date-ranked intent shouldn't die
  // when the user moves from discovery to planning.
  const [currentFilters] = useCurrentFilters();
  const tripStart = currentFilters?.startDate || initialStart || null;
  const tripEnd = currentFilters?.endDate || initialEnd || null;
  const [viewState, setViewState] = useState({
    longitude: 10,
    latitude: 50,
    zoom: 3.5,
    pitch: 0,
    bearing: 0,
  });

  // Phase 5: shortlist is the bridge from Explore → /plan. The hook is
  // localStorage-only (no auth coupling) per the plan decision.
  const shortlist = useShortlist();

  const handleMarkerClick = (city) => {
    setSelectedCity(city);
  };

  const handleAddToShortlist = (city) => {
    if (!city) return;
    shortlist.add({
      id: city.id,
      title: city.title,
      country: city.country,
    });
  };

  // Disable the add affordance once the city is already in the tray so
  // SelectedCityCard can render the button as a satisfied "added" state.
  const addHandlerForCard =
    selectedCity && shortlist.has(selectedCity) ? null : handleAddToShortlist;

  return (
    <div className="relative h-full w-full">
      {/*
        Phase 4: the React SelectedCityCard is now the source of truth
        for the selected-city UI. Tell MapComponent to skip the Mapbox
        HTML popup so we never render both at once. The popup code in
        mapPopup.js stays in place as a fallback / future reuse path.
      */}
      <LazyMapComponentWrapper
        viewState={viewState}
        onViewStateChange={setViewState}
        destinations={destinations}
        onMarkerClick={handleMarkerClick}
        initialStart={initialStart}
        initialEnd={initialEnd}
        suppressHtmlPopup
      />

      {/* Map ↔ List toggle — both views render the same V4 ranking. */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40">
        <div className="inline-flex rounded-full bg-white/95 p-1 shadow-md ring-1 ring-slate-200">
          {["map", "list"].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={`rounded-full px-5 py-1.5 text-sm font-semibold capitalize transition-colors ${
                view === v ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Map-only chrome: the selected-city card + shortlist tray. */}
      {view === "map" && selectedCity && (
        <SelectedCityCard
          city={selectedCity}
          ranking={cityRankings?.[selectedCity.id] || null}
          startDate={tripStart}
          endDate={tripEnd}
          onClose={() => setSelectedCity(null)}
          onAddToShortlist={
            addHandlerForCard ? () => addHandlerForCard(selectedCity) : null
          }
          alreadyShortlisted={shortlist.has(selectedCity)}
        />
      )}

      {view === "map" && (
        <ShortlistTray
          items={shortlist.items}
          onRemove={shortlist.remove}
          onClear={shortlist.clear}
          startDate={tripStart}
          endDate={tripEnd}
          liftAboveCard={Boolean(selectedCity)}
        />
      )}

      {/* List view — the ranked scoreboard (ResultsGrid), overlaid on the still-
          mounted map (which keeps fetching/painting underneath). */}
      {view === "list" && (
        <div className="absolute inset-0 z-30 overflow-y-auto bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50">
          <div className="mx-auto w-full max-w-5xl px-4 md:px-6 pt-20 pb-12">
            {rankedItems.length > 0 ? (
              <ResultsGrid
                results={rankedItems}
                dates={tripStart && tripEnd ? { start: tripStart, end: tripEnd } : null}
                onChangeDates={() => setView("map")}
              />
            ) : (
              <div className="py-24 text-center text-slate-500">
                <p className="text-lg font-medium">Pick your travel dates to rank cities.</p>
                <button
                  type="button"
                  onClick={() => setView("map")}
                  className="mt-4 rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Back to the map
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
