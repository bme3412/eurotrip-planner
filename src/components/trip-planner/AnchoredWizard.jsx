'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StepTripSetup from './StepTripSetup';
import StepGaps from './StepGaps';
import StepPreferences from './StepPreferences';
import StepReview from './StepReview';
import TripTimeline from './TripTimeline';
import TripMap from './TripMap';

const STEPS = [
  { id: 'setup', label: 'Your Trip', description: 'Where and when are you traveling?' },
  { id: 'preferences', label: 'Preferences', description: 'How do you like to travel?' },
  { id: 'stops', label: 'Add Stops', description: 'Discover cities along your route' },
  { id: 'review', label: 'Review', description: 'Finalize your trip' },
];

export default function AnchoredWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState(null);

  // Trip state - simplified model
  const [tripDates, setTripDates] = useState({ start: '', end: '' });
  const [startCity, setStartCity] = useState(null);
  const [endCity, setEndCity] = useState(null);
  const [stopSelections, setStopSelections] = useState({}); // intermediate cities
  const [preferences, setPreferences] = useState({
    pace: 50,
    paceId: 'balanced',
    interests: [],
    budget: 'moderate',
  });

  // Suggestions state for unified map
  const [currentSuggestions, setCurrentSuggestions] = useState([]);
  const [hoveredSuggestion, setHoveredSuggestion] = useState(null);

  // Build anchors from start/end cities for compatibility with existing gap logic
  const anchors = useMemo(() => {
    const result = [];
    if (startCity && tripDates.start) {
      // Start city: first 2-3 days
      const startEnd = new Date(tripDates.start + 'T12:00:00');
      startEnd.setDate(startEnd.getDate() + 2);
      result.push({
        id: 'start',
        city: startCity.id,
        cityName: startCity.name,
        country: startCity.country,
        startDate: tripDates.start,
        endDate: startEnd.toISOString().split('T')[0],
        isStart: true,
      });
    }
    if (endCity && tripDates.end) {
      // End city: last 2 days
      const endStart = new Date(tripDates.end + 'T12:00:00');
      endStart.setDate(endStart.getDate() - 2);
      result.push({
        id: 'end',
        city: endCity.id,
        cityName: endCity.name,
        country: endCity.country,
        startDate: endStart.toISOString().split('T')[0],
        endDate: tripDates.end,
        isEnd: true,
      });
    }
    return result;
  }, [startCity, endCity, tripDates]);

  // Calculate the gap between start and end cities
  const gaps = useMemo(() => {
    if (!startCity || !endCity || !tripDates.start || !tripDates.end) {
      return [];
    }

    const startEnd = new Date(tripDates.start + 'T12:00:00');
    startEnd.setDate(startEnd.getDate() + 2);

    const endStart = new Date(tripDates.end + 'T12:00:00');
    endStart.setDate(endStart.getDate() - 2);

    const gapStart = startEnd.toISOString().split('T')[0];
    const gapEnd = endStart.toISOString().split('T')[0];

    const gapDays = Math.round((endStart - startEnd) / (1000 * 60 * 60 * 24));

    if (gapDays <= 0) return [];

    return [{
      id: 'main-gap',
      startDate: gapStart,
      endDate: gapEnd,
      days: gapDays,
      previousCity: startCity.id,
      previousCityName: startCity.name,
      nextCity: endCity.id,
      nextCityName: endCity.name,
    }];
  }, [startCity, endCity, tripDates]);

  // Build the full itinerary for timeline/map display
  const itinerary = useMemo(() => {
    const items = [];

    if (anchors.length > 0) {
      // Add start city
      const start = anchors.find(a => a.isStart);
      if (start) {
        items.push({ type: 'anchor', ...start });
      }

      // Add gap or filled stops
      if (gaps.length > 0) {
        const gap = gaps[0];
        if (Object.keys(stopSelections).length > 0) {
          // Add filled stops
          Object.values(stopSelections).forEach(stop => {
            items.push({
              type: 'gap-filled',
              ...stop,
              gapId: 'main-gap',
            });
          });
        } else {
          // Show empty gap
          items.push({ type: 'gap', ...gap });
        }
      }

      // Add end city
      const end = anchors.find(a => a.isEnd);
      if (end) {
        items.push({ type: 'anchor', ...end });
      }
    }

    return items;
  }, [anchors, gaps, stopSelections]);

  const validateStep = () => {
    setError(null);

    switch (STEPS[currentStep].id) {
      case 'setup':
        if (!tripDates.start || !tripDates.end) {
          setError('Please select your travel dates.');
          return false;
        }
        if (!startCity) {
          setError('Please select where you\'re flying into.');
          return false;
        }
        if (!endCity) {
          setError('Please select where you\'re flying out of.');
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
  const showMap = currentStep >= 1 && startCity && endCity;
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
      <div className={showMap ? '' : 'max-w-lg mx-auto w-full'}>
        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-4">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex-1">
              <div
                className={`h-1 rounded-full transition-all duration-500 ease-out ${
                  i <= currentStep ? 'bg-[#a08545]' : 'bg-[#e5e0d8]'
                }`}
              />
            </div>
          ))}
          <span className="text-xs text-[#8a8578] tabular-nums ml-2">
            {currentStep + 1}/{STEPS.length}
          </span>
        </div>

        {/* Main card */}
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
                {step.id === 'setup' && (
                  <StepTripSetup
                    tripDates={tripDates}
                    onChangeDates={setTripDates}
                    startCity={startCity}
                    endCity={endCity}
                    onChangeStartCity={setStartCity}
                    onChangeEndCity={setEndCity}
                  />
                )}
                {step.id === 'stops' && (
                  <StepGaps
                    gaps={gaps}
                    gapSelections={stopSelections}
                    anchors={anchors}
                    preferences={preferences}
                    onFillGap={handleFillGap}
                    onClearGap={handleClearGap}
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
      </div>
    </div>
  );
}
