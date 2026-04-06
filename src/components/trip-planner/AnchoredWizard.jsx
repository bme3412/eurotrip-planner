'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, FolderOpen, Trash2, X } from 'lucide-react';
import StepTripSetup from './StepTripSetup';
import StepGaps from './StepGaps';
import StepPreferences from './StepPreferences';
import StepReview from './StepReview';
import TripTimeline from './TripTimeline';
import TripMap from './TripMap';

const STEPS = [
  { id: 'setup', label: 'Your Trip', description: 'Where and when are you traveling?' },
  { id: 'stops', label: 'Add Stops', description: 'Discover cities along your route' },
  { id: 'preferences', label: 'Preferences', description: 'How do you like to travel?' },
  { id: 'review', label: 'Review', description: 'Finalize your trip' },
];

export default function AnchoredWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState(null);

  // Trip state - simplified model
  const [tripDates, setTripDates] = useState({ start: '', end: '' });
  const [startCity, setStartCity] = useState(null);
  const [endCity, setEndCity] = useState(null);
  const [startCityDays, setStartCityDays] = useState([]); // Array of date strings
  const [endCityDays, setEndCityDays] = useState([]); // Array of date strings
  const [intermediateStops, setIntermediateStops] = useState([]); // Planned stops from setup
  const [stopSelections, setStopSelections] = useState({}); // intermediate cities from discovery
  const [departureTransport, setDepartureTransport] = useState(null); // { type, date, time, details, confirmationCode }
  const [returnTransport, setReturnTransport] = useState(null);
  const [startCityArrivalTime, setStartCityArrivalTime] = useState(''); // Arrival time at start city
  const [endCityDepartureTime, setEndCityDepartureTime] = useState(''); // Departure time from end city
  const [preferences, setPreferences] = useState({
    pace: 50,
    paceId: 'balanced',
    interests: [],
    budget: 'moderate',
  });

  // Suggestions state for unified map
  const [currentSuggestions, setCurrentSuggestions] = useState([]);
  const [hoveredSuggestion, setHoveredSuggestion] = useState(null);

  // Save/Load state
  const [savedItineraries, setSavedItineraries] = useState([]);
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [itineraryName, setItineraryName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);

  // Load saved itineraries from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('eurotrip-saved-itineraries');
    if (saved) {
      try {
        setSavedItineraries(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load saved itineraries:', e);
      }
    }
  }, []);

  // Save itinerary to localStorage
  const handleSaveItinerary = useCallback(() => {
    const name = itineraryName.trim() || `Trip ${new Date().toLocaleDateString()}`;
    const itinerary = {
      id: Date.now().toString(),
      name,
      savedAt: new Date().toISOString(),
      data: {
        tripDates,
        startCity,
        endCity,
        startCityDays,
        endCityDays,
        intermediateStops,
        stopSelections,
        departureTransport,
        returnTransport,
        startCityArrivalTime,
        endCityDepartureTime,
        preferences,
        currentStep,
      },
    };

    const updated = [itinerary, ...savedItineraries.filter(s => s.id !== itinerary.id)];
    setSavedItineraries(updated);
    localStorage.setItem('eurotrip-saved-itineraries', JSON.stringify(updated));
    setShowSaveInput(false);
    setItineraryName('');
  }, [
    itineraryName, tripDates, startCity, endCity, startCityDays, endCityDays,
    intermediateStops, stopSelections, departureTransport, returnTransport,
    startCityArrivalTime, endCityDepartureTime, preferences, currentStep, savedItineraries
  ]);

  // Load itinerary from saved data
  const handleLoadItinerary = useCallback((saved) => {
    const { data } = saved;
    setTripDates(data.tripDates || { start: '', end: '' });
    setStartCity(data.startCity || null);
    setEndCity(data.endCity || null);
    setStartCityDays(data.startCityDays || []);
    setEndCityDays(data.endCityDays || []);
    setIntermediateStops(data.intermediateStops || []);
    setStopSelections(data.stopSelections || {});
    setDepartureTransport(data.departureTransport || null);
    setReturnTransport(data.returnTransport || null);
    setStartCityArrivalTime(data.startCityArrivalTime || '');
    setEndCityDepartureTime(data.endCityDepartureTime || '');
    setPreferences(data.preferences || { pace: 50, paceId: 'balanced', interests: [], budget: 'moderate' });
    setCurrentStep(data.currentStep || 0);
    setShowSavedModal(false);
  }, []);

  // Delete saved itinerary
  const handleDeleteItinerary = useCallback((id) => {
    const updated = savedItineraries.filter(s => s.id !== id);
    setSavedItineraries(updated);
    localStorage.setItem('eurotrip-saved-itineraries', JSON.stringify(updated));
  }, [savedItineraries]);

  // Auto-select first day for start city (start city always begins at index 0)
  useEffect(() => {
    if (startCity && tripDates?.start && startCityDays.length === 0) {
      setStartCityDays([tripDates.start]);
    }
  }, [startCity, tripDates?.start, startCityDays.length]);

  // Auto-select last day for end city (end city always ends at the last day)
  useEffect(() => {
    if (endCity && tripDates?.end && endCityDays.length === 0) {
      setEndCityDays([tripDates.end]);
    }
  }, [endCity, tripDates?.end, endCityDays.length]);

  // === CASCADING UPDATES: When Step 1 changes, update Step 2 data ===

  // Effect 1: Watch trip dates - filter intermediate stops to valid range
  useEffect(() => {
    if (!tripDates.start || !tripDates.end) return;

    const start = new Date(tripDates.start + 'T00:00:00');
    const end = new Date(tripDates.end + 'T23:59:59');

    setIntermediateStops(prev => {
      const filtered = prev.map(stop => ({
        ...stop,
        days: (stop.days || []).filter(d => {
          const date = new Date(d + 'T12:00:00');
          return date >= start && date <= end;
        })
      })).filter(stop => stop.days.length > 0);

      // Only update if something changed
      if (JSON.stringify(filtered) !== JSON.stringify(prev)) {
        return filtered;
      }
      return prev;
    });

    // Clear gap selections for regeneration
    setStopSelections({});
  }, [tripDates.start, tripDates.end]);

  // Effect 2: Watch anchor city changes - clear selections when route changes
  useEffect(() => {
    if (startCity?.id || endCity?.id) {
      setStopSelections({});
    }
  }, [startCity?.id, endCity?.id]);

  // Effect 3: Watch anchor day changes - remove overlapping intermediate days
  useEffect(() => {
    if (!startCityDays.length && !endCityDays.length) return;

    const anchorDays = new Set([...startCityDays, ...endCityDays]);

    setIntermediateStops(prev => {
      const filtered = prev.map(stop => ({
        ...stop,
        days: (stop.days || []).filter(d => !anchorDays.has(d))
      })).filter(stop => stop.days.length > 0);

      // Only update if something changed
      if (JSON.stringify(filtered) !== JSON.stringify(prev)) {
        return filtered;
      }
      return prev;
    });

    setStopSelections({});
  }, [startCityDays, endCityDays]);

  // Build anchors from start/end cities for compatibility with existing gap logic
  const anchors = useMemo(() => {
    const result = [];
    if (startCity && startCityDays.length > 0) {
      const sortedDays = [...startCityDays].sort();
      result.push({
        id: 'start',
        city: startCity.id,
        cityName: startCity.name,
        country: startCity.country,
        startDate: sortedDays[0],
        endDate: sortedDays[sortedDays.length - 1],
        days: startCityDays.length,
        isStart: true,
      });
    }
    if (endCity && endCityDays.length > 0) {
      const sortedDays = [...endCityDays].sort();
      result.push({
        id: 'end',
        city: endCity.id,
        cityName: endCity.name,
        country: endCity.country,
        startDate: sortedDays[0],
        endDate: sortedDays[sortedDays.length - 1],
        days: endCityDays.length,
        isEnd: true,
      });
    }
    return result;
  }, [startCity, endCity, startCityDays, endCityDays]);

  // Calculate the gap between start and end cities (accounting for intermediate stops)
  const gaps = useMemo(() => {
    if (!startCity || !endCity || startCityDays.length === 0 || endCityDays.length === 0) {
      return [];
    }

    const sortedStartDays = [...startCityDays].sort();
    const sortedEndDays = [...endCityDays].sort();

    // Gap starts after last day in start city
    const lastStartDay = new Date(sortedStartDays[sortedStartDays.length - 1] + 'T12:00:00');
    lastStartDay.setDate(lastStartDay.getDate() + 1);
    const gapStart = lastStartDay.toISOString().split('T')[0];

    // Gap ends before first day in end city
    const firstEndDay = new Date(sortedEndDays[0] + 'T12:00:00');
    firstEndDay.setDate(firstEndDay.getDate() - 1);
    const gapEnd = firstEndDay.toISOString().split('T')[0];

    const gapStartDate = new Date(gapStart + 'T12:00:00');
    const gapEndDate = new Date(gapEnd + 'T12:00:00');
    const totalGapDays = Math.round((gapEndDate - gapStartDate) / (1000 * 60 * 60 * 24)) + 1;

    if (totalGapDays <= 0) return [];

    // Subtract days already filled by intermediate stops
    const filledDays = new Set();
    intermediateStops.forEach(stop => {
      (stop.days || []).forEach(d => filledDays.add(d));
    });

    // Calculate remaining unfilled gap days
    const gapDays = totalGapDays - filledDays.size;

    if (gapDays <= 0) return [];

    return [{
      id: 'main-gap',
      startDate: gapStart,
      endDate: gapEnd,
      days: gapDays,
      totalDays: totalGapDays,
      filledDays: filledDays.size,
      previousCity: startCity.id,
      previousCityName: startCity.name,
      nextCity: endCity.id,
      nextCityName: endCity.name,
    }];
  }, [startCity, endCity, startCityDays, endCityDays, intermediateStops]);

  // Build the full itinerary for timeline/map display
  const itinerary = useMemo(() => {
    const items = [];

    if (anchors.length > 0) {
      // Add start city
      const start = anchors.find(a => a.isStart);
      if (start) {
        items.push({ type: 'anchor', ...start });
      }

      // Add intermediate stops from Step 1 (sorted by first day)
      const sortedIntermediateStops = [...intermediateStops].sort((a, b) => {
        const aDate = a.days?.[0] || '';
        const bDate = b.days?.[0] || '';
        return aDate.localeCompare(bDate);
      });

      sortedIntermediateStops.forEach(stop => {
        if (stop.city) {
          items.push({
            type: 'intermediate',
            id: stop.id,
            city: stop.city.id,
            cityName: stop.city.name,
            country: stop.city.country,
            days: stop.days?.length || 0,
            startDate: stop.days?.[0],
            endDate: stop.days?.[stop.days.length - 1],
            lat: stop.city.lat,
            lng: stop.city.lng,
          });
        }
      });

      // Add gap selections from Step 2
      if (Object.keys(stopSelections).length > 0) {
        Object.values(stopSelections).forEach(stop => {
          items.push({
            type: 'gap-filled',
            ...stop,
            gapId: 'main-gap',
          });
        });
      } else if (gaps.length > 0 && intermediateStops.length === 0) {
        // Show empty gap only if no intermediate stops
        const gap = gaps[0];
        items.push({ type: 'gap', ...gap });
      }

      // Add end city
      const end = anchors.find(a => a.isEnd);
      if (end) {
        items.push({ type: 'anchor', ...end });
      }
    }

    return items;
  }, [anchors, gaps, stopSelections, intermediateStops]);

  const validateStep = () => {
    setError(null);

    switch (STEPS[currentStep].id) {
      case 'setup':
        if (!tripDates.start || !tripDates.end) {
          setError('Please select your travel dates.');
          return false;
        }
        if (!startCity) {
          setError('Please select your start city.');
          return false;
        }
        if (startCityDays.length === 0) {
          setError('Please select which days you\'ll be in ' + startCity.name + '.');
          return false;
        }
        if (!endCity) {
          setError('Please select your end city.');
          return false;
        }
        if (endCityDays.length === 0) {
          setError('Please select which days you\'ll be in ' + endCity.name + '.');
          return false;
        }
        break;
      case 'stops':
        // Optional - user can skip
        break;
      case 'preferences':
        // Has defaults
        break;
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
    if (STEPS[currentStep].id === 'stops') {
      setCurrentSuggestions([]);
      setHoveredSuggestion(null);
    }
  };

  const handleBack = () => {
    setError(null);
    setCurrentStep(prev => Math.max(prev - 1, 0));
    if (STEPS[currentStep].id === 'stops') {
      setCurrentSuggestions([]);
      setHoveredSuggestion(null);
    }
  };

  const handleFillGap = (gapId, selection) => {
    setStopSelections(prev => ({
      ...prev,
      [selection.city]: selection,
    }));
  };

  const handleClearGap = (gapId) => {
    // Clear all stops for now (single gap model)
    setStopSelections({});
  };

  const handleClearStop = (cityId) => {
    setStopSelections(prev => {
      const next = { ...prev };
      delete next[cityId];
      return next;
    });
  };

  // Handlers for intermediate stops (from setup step)
  const handleAddIntermediateStop = (stop) => {
    setIntermediateStops(prev => [...prev, stop]);
  };

  const handleRemoveIntermediateStop = (stopId) => {
    setIntermediateStops(prev => prev.filter(s => s.id !== stopId));
  };

  const handleUpdateIntermediateStop = (stopId, updates) => {
    setIntermediateStops(prev => prev.map(s =>
      s.id === stopId ? { ...s, ...updates } : s
    ));
  };

  const handleUpdateSelection = (cityId, updates) => {
    setStopSelections(prev => ({
      ...prev,
      [cityId]: {
        ...prev[cityId],
        ...updates,
      },
    }));
  };

  const handleSelectSuggestion = (suggestion) => {
    handleFillGap('main-gap', {
      city: suggestion.id,
      cityName: suggestion.name,
      country: suggestion.country,
      days: suggestion.recommendedDays,
      transportTime: suggestion.transportTime,
      transportType: suggestion.transportType,
    });
  };

  const handleGenerate = async () => {
    console.log('Generating itinerary:', {
      tripDates,
      startCity,
      endCity,
      stopSelections,
      preferences,
      itinerary,
    });
  };

  const step = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;
  const showMap = currentStep >= 1 && startCity && endCity && startCityDays.length > 0 && endCityDays.length > 0;
  const isStopsStep = step.id === 'stops';

  return (
    <div className={`flex flex-col ${showMap ? 'lg:grid lg:grid-cols-[1fr_400px] lg:gap-6' : ''}`}>
      {/* Left: Map + Timeline (sticky on desktop) */}
      <AnimatePresence>
        {showMap && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:sticky lg:top-4 lg:self-start space-y-4 mb-6 lg:mb-0"
          >
            <TripMap
              itinerary={itinerary}
              suggestions={isStopsStep ? currentSuggestions : []}
              hoveredSuggestion={hoveredSuggestion}
              onSelectSuggestion={handleSelectSuggestion}
              onHoverSuggestion={setHoveredSuggestion}
              className="h-64 lg:h-[calc(100vh-180px)] lg:min-h-[500px]"
            />

            <TripTimeline
              tripDates={tripDates}
              items={itinerary}
              onClearGap={handleClearStop}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Right: Main content */}
      <div className={showMap ? '' : step.id === 'setup' ? 'w-full' : 'max-w-lg mx-auto w-full'}>
        {/* Progress bar + Save/Load buttons */}
        <div className="flex items-center gap-2 mb-4">
          {/* Step indicators (clickable) */}
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                // Allow going back to any completed step, or forward only if current validates
                if (i < currentStep) {
                  setCurrentStep(i);
                } else if (i === currentStep + 1 && validateStep()) {
                  setCurrentStep(i);
                }
              }}
              className="flex-1 group"
              title={s.label}
            >
              <div
                className={`h-1.5 rounded-full transition-all duration-500 ease-out ${
                  i <= currentStep ? 'bg-[#a08545]' : 'bg-[#e5e0d8] group-hover:bg-[#d5d0c8]'
                }`}
              />
            </button>
          ))}
          <span className="text-xs text-[#8a8578] tabular-nums ml-2">
            {currentStep + 1}/{STEPS.length}
          </span>

          {/* Save/Load buttons */}
          <div className="flex items-center gap-1 ml-2 border-l border-[#e5e0d8] pl-3">
            <button
              type="button"
              onClick={() => setShowSaveInput(true)}
              className="p-2 rounded-lg text-[#6a6459] hover:text-[#a08545] hover:bg-[#faf8f5] transition-colors"
              title="Save itinerary"
            >
              <Save className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowSavedModal(true)}
              className="p-2 rounded-lg text-[#6a6459] hover:text-[#a08545] hover:bg-[#faf8f5] transition-colors relative"
              title="Load saved itinerary"
            >
              <FolderOpen className="w-4 h-4" />
              {savedItineraries.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#a08545] text-white text-[9px] font-medium rounded-full flex items-center justify-center">
                  {savedItineraries.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Save input popup */}
        {showSaveInput && (
          <div className="mb-4 p-4 bg-white rounded-xl border border-[#e5e0d8] shadow-lg">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={itineraryName}
                onChange={(e) => setItineraryName(e.target.value)}
                placeholder="Name your trip (optional)"
                className="flex-1 px-3 py-2 bg-[#faf8f5] border border-[#e5e0d8] rounded-lg text-sm focus:outline-none focus:border-[#c9a227]"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleSaveItinerary()}
              />
              <button
                type="button"
                onClick={handleSaveItinerary}
                className="px-4 py-2 bg-[#a08545] hover:bg-[#8a7339] text-white text-sm font-medium rounded-lg transition-colors"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => { setShowSaveInput(false); setItineraryName(''); }}
                className="p-2 text-[#8a8578] hover:text-[#2a2520]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Saved itineraries modal */}
        {showSavedModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#e5e0d8] flex items-center justify-between">
                <h3 className="text-lg font-medium text-[#2a2520]">Saved Itineraries</h3>
                <button
                  type="button"
                  onClick={() => setShowSavedModal(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[#8a8578] hover:bg-[#faf8f5]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {savedItineraries.length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-[#8a8578]">
                    No saved itineraries yet
                  </div>
                ) : (
                  savedItineraries.map((saved) => (
                    <div
                      key={saved.id}
                      className="px-5 py-4 border-b border-[#e5e0d8] last:border-0 hover:bg-[#faf8f5] transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => handleLoadItinerary(saved)}
                          className="flex-1 text-left"
                        >
                          <div className="font-medium text-[#2a2520]">{saved.name}</div>
                          <div className="text-xs text-[#8a8578] mt-1">
                            {saved.data.startCity?.name && saved.data.endCity?.name ? (
                              <span>{saved.data.startCity.name} → {saved.data.endCity.name}</span>
                            ) : (
                              <span>Draft</span>
                            )}
                            {saved.data.tripDates?.start && (
                              <span className="ml-2">• {new Date(saved.data.tripDates.start).toLocaleDateString()}</span>
                            )}
                          </div>
                          <div className="text-[10px] text-[#a5a098] mt-1">
                            Saved {new Date(saved.savedAt).toLocaleDateString()}
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItinerary(saved.id)}
                          className="p-2 text-[#a5a098] hover:text-[#991b1b] hover:bg-[#fef2f2] rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="px-5 py-3 border-t border-[#e5e0d8] bg-[#faf8f5]">
                <button
                  type="button"
                  onClick={() => setShowSavedModal(false)}
                  className="w-full px-4 py-2 text-sm text-[#6a6459] hover:text-[#2a2520]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Setup step - 3 containers side by side, no wrapper */}
        {step.id === 'setup' && (
          <AnimatePresence mode="wait">
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              {error && (
                <div className="mb-4 rounded-lg border border-[#d4a5a5] bg-[#fef2f2] px-4 py-3 text-sm text-[#991b1b]">
                  {error}
                </div>
              )}
              <StepTripSetup
                tripDates={tripDates}
                onChangeDates={setTripDates}
                startCity={startCity}
                endCity={endCity}
                onChangeStartCity={setStartCity}
                onChangeEndCity={setEndCity}
                startCityDays={startCityDays}
                endCityDays={endCityDays}
                onChangeStartCityDays={setStartCityDays}
                onChangeEndCityDays={setEndCityDays}
                intermediateStops={intermediateStops}
                onAddStop={handleAddIntermediateStop}
                onRemoveStop={handleRemoveIntermediateStop}
                onUpdateStop={handleUpdateIntermediateStop}
                departureTransport={departureTransport}
                returnTransport={returnTransport}
                onChangeDepartureTransport={setDepartureTransport}
                onChangeReturnTransport={setReturnTransport}
                startCityArrivalTime={startCityArrivalTime}
                endCityDepartureTime={endCityDepartureTime}
                onChangeStartCityArrivalTime={setStartCityArrivalTime}
                onChangeEndCityDepartureTime={setEndCityDepartureTime}
              />
              {/* Footer for setup */}
              <div className="mt-5 flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleNext}
                  className="group px-6 py-2.5 bg-[#2a2520] hover:bg-[#3a3530] text-white text-sm font-medium rounded-lg transition-all"
                >
                  Continue
                  <span className="inline-block ml-2 transition-transform group-hover:translate-x-1">&rarr;</span>
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {/* Other steps - wrapped in card */}
        {step.id !== 'setup' && (
          <div className="rounded-2xl border border-[#e5e0d8] bg-white overflow-hidden shadow-xl shadow-[#2a2520]/5">
            {/* Step header (hidden for stops step) */}
            {step.id !== 'stops' && (
              <div className="px-5 py-4 border-b border-[#e5e0d8]">
                <h2
                  className="text-lg font-light text-[#2a2520] tracking-tight"
                  style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                >
                  {step.label}
                </h2>
                <p className="text-sm text-[#6a6459] mt-0.5 font-light">{step.description}</p>
              </div>
            )}

            {/* Step content */}
            <div className="p-5">
              {error && (
                <div className="mb-4 rounded-lg border border-[#d4a5a5] bg-[#fef2f2] px-4 py-3 text-sm text-[#991b1b]">
                  {error}
                </div>
              )}

              <AnimatePresence mode="wait">
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                >
                  {step.id === 'stops' && (
                    <StepGaps
                      gaps={gaps}
                      gapSelections={stopSelections}
                      anchors={anchors}
                      preferences={preferences}
                      startCity={startCity}
                      endCity={endCity}
                      intermediateStops={intermediateStops}
                      startCityDays={startCityDays}
                      endCityDays={endCityDays}
                      tripDates={tripDates}
                      onFillGap={handleFillGap}
                      onClearGap={handleClearGap}
                      onUpdateSelection={handleUpdateSelection}
                      onRemoveStop={handleRemoveIntermediateStop}
                      onSuggestionsLoaded={setCurrentSuggestions}
                      hoveredSuggestion={hoveredSuggestion}
                      onHoverSuggestion={setHoveredSuggestion}
                    />
                  )}
                  {step.id === 'preferences' && (
                    <StepPreferences
                      preferences={preferences}
                      onChangePreferences={setPreferences}
                    />
                  )}
                  {step.id === 'review' && (
                    <StepReview
                      tripDates={tripDates}
                      itinerary={itinerary}
                      preferences={preferences}
                      onGenerate={handleGenerate}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-[#e5e0d8] flex items-center justify-between bg-[#faf8f5]">
              <button
                type="button"
                onClick={handleBack}
                disabled={currentStep === 0}
                className="px-4 py-2 text-sm text-[#6a6459] hover:text-[#2a2520] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                &larr; Back
              </button>

              {isLastStep ? (
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="group px-6 py-2.5 bg-[#c9a227] hover:bg-[#d4af37] text-white text-sm font-medium rounded-lg transition-all shadow-lg shadow-[#c9a227]/20"
                >
                  Generate Itinerary
                  <span className="inline-block ml-2 transition-transform group-hover:translate-x-1">&rarr;</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNext}
                  className="group px-6 py-2.5 bg-[#2a2520] hover:bg-[#3a3530] text-white text-sm font-medium rounded-lg transition-all"
                >
                  Continue
                  <span className="inline-block ml-2 transition-transform group-hover:translate-x-1">&rarr;</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
