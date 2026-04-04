'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Map } from 'lucide-react';
import TripStyleFilters from './TripStyleFilters';
import StartingCitySelector from './StartingCitySelector';
import StopCard from './StopCard';
import TripSummaryModal from './TripSummaryModal';
import { getTransportDetails, COUNTRY_FLAGS } from '@/lib/planning/rankDestinations';
import dynamic from 'next/dynamic';

// Dynamically import RouteMap to avoid SSR issues
const RouteMap = dynamic(() => import('./RouteMap'), { ssr: false });

const MAX_STOPS = 8;

/**
 * CityChainBuilder - Incremental chain-building flow for route planning
 *
 * Replaces the slot machine spinner with a step-by-step destination selection UI.
 */
export default function CityChainBuilder({ onBuildTrip }) {
  // Core state
  const [tripStyle, setTripStyle] = useState('everyone');
  const [startingCity, setStartingCity] = useState(null);
  const [stops, setStops] = useState([]);
  const [editingStopIndex, setEditingStopIndex] = useState(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  // Get the last city in the chain (for candidate loading)
  const lastCity = useMemo(() => {
    if (stops.length === 0) return startingCity;
    return stops[stops.length - 1].city;
  }, [startingCity, stops]);

  // Get all excluded city IDs (starting city + all stops)
  const excludedIds = useMemo(() => {
    const ids = [];
    if (startingCity) ids.push(startingCity.id);
    stops.forEach(s => ids.push(s.city.id));
    return ids;
  }, [startingCity, stops]);

  // Compute state for each stop
  const stopStates = useMemo(() => {
    return stops.map((stop, index) => {
      if (editingStopIndex !== null) {
        if (index === editingStopIndex) return 'editing';
        if (index > editingStopIndex) return 'committed'; // downstream
        return 'committed';
      }
      return 'committed';
    });
  }, [stops, editingStopIndex]);

  // Check if we should show an active card for new stop
  const showActiveCard = useMemo(() => {
    // Show active card if we have a starting city, not editing, and under max stops
    return startingCity && editingStopIndex === null && stops.length < MAX_STOPS;
  }, [startingCity, editingStopIndex, stops.length]);

  // Check if we should show frontier (placeholder) card
  const showFrontierCard = useMemo(() => {
    // Show frontier if we have stops, not in active mode, not editing, and under max
    return startingCity && stops.length > 0 && editingStopIndex === null && stops.length < MAX_STOPS;
  }, [startingCity, stops.length, editingStopIndex]);

  // Handle starting city selection
  const handleSelectStartingCity = useCallback((city) => {
    setStartingCity({
      ...city,
      flag: city.flag || COUNTRY_FLAGS[city.country] || '🏳️',
    });
    // Clear any existing stops when starting city changes
    setStops([]);
    setEditingStopIndex(null);
  }, []);

  // Handle clearing starting city
  const handleClearStartingCity = useCallback(() => {
    setStartingCity(null);
    setStops([]);
    setEditingStopIndex(null);
  }, []);

  // Handle selecting a destination (adding new stop or updating edited stop)
  const handleSelectDestination = useCallback(async (candidate, isEditing = false, editIndex = null) => {
    // Get transport details
    const fromCity = isEditing && editIndex > 0
      ? stops[editIndex - 1].city
      : (isEditing && editIndex === 0)
        ? startingCity
        : lastCity;

    const transport = await getTransportDetails(fromCity.id, candidate.city.id);

    const newStop = {
      id: `stop-${Date.now()}`,
      city: candidate.city,
      transport: transport || {
        mode: candidate.transportMode,
        durationHours: candidate.fastestHours,
        durationFormatted: candidate.fastestFormatted,
        costEur: candidate.cheapestEur,
        frequency: candidate.frequency,
        icon: candidate.transportIcon,
        name: candidate.transportName,
      },
    };

    if (isEditing && editIndex !== null) {
      // Editing existing stop - replace it and clear downstream
      setStops(prev => [...prev.slice(0, editIndex), newStop]);
      setEditingStopIndex(null);
    } else {
      // Adding new stop
      setStops(prev => [...prev, newStop]);
    }
  }, [startingCity, stops, lastCity]);

  // Handle edit button click on committed stop
  const handleEditStop = useCallback((index) => {
    setEditingStopIndex(index);
  }, []);

  // Handle "Keep original" in editing mode
  const handleKeepOriginal = useCallback(() => {
    setEditingStopIndex(null);
  }, []);

  // Handle adding a new stop (from frontier card)
  const handleAddStop = useCallback(() => {
    // This just triggers showing the active card by doing nothing special
    // The active card appears automatically based on state
  }, []);

  // Handle trip style change
  const handleTripStyleChange = useCallback((style) => {
    setTripStyle(style);
  }, []);

  // Handle build trip click
  const handleBuildTripClick = useCallback(() => {
    setShowSummaryModal(true);
  }, []);

  // Handle continue to planner
  const handleContinueToPlanner = useCallback(() => {
    if (!startingCity) return;
    const cities = [startingCity.id, ...stops.map(s => s.city.id)];
    if (onBuildTrip) {
      onBuildTrip(cities);
    }
    setShowSummaryModal(false);
  }, [startingCity, stops, onBuildTrip]);

  // All cities for map
  const allCitiesForMap = useMemo(() => {
    if (!startingCity) return [];
    return [startingCity, ...stops.map(s => s.city)];
  }, [startingCity, stops]);

  // Check if we have a valid route to build
  const hasValidRoute = startingCity && stops.length > 0;

  return (
    <div className="w-full">
      {/* Two-column layout on desktop */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Panel - Chain Builder */}
        <div className="flex-1 lg:max-w-xl">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-5">
            {/* Trip Style Filters */}
            <div className="mb-5">
              <TripStyleFilters
                activeFilter={tripStyle}
                onFilterChange={handleTripStyleChange}
              />
            </div>

            {/* Starting City Selector */}
            <div className="mb-5">
              <StartingCitySelector
                selectedCity={startingCity}
                onSelectCity={handleSelectStartingCity}
                onClearCity={handleClearStartingCity}
              />
            </div>

            {/* Divider */}
            {startingCity && (
              <hr className="border-slate-100 my-5" />
            )}

            {/* Stop Cards */}
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {/* Committed and editing stops */}
                {stops.map((stop, index) => {
                  const state = stopStates[index];
                  const isDownstream = editingStopIndex !== null && index > editingStopIndex;
                  const fromCity = index === 0 ? startingCity : stops[index - 1].city;

                  // Get exclude IDs for this stop (exclude cities before it)
                  const stopExcludeIds = [
                    startingCity?.id,
                    ...stops.slice(0, index).map(s => s.city.id),
                  ].filter(Boolean);

                  return (
                    <StopCard
                      key={stop.id}
                      stop={stop}
                      index={index}
                      state={state}
                      fromCity={fromCity}
                      tripStyle={tripStyle}
                      excludeIds={stopExcludeIds}
                      onSelect={(candidate) => handleSelectDestination(candidate, state === 'editing', index)}
                      onEdit={() => handleEditStop(index)}
                      onKeepOriginal={handleKeepOriginal}
                      isDownstream={isDownstream}
                      maxStops={MAX_STOPS}
                      currentStopCount={stops.length}
                    />
                  );
                })}

                {/* Active card for adding new stop */}
                {showActiveCard && editingStopIndex === null && (
                  <StopCard
                    key="active-new"
                    stop={null}
                    index={stops.length}
                    state="active"
                    fromCity={lastCity}
                    tripStyle={tripStyle}
                    excludeIds={excludedIds}
                    onSelect={(candidate) => handleSelectDestination(candidate, false, null)}
                    maxStops={MAX_STOPS}
                    currentStopCount={stops.length}
                  />
                )}

                {/* Frontier card (only shown after first stop, when not showing active) */}
                {stops.length > 0 && !showActiveCard && editingStopIndex === null && stops.length < MAX_STOPS && (
                  <StopCard
                    key="frontier"
                    state="frontier"
                    index={stops.length}
                    onAddStop={handleAddStop}
                    maxStops={MAX_STOPS}
                    currentStopCount={stops.length}
                  />
                )}
              </AnimatePresence>
            </div>

            {/* Build Trip Button */}
            <AnimatePresence>
              {hasValidRoute && editingStopIndex === null && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="mt-5"
                >
                  <button
                    onClick={handleBuildTripClick}
                    className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-[15px] rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                  >
                    Build This Trip
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Panel - Map */}
        <div className="flex-1 lg:sticky lg:top-4 lg:self-start">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 overflow-hidden">
            {/* Map Header */}
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
              <Map className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-600">Your Route</span>
              {allCitiesForMap.length > 1 && (
                <span className="ml-auto text-xs text-slate-400">
                  {allCitiesForMap.length} cities
                </span>
              )}
            </div>

            {/* Map Container */}
            <div className="h-[300px] lg:h-[450px]">
              {allCitiesForMap.length > 0 ? (
                <RouteMap
                  cities={allCitiesForMap}
                  stops={stops}
                  editingStopIndex={editingStopIndex}
                />
              ) : (
                <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                  <div className="text-center text-slate-400">
                    <Map className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Select a starting city to see the map</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Trip Summary Modal */}
      <TripSummaryModal
        isOpen={showSummaryModal}
        onClose={() => setShowSummaryModal(false)}
        onContinue={handleContinueToPlanner}
        startingCity={startingCity}
        stops={stops}
      />
    </div>
  );
}
