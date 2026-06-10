'use client';

import { Suspense, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import TripDayStrip from '@/components/planner-v2/TripDayStrip';
import citiesData from '@/generated/citiesLite.json';

const cityNameById = new Map(citiesData.map((c) => [c.id, c.name]));

const ThreeColumnPlanner = dynamic(
  () => import('@/components/planner-v2/ThreeColumnPlanner'),
  {
    ssr: false,
    loading: () => <PlannerLoading label="Loading planner..." />,
  }
);

function PlannerLoading({ label = 'Loading...' }) {
  return (
    <div className="h-[80vh] flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[#c9a227] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[#8a8578] text-sm">{label}</p>
      </div>
    </div>
  );
}

function buildInitialPlannerMessage(searchParams) {
  const q = searchParams.get('q')?.trim();
  if (q) return q;

  const city = searchParams.get('cityName') || searchParams.get('city');
  const cities = searchParams.get('cities')?.split(',').filter(Boolean) || [];
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const rank = searchParams.get('rank');
  const reason = searchParams.get('reason');
  const datesSuffix = startDate && endDate ? ` from ${startDate} to ${endDate}` : '';

  if (cities.length > 1) {
    return `Build a Europe route using these ranked city picks: ${cities.join(', ')}${datesSuffix}. Compare the tradeoffs and create a sensible itinerary route.`;
  }

  // Honor TripSearchBar's start/end city anchors (roundtrip + openjaw flows).
  const startId = searchParams.get('start');
  const endId = searchParams.get('end');
  const startName = startId ? cityNameById.get(startId) : null;
  const endName = endId ? cityNameById.get(endId) : null;
  if (startName && endName) {
    if (startId === endId) {
      return `Plan a round-trip from ${startName}${datesSuffix}.`;
    }
    return `Plan a trip from ${startName} to ${endName}${datesSuffix}.`;
  }
  if (startName) {
    return `Plan a trip starting from ${startName}${datesSuffix}.`;
  }

  if (!city) return null;

  const parts = [`Plan a trip to ${city}`];
  if (startDate && endDate) parts.push(`from ${startDate} to ${endDate}`);
  const context = [];
  if (rank) context.push(`ranked #${rank}`);
  if (reason) context.push(reason);
  if (context.length > 0) parts.push(`It was ${context.join('; ')}.`);
  return parts.join(' ');
}

function PlanContent() {
  const searchParams = useSearchParams();

  const q = buildInitialPlannerMessage(searchParams);
  const tripId = searchParams.get('tripId') || null;
  const localTripId = searchParams.get('localTripId') || null;

  const [plannerSnapshot, setPlannerSnapshot] = useState(null);
  const [sharedTripState, setSharedTripState] = useState(null);
  const setCityNightsRef = useRef(null);
  const setCityAccommodationRef = useRef(null);
  const setTripDatesRef = useRef(null);
  const applyConversationTripStateRef = useRef(null);

  const handlePlannerStateChange = useCallback((snapshot) => {
    setPlannerSnapshot(snapshot);
    if (snapshot?.tripState) {
      setSharedTripState(snapshot.tripState);
    }
  }, []);

  const registerSetCityNights = useCallback((fn) => {
    setCityNightsRef.current = fn;
  }, []);

  const registerSetCityAccommodation = useCallback((fn) => {
    setCityAccommodationRef.current = fn;
  }, []);

  const registerSetTripDates = useCallback((fn) => {
    setTripDatesRef.current = fn;
  }, []);

  const registerApplyTripState = useCallback((fn) => {
    applyConversationTripStateRef.current = fn;
  }, []);

  const handleSetCityNights = useCallback((cityId, nights) => {
    setCityNightsRef.current?.(cityId, nights);
  }, []);

  const handleSetCityAccommodation = useCallback((cityId, partial) => {
    setCityAccommodationRef.current?.(cityId, partial);
  }, []);

  const handleSetTripDates = useCallback((partial) => {
    setTripDatesRef.current?.(partial);
  }, []);

  return (
    <div className="fixed inset-0 top-[calc(56px+env(safe-area-inset-top))] flex flex-col bg-[#faf8f5] overflow-hidden z-10">
      {/* Top header bar */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-[#e5e0d8] shrink-0 bg-white/85 backdrop-blur">
        {/* Day strip (once trip has cities) */}
        {plannerSnapshot?.hasCities && plannerSnapshot.days?.length > 0 ? (
          <TripDayStrip
            days={plannerSnapshot.days}
            cities={plannerSnapshot.cities}
            tripDates={plannerSnapshot.tripState?.dates}
            itinerary={plannerSnapshot.itinerary}
            onSetCityNights={handleSetCityNights}
            onSetCityAccommodation={handleSetCityAccommodation}
            onSetTripDates={handleSetTripDates}
          />
        ) : (
          <div className="min-w-0 flex-1" aria-hidden="true" />
        )}
      </div>

      {/* Content area: full remaining height */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ThreeColumnPlanner
          initialUserMessage={q}
          initialTripId={tripId}
          initialLocalTripId={localTripId}
          initialTripState={sharedTripState}
          onPlannerStateChange={handlePlannerStateChange}
          registerSetCityNights={registerSetCityNights}
          registerSetCityAccommodation={registerSetCityAccommodation}
          registerSetTripDates={registerSetTripDates}
          registerApplyTripState={registerApplyTripState}
        />
      </div>
    </div>
  );
}

export default function PlanPage() {
  return (
    <Suspense fallback={<PlannerLoading />}>
      <PlanContent />
    </Suspense>
  );
}
