"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import SelectedCityCard from "@/components/map/SelectedCityCard";
import ShortlistTray from "@/components/map/ShortlistTray";
import useShortlist from "@/hooks/useShortlist";
import { useCityRankings } from "@/contexts/MapDataContext";

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

export default function ExploreMap({ destinations, initialStart = null, initialEnd = null }) {
  const [selectedCity, setSelectedCity] = useState(null);
  // Rich V4 ranking per city for the active dates — used to show "why" on the
  // selected-city card. Keyed by city id.
  const cityRankings = useCityRankings();
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

      {selectedCity && (
        <SelectedCityCard
          city={selectedCity}
          ranking={cityRankings?.[selectedCity.id] || null}
          onClose={() => setSelectedCity(null)}
          onAddToShortlist={
            addHandlerForCard ? () => addHandlerForCard(selectedCity) : null
          }
          alreadyShortlisted={shortlist.has(selectedCity)}
        />
      )}

      {/* Phase 6: on mobile the tray needs to lift above the
          SelectedCityCard (which docks to bottom: 0). On desktop the
          card is a corner card and the tray uses its default bottom-4. */}
      <ShortlistTray
        items={shortlist.items}
        onRemove={shortlist.remove}
        onClear={shortlist.clear}
        liftAboveCard={Boolean(selectedCity)}
      />
    </div>
  );
}
