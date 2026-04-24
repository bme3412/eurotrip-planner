'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import PlannerColumn from './PlannerColumn';
import RouteMapColumn from './RouteMapColumn';
import TripScheduleHeader from './schedule-header/TripScheduleHeader';
import MobileDrawer, { MobileMapButton } from '../conversation/MobileDrawer';
import { useTripPlannerAgent } from '@/hooks/useTripPlannerAgent';

/**
 * Agentic /plan layout: compact TripScheduleHeader + chat + map.
 */
export default function ThreeColumnPlanner({ initialUserMessage = null }) {
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const seededRef = useRef(false);

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
    sendMessage,
    startConversation,
    handleOptionSelect,
    handleCitySelect,
    handleDaysChange,
    handleDateSelect,
    dismissError,
    assignDaysToCity,
    unassignDays,
    setCityNights,
    addCity,
    setTripDates,
  } = useTripPlannerAgent();

  const tripHasCities = tripState.route.cities.length > 0;

  useEffect(() => {
    if (!hasStarted) {
      startConversation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasStarted]);

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

      <div className="min-h-0 flex-1 flex overflow-hidden">
        <div className="flex-[3] min-w-0 min-h-0 overflow-hidden">
          <PlannerColumn
            messages={messages}
            isStreaming={isStreaming}
            pendingInput={pendingInput}
            trip={legacyTrip}
            tripState={tripState}
            isFinalized={isFinalized}
            gaps={gaps}
            error={error}
            generationPhase={generationPhase}
            onSendMessage={handleSendMessage}
            onOptionSelect={handleOption}
            onCitySelect={handleCity}
            onDaysChange={handleDaysChange}
            onDateSelect={handleDateSelect}
            onDismissError={dismissError}
            onRetry={() => sendMessage('Please continue.')}
            onParsedItineraryConfirm={() => {}}
            onParsedItineraryRefine={(summary) => sendMessage(summary)}
          />
        </div>

        <div className="hidden flex-[2] min-w-0 min-h-0 flex-col lg:flex">
          <RouteMapColumn trip={legacyTrip} />
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
          <RouteMapColumn trip={legacyTrip} />
        </MobileDrawer>
      </div>
    </div>
  );
}
