'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Settings2, Check } from 'lucide-react';
import TripSummary from './TripSummary';

// Lazy load the map component
const TripMap = dynamic(
  () => import('@/components/trip-planner/TripMap'),
  { ssr: false, loading: () => <MapPlaceholder /> }
);

function MapPlaceholder() {
  return (
    <div className="w-full h-48 bg-slate-100 rounded-xl animate-pulse flex items-center justify-center">
      <span className="text-slate-400 text-sm">Loading map...</span>
    </div>
  );
}

/**
 * Get planning progress steps based on trip state
 */
function getPlanningSteps(trip) {
  const steps = [
    { id: 'start', label: 'Start City', done: !!trip.startCity },
    { id: 'end', label: 'End City', done: trip.endCity !== undefined },
    { id: 'duration', label: 'Duration', done: !!trip.totalDays },
    { id: 'stops', label: 'Add Stops', done: trip.stops?.length > 0 },
    { id: 'days', label: 'Allocate Days', done: trip.daysPerCity && Object.keys(trip.daysPerCity).length > 0 },
    { id: 'dates', label: 'Pick Dates', done: !!trip.dates },
  ];

  // Find current step (first incomplete)
  const currentIndex = steps.findIndex(s => !s.done);

  return steps.map((step, i) => ({
    ...step,
    current: i === currentIndex,
  }));
}

/**
 * Progress stepper component
 */
function ProgressStepper({ trip }) {
  const steps = getPlanningSteps(trip);
  const completedCount = steps.filter(s => s.done).length;

  return (
    <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate-500">Progress</span>
        <span className="text-xs text-slate-400">{completedCount}/{steps.length}</span>
      </div>
      <div className="space-y-1">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`flex items-center gap-2 text-xs py-1 px-2 rounded ${
              step.current
                ? 'bg-blue-50 text-blue-700 font-medium'
                : step.done
                ? 'text-slate-500'
                : 'text-slate-400'
            }`}
          >
            {step.done ? (
              <Check className="w-3 h-3 text-emerald-500" />
            ) : step.current ? (
              <div className="w-3 h-3 rounded-full border-2 border-blue-500 bg-blue-500 animate-pulse" />
            ) : (
              <div className="w-3 h-3 rounded-full border border-slate-300" />
            )}
            <span>{step.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * ContextPanel - Side panel showing map and trip summary
 */
export default function ContextPanel({
  trip,
  onSwitchToAdvanced,
}) {
  // Build itinerary for map
  const itinerary = useMemo(() => {
    const items = [];

    if (trip.startCity) {
      items.push({
        type: 'anchor',
        city: trip.startCity.id,
        cityName: trip.startCity.name,
        country: trip.startCity.country,
      });
    }

    trip.stops?.forEach(stop => {
      items.push({
        type: 'gap-filled',
        city: stop.id,
        cityName: stop.name,
        country: stop.country,
      });
    });

    if (trip.endCity) {
      items.push({
        type: 'anchor',
        city: trip.endCity.id,
        cityName: trip.endCity.name,
        country: trip.endCity.country,
      });
    }

    return items;
  }, [trip]);

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Map section */}
      <div className="p-4 pb-2">
        <TripMap
          itinerary={itinerary}
          className="h-48 rounded-xl"
        />
      </div>

      {/* Progress stepper */}
      <div className="px-4 py-2">
        <ProgressStepper trip={trip} />
      </div>

      {/* Trip summary */}
      <div className="flex-1 overflow-y-auto p-4 pt-2">
        <TripSummary trip={trip} />
      </div>

      {/* Switch to advanced mode */}
      <div className="p-4 pt-0">
        <button
          onClick={onSwitchToAdvanced}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Settings2 className="w-4 h-4" />
          <span>Switch to Advanced Mode</span>
        </button>
      </div>
    </div>
  );
}
