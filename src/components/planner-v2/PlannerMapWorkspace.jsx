'use client';

import { useMemo, useState } from 'react';
import RouteMapColumn from './RouteMapColumn';
import TripScheduleHeader from './schedule-header/TripScheduleHeader';
import { buildRouteSummary } from '@/lib/conversation/plannerActions';

function SaveActionBadge({ action }) {
  if (!action?.saveStatus) return null;
  const label = action.saveStatus === 'saving'
    ? 'Saving'
    : action.saveStatus === 'saved'
      ? 'Saved'
      : action.saveStatus === 'error'
        ? 'Save issue'
        : null;
  if (!label) return null;

  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
      action.saveStatus === 'error' ? 'bg-red-50 text-red-700' : 'bg-[#f5f0e8] text-[#6a6459]'
    }`}>
      {label}
    </span>
  );
}

export default function PlannerMapWorkspace({
  tripState,
  interaction,
  setTripDates,
  assignDaysToCity,
  unassignDays,
  setCityNights,
  addCity,
  acceptSuggestedAllocation,
  latestPlannerAction,
}) {
  const [expanded, setExpanded] = useState(true);
  const hasCities = (tripState?.route?.cities || []).length > 0;
  const routeSummary = useMemo(() => buildRouteSummary(tripState), [tripState]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="min-h-[320px] flex-1 overflow-hidden">
        <RouteMapColumn tripState={tripState} interaction={interaction} />
      </div>

      {hasCities && (
        <div className="shrink-0 border-t border-[#e5e0d8] bg-[#faf8f5]">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-[#f5f0e8]"
            aria-expanded={expanded}
          >
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a8578]">
                Route schedule
              </p>
              <p className="truncate text-sm font-semibold text-[#2a2520]">
                {routeSummary}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <SaveActionBadge action={latestPlannerAction} />
              <span className="rounded-full border border-[#e5e0d8] bg-white px-3 py-1 text-xs font-semibold text-[#6a6459]">
                {expanded ? 'Minimize' : 'Expand'}
              </span>
            </div>
          </button>

          {expanded && (
            <div className="max-h-[42vh] overflow-y-auto border-t border-[#e5e0d8]">
              <TripScheduleHeader
                tripState={tripState}
                setTripDates={setTripDates}
                assignDaysToCity={assignDaysToCity}
                unassignDays={unassignDays}
                setCityNights={setCityNights}
                addCity={addCity}
                acceptSuggestedAllocation={acceptSuggestedAllocation}
                latestPlannerAction={latestPlannerAction}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
