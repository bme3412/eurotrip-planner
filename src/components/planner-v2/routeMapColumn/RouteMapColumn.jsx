'use client';

import { useEffect, useMemo, useState } from 'react';
import { buildDayTabs, buildPreviewPoints, buildRoutePoints } from './lib/builders.js';
import DynamicItineraryMap from './components/DynamicItineraryMap.jsx';
import EmptyMapState from './components/EmptyMapState.jsx';

/**
 * Right-column map for the planner. Builds resolved route + preview + per-day
 * data structures from `tripState`/`interaction`, tracks which day is currently
 * selected, and hands everything to the Mapbox renderer.
 */
export default function RouteMapColumn({
  tripState,
  interaction,
  setCityNights,
  onSendMessage,
}) {
  const routePoints = useMemo(() => buildRoutePoints(tripState), [tripState]);
  const previewPoints = useMemo(
    () => buildPreviewPoints(interaction, routePoints),
    [interaction, routePoints]
  );
  const days = useMemo(
    () => buildDayTabs(tripState, routePoints),
    [routePoints, tripState]
  );
  const firstAssignedDay = days.find((day) => day.point)?.dayIndex ?? null;
  const [selectedDayIndex, setSelectedDayIndex] = useState(firstAssignedDay);

  useEffect(() => {
    if (firstAssignedDay == null) {
      setSelectedDayIndex(null);
      return;
    }
    setSelectedDayIndex((current) => {
      const stillExists = days.some((day) => day.dayIndex === current && day.point);
      return stillExists ? current : firstAssignedDay;
    });
  }, [days, firstAssignedDay]);

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="border-b border-slate-200 shrink-0" />

      <div className="flex-1 relative min-h-0">
        {routePoints.length === 0 && previewPoints.length === 0 ? (
          <EmptyMapState />
        ) : (
          <DynamicItineraryMap
            routePoints={routePoints}
            previewPoints={previewPoints}
            days={days}
            selectedDayIndex={selectedDayIndex}
            onSelectDay={setSelectedDayIndex}
            setCityNights={setCityNights}
            onSendMessage={onSendMessage}
          />
        )}
      </div>
    </div>
  );
}
