'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import PlannerColumn from './PlannerColumn';
import PlannerMapWorkspace from './PlannerMapWorkspace';
import RouteGapAllocator from './RouteGapAllocator';
import MobileDrawer, { MobileMapButton } from '../conversation/MobileDrawer';
import { useTripPlannerAgent } from '@/hooks/useTripPlannerAgent';
import { derivePlannerInteraction } from '@/lib/conversation/plannerInteraction';
import { buildDayAssignments } from '@/lib/conversation/dayAssignments';
import { buildCityColors } from '@/lib/planning/cityColors';

/**
 * Agentic /plan layout: compact TripScheduleHeader + chat + map.
 */
const DEFAULT_CHAT_WIDTH = 60;
const ROUTE_CHAT_WIDTH = 42;
const MIN_CHAT_WIDTH = 34;
const MAX_CHAT_WIDTH = 76;

export default function ThreeColumnPlanner({
  initialUserMessage = null,
  initialTripId = null,
  initialLocalTripId = null,
  onPlannerStateChange = null,
  registerSetCityNights = null,
  registerSetTripDates = null,
}) {
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [chatWidthPct, setChatWidthPct] = useState(DEFAULT_CHAT_WIDTH);
  const seededRef = useRef(false);
  const splitPaneRef = useRef(null);
  const hasCustomChatWidthRef = useRef(false);

  const {
    messages,
    tripState,
    isStreaming,
    pendingInput,
    error,
    hasStarted,
    isFinalized,
    gaps,
    generationPhase,
    itinerary,
    generationError,
    savedTripId,
    localTripId,
    sendMessage,
    startConversation,
    handleOptionSelect,
    handleCitySelect,
    handleDateSelect,
    applyRoutePreset,
    dismissError,
    assignDaysToCity,
    unassignDays,
    setCityNights,
    addCity,
    acceptSuggestedAllocation,
    setTripDates,
    undoLastReflow,
    confirmGeneration,
    cancelFinalization,
    retryGeneration,
    resetGeneration,
    latestPlannerAction,
  } = useTripPlannerAgent({ initialTripId, initialLocalTripId });

  const tripHasCities = tripState.route.cities.length > 0;
  const interaction = useMemo(
    () => derivePlannerInteraction({
      tripState,
      gaps,
      pendingInput,
      messages,
      generationPhase,
      isStreaming,
      isFinalized,
    }),
    [gaps, generationPhase, isFinalized, isStreaming, messages, pendingInput, tripState]
  );

  const dayAssignments = useMemo(() => buildDayAssignments(tripState), [tripState]);
  const cityColors = useMemo(
    () => buildCityColors(tripState?.route?.cities || []),
    [tripState?.route?.cities]
  );

  // Emit a read-only snapshot of trip state to the parent so it can render
  // the top-bar Day Strip alongside the Describe / Step by step toggle.
  useEffect(() => {
    if (!onPlannerStateChange) return;
    onPlannerStateChange({
      tripState,
      days: dayAssignments,
      cities: tripState?.route?.cities || [],
      cityColors,
      hasCities: tripHasCities,
    });
  }, [onPlannerStateChange, tripState, dayAssignments, cityColors, tripHasCities]);

  // Expose setCityNights upward so the top-bar Day Strip popover can adjust
  // nights without lifting the entire planner state.
  useEffect(() => {
    if (!registerSetCityNights) return;
    registerSetCityNights(setCityNights);
    return () => registerSetCityNights(null);
  }, [registerSetCityNights, setCityNights]);

  useEffect(() => {
    if (!registerSetTripDates) return;
    registerSetTripDates(setTripDates);
    return () => registerSetTripDates(null);
  }, [registerSetTripDates, setTripDates]);

  useEffect(() => {
    if (!hasStarted) {
      startConversation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasStarted]);

  useEffect(() => {
    if (!savedTripId || initialTripId) return;
    const url = new URL(window.location.href);
    url.searchParams.set('tripId', savedTripId);
    window.history.replaceState({}, '', `${url.pathname}?${url.searchParams.toString()}`);
  }, [initialTripId, savedTripId]);

  useEffect(() => {
    if (!localTripId || savedTripId || initialTripId || initialLocalTripId) return;
    const url = new URL(window.location.href);
    url.searchParams.delete('tripId');
    url.searchParams.set('localTripId', localTripId);
    window.history.replaceState({}, '', `${url.pathname}?${url.searchParams.toString()}`);
  }, [initialLocalTripId, initialTripId, localTripId, savedTripId]);

  useEffect(() => {
    if (!initialUserMessage) return;
    if (seededRef.current) return;
    if (!hasStarted) return;
    if (isStreaming) return;
    if (messages.length === 0) return;
    seededRef.current = true;
    sendMessage(initialUserMessage);
  }, [initialUserMessage, hasStarted, isStreaming, messages.length, sendMessage]);

  const handleSendMessage = useCallback((text) => {
    sendMessage(text);
  }, [sendMessage]);

  const handleOption = useCallback((option) => {
    handleOptionSelect(option);
  }, [handleOptionSelect]);

  const handleCity = useCallback((city, purpose) => {
    handleCitySelect(city, purpose);
  }, [handleCitySelect]);

  const legacyTrip = {
    startCity: tripState.route.cities.find(c => c.role === 'start') || tripState.route.cities[0] || null,
    endCity: tripState.route.cities.find(c => c.role === 'end') || null,
    stops: tripState.route.cities.filter(c => c.role === 'stop'),
    daysPerCity: Object.fromEntries(
      tripState.route.cities.filter(c => c.nights).map(c => [c.id, c.nights])
    ),
    dates: tripState.dates,
    totalDays: tripState.dates.totalNights,
  };

  useEffect(() => {
    const stored = Number(window.localStorage.getItem('plannerChatWidthPct'));
    if (Number.isFinite(stored)) {
      hasCustomChatWidthRef.current = true;
      setChatWidthPct(Math.min(MAX_CHAT_WIDTH, Math.max(MIN_CHAT_WIDTH, stored)));
    }
  }, []);

  useEffect(() => {
    if (!tripHasCities || hasCustomChatWidthRef.current) return;
    setChatWidthPct(ROUTE_CHAT_WIDTH);
  }, [tripHasCities]);

  const commitChatWidth = useCallback((nextWidth) => {
    const bounded = Math.min(MAX_CHAT_WIDTH, Math.max(MIN_CHAT_WIDTH, nextWidth));
    hasCustomChatWidthRef.current = true;
    setChatWidthPct(bounded);
    window.localStorage.setItem('plannerChatWidthPct', String(Math.round(bounded)));
  }, []);

  const handleDividerPointerDown = useCallback((event) => {
    event.preventDefault();
    const container = splitPaneRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handlePointerMove = (moveEvent) => {
      const next = ((moveEvent.clientX - rect.left) / rect.width) * 100;
      commitChatWidth(next);
    };

    const handlePointerUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }, [commitChatWidth]);

  const handleDividerKeyDown = useCallback((event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      commitChatWidth(chatWidthPct - 5);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      commitChatWidth(chatWidthPct + 5);
    } else if (event.key === 'Home') {
      event.preventDefault();
      commitChatWidth(MIN_CHAT_WIDTH);
    } else if (event.key === 'End') {
      event.preventDefault();
      commitChatWidth(MAX_CHAT_WIDTH);
    }
  }, [chatWidthPct, commitChatWidth]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <RouteGapAllocator
        interaction={interaction}
        tripState={tripState}
        assignDaysToCity={assignDaysToCity}
        addCity={addCity}
      />

      <div ref={splitPaneRef} className="min-h-0 flex-1 flex overflow-hidden">
        <div
          className="min-w-0 min-h-0 flex-1 overflow-hidden lg:flex-none"
          style={{ flexBasis: `calc(${chatWidthPct}% - 5px)` }}
        >
          <PlannerColumn
            messages={messages}
            isStreaming={isStreaming}
            pendingInput={pendingInput}
            interaction={interaction}
            trip={legacyTrip}
            tripState={tripState}
            isFinalized={isFinalized}
            gaps={gaps}
            error={error}
            generationPhase={generationPhase}
            itinerary={itinerary}
            generationError={generationError}
            savedTripId={savedTripId}
            onSendMessage={handleSendMessage}
            onOptionSelect={handleOption}
            onCitySelect={handleCity}
            onRoutePresetSelect={applyRoutePreset}
            onDatesPick={handleDateSelect}
            onFlexibleMonth={handleDateSelect}
            onFlexible={() => handleDateSelect({})}
            onDismissError={dismissError}
            onRetry={() => sendMessage('Please continue.')}
            onParsedItineraryConfirm={() =>
              sendMessage('Yes, apply that itinerary.')
            }
            onParsedItineraryRefine={(summary) => sendMessage(summary)}
            confirmGeneration={confirmGeneration}
            cancelFinalization={cancelFinalization}
            retryGeneration={retryGeneration}
            resetGeneration={resetGeneration}
            latestPlannerAction={latestPlannerAction}
            acceptSuggestedAllocation={acceptSuggestedAllocation}
          />
        </div>

        <button
          type="button"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize chat and map panels"
          aria-valuemin={MIN_CHAT_WIDTH}
          aria-valuemax={MAX_CHAT_WIDTH}
          aria-valuenow={Math.round(chatWidthPct)}
          onPointerDown={handleDividerPointerDown}
          onKeyDown={handleDividerKeyDown}
          className="group hidden w-2 shrink-0 cursor-col-resize items-center justify-center bg-[#efe9de] outline-none transition-colors hover:bg-[#dfd3c0] focus-visible:bg-[#dfd3c0] lg:flex"
        >
          <span className="h-14 w-1 rounded-full bg-[#c8bba7] transition-colors group-hover:bg-[#8a765c] group-focus-visible:bg-[#8a765c]" />
        </button>

        <div
          className="hidden min-w-0 min-h-0 flex-col lg:flex"
          style={{ flexBasis: `calc(${100 - chatWidthPct}% - 5px)` }}
        >
          <PlannerMapWorkspace
            tripState={tripState}
            interaction={interaction}
            setCityNights={setCityNights}
            onSendMessage={handleSendMessage}
          />
        </div>
      </div>

      <div className="lg:hidden">
        <MobileMapButton
          onClick={() => setIsMobileDrawerOpen(true)}
          tripHasCities={tripHasCities}
        />
        <MobileDrawer
          isOpen={isMobileDrawerOpen}
          onClose={() => setIsMobileDrawerOpen(false)}
        >
          <PlannerMapWorkspace
            tripState={tripState}
            interaction={interaction}
            setCityNights={setCityNights}
            onSendMessage={handleSendMessage}
          />
        </MobileDrawer>
      </div>
    </div>
  );
}
