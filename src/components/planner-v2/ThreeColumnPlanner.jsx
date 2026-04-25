'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import PlannerColumn from './PlannerColumn';
import RouteMapColumn from './RouteMapColumn';
import TripScheduleHeader from './schedule-header/TripScheduleHeader';
import MobileDrawer, { MobileMapButton } from '../conversation/MobileDrawer';
import { useTripPlannerAgent } from '@/hooks/useTripPlannerAgent';
import { derivePlannerInteraction } from '@/lib/conversation/plannerInteraction';

/**
 * Agentic /plan layout: compact TripScheduleHeader + chat + map.
 */
const SAVE_STATUS_LABELS = {
  local: 'Define your trip',
  loading: 'Loading trip',
  saving: 'Saving draft',
  saved: 'Saved draft',
  saved_local: 'Saved on this device',
  error: 'Save issue',
};

const DEFAULT_CHAT_WIDTH = 60;
const MIN_CHAT_WIDTH = 34;
const MAX_CHAT_WIDTH = 76;

export default function ThreeColumnPlanner({
  initialUserMessage = null,
  initialTripId = null,
  initialLocalTripId = null,
}) {
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [chatWidthPct, setChatWidthPct] = useState(DEFAULT_CHAT_WIDTH);
  const seededRef = useRef(false);
  const splitPaneRef = useRef(null);

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
    savedTripId,
    localTripId,
    saveStatus,
    saveError,
    sendMessage,
    startConversation,
    handleOptionSelect,
    handleCitySelect,
    applyRoutePreset,
    dismissError,
    assignDaysToCity,
    unassignDays,
    setCityNights,
    addCity,
    setTripDates,
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
      setChatWidthPct(Math.min(MAX_CHAT_WIDTH, Math.max(MIN_CHAT_WIDTH, stored)));
    }
  }, []);

  const commitChatWidth = useCallback((nextWidth) => {
    const bounded = Math.min(MAX_CHAT_WIDTH, Math.max(MIN_CHAT_WIDTH, nextWidth));
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
      {/* Only show schedule header once cities are added */}
      {tripHasCities && (
        <TripScheduleHeader
          tripState={tripState}
          setTripDates={setTripDates}
          assignDaysToCity={assignDaysToCity}
          unassignDays={unassignDays}
          setCityNights={setCityNights}
          addCity={addCity}
        />
      )}

      {(savedTripId || localTripId || saveStatus !== 'local') && (
        <div className="flex shrink-0 items-center justify-between border-b border-[#e5e0d8] bg-white/85 px-4 py-1.5 text-[11px] text-[#6a6459]">
          <span>
            {SAVE_STATUS_LABELS[saveStatus] || 'Trip draft'}
            {saveError ? ` · ${saveError}` : ''}
          </span>
          {savedTripId && (
            <div className="flex items-center gap-3">
              <a href={`/plan?tripId=${savedTripId}`} className="font-semibold text-[#2a2520] hover:underline">
                Edit
              </a>
              <a href={`/trips/${savedTripId}`} className="font-semibold text-[#2a2520] hover:underline">
                View
              </a>
            </div>
          )}
          {!savedTripId && localTripId && (
            <div className="flex items-center gap-3">
              <a href={`/plan?localTripId=${localTripId}`} className="font-semibold text-[#2a2520] hover:underline">
                Edit
              </a>
              <a href="/saved-trips" className="font-semibold text-[#2a2520] hover:underline">
                My Trips
              </a>
            </div>
          )}
        </div>
      )}

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
            onSendMessage={handleSendMessage}
            onOptionSelect={handleOption}
            onCitySelect={handleCity}
            onRoutePresetSelect={applyRoutePreset}
            onDismissError={dismissError}
            onRetry={() => sendMessage('Please continue.')}
            onParsedItineraryConfirm={() =>
              sendMessage('Yes, apply that itinerary.')
            }
            onParsedItineraryRefine={(summary) => sendMessage(summary)}
            assignDaysToCity={assignDaysToCity}
            addCity={addCity}
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
          <RouteMapColumn tripState={tripState} interaction={interaction} />
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
          <RouteMapColumn tripState={tripState} interaction={interaction} />
        </MobileDrawer>
      </div>
    </div>
  );
}
