'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import PlannerColumn from './PlannerColumn';
import PlannerMapWorkspace from './PlannerMapWorkspace';
import RouteGapAllocator from './RouteGapAllocator';
import MobileDrawer, { MobileMapButton } from '../conversation/MobileDrawer';
import { useTripPlannerAgent } from '@/hooks/useTripPlannerAgent';
import { derivePlannerInteraction } from '@/lib/conversation/plannerInteraction';
import { buildDayAssignments } from '@/lib/conversation/dayAssignments';
import { buildCityColors } from '@/lib/planning/cityColors';

import { buildLegacyTrip } from './threeColumn/buildLegacyTrip';
import { useChatWidth } from './threeColumn/useChatWidth';
import { useRegisterPlannerHandles } from './threeColumn/useRegisterPlannerHandles';
import { useTripIdUrlSync } from './threeColumn/useTripIdUrlSync';
import { useInitialMessageSeed } from './threeColumn/useInitialMessageSeed';
import { usePlannerStateSnapshot } from './threeColumn/usePlannerStateSnapshot';
import ChatMapDivider from './threeColumn/ChatMapDivider';
import { useStartConversationOnce } from './threeColumn/useStartConversationOnce';

/**
 * Agentic /plan layout: compact TripScheduleHeader + chat + map.
 */
export default function ThreeColumnPlanner({
  initialUserMessage = null,
  initialTripId = null,
  initialLocalTripId = null,
  initialTripState = null,
  onPlannerStateChange = null,
  registerSetCityNights = null,
  registerSetCityAccommodation = null,
  registerSetTripDates = null,
  registerApplyTripState = null,
}) {
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
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
    itinerary,
    generationError,
    savedTripId,
    localTripId,
    saveStatus,
    saveError,
    user,
    isSupabaseConfigured,
    signInWithGoogle,
    saveNow,
    sendMessage,
    startConversation,
    handleOptionSelect,
    handleCitySelect,
    handleCitiesSelect,
    handleDateSelect,
    applyRoutePreset,
    dismissError,
    assignDaysToCity,
    setCityNights,
    setCityAccommodation,
    setTripState,
    addCity,
    acceptSuggestedAllocation,
    setTripDates,
    confirmGeneration,
    cancelFinalization,
    retryGeneration,
    resetGeneration,
    updateGeneratedActivity,
    latestPlannerAction,
  } = useTripPlannerAgent({ initialTripId, initialLocalTripId, initialTripState });

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

  const briefSignature = interaction?.briefCompleteness
    ? `${interaction.briefCompleteness.completionRatio}|${interaction.nextAction?.id || ''}|${interaction.nextAction?.label || ''}`
    : '';

  usePlannerStateSnapshot({
    onPlannerStateChange,
    tripState,
    dayAssignments,
    cityColors,
    tripHasCities,
    briefCompleteness: interaction?.briefCompleteness,
    nextAction: interaction?.nextAction,
    briefSignature,
    itinerary,
  });

  useRegisterPlannerHandles({
    registerSetCityNights,
    setCityNights,
    registerSetTripDates,
    setTripDates,
    registerSetCityAccommodation,
    setCityAccommodation,
    registerApplyTripState,
    setTripState,
  });

  useStartConversationOnce({ hasStarted, startConversation });
  useTripIdUrlSync({ savedTripId, localTripId, initialTripId, initialLocalTripId });
  useInitialMessageSeed({
    initialUserMessage,
    hasStarted,
    isStreaming,
    messagesLength: messages.length,
    sendMessage,
  });

  const handleSendMessage = useCallback((text) => {
    sendMessage(text);
  }, [sendMessage]);

  const handleOption = useCallback((option) => {
    handleOptionSelect(option);
  }, [handleOptionSelect]);

  const handleSignInToSync = useCallback(() => {
    signInWithGoogle({ next: `${window.location.pathname}${window.location.search}` });
  }, [signInWithGoogle]);

  const handleCity = useCallback((city, purpose) => {
    handleCitySelect(city, purpose);
  }, [handleCitySelect]);

  const handleCities = useCallback((cities) => {
    handleCitiesSelect(cities);
  }, [handleCitiesSelect]);

  const legacyTrip = useMemo(() => buildLegacyTrip(tripState), [tripState]);

  const { chatWidthPct, handleDividerPointerDown, handleDividerKeyDown } = useChatWidth({
    tripHasCities,
    splitPaneRef,
  });

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
            localTripId={localTripId}
            saveStatus={saveStatus}
            saveError={saveError}
            user={user}
            isSupabaseConfigured={isSupabaseConfigured}
            onSendMessage={handleSendMessage}
            onOptionSelect={handleOption}
            onCitySelect={handleCity}
            onCitiesSelect={handleCities}
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
            onUpdateActivity={updateGeneratedActivity}
            onSaveNow={saveNow}
            onSignIn={handleSignInToSync}
            latestPlannerAction={latestPlannerAction}
            acceptSuggestedAllocation={acceptSuggestedAllocation}
          />
        </div>

        <ChatMapDivider
          chatWidthPct={chatWidthPct}
          onPointerDown={handleDividerPointerDown}
          onKeyDown={handleDividerKeyDown}
        />

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
