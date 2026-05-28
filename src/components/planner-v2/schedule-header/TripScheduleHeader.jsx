'use client';

import { useCallback, useMemo, useState } from 'react';
import DateRangeChip from './DateRangeChip';
import DayStrip from './DayStrip';
import { useDaySelection } from './useDaySelection';
import { CitySearchInput } from '../../conversation/InputArea';
import { buildDayAssignments, getTripDayCount } from '@/lib/conversation/dayAssignments';
import { buildCityColors } from '@/lib/planning/cityColors';

/**
 * Compact trip schedule controls: date range + day count + optional day strip
 * for bulk assignment. The per-city "Route timeline" was removed because the
 * top-bar Day Strip in /plan covers that signal without the duplication.
 * Not sticky — the /plan page flex column allocates height to chat + map.
 */
export default function TripScheduleHeader({
  tripState,
  setTripDates,
  undoLastReflow,
  assignDaysToCity,
  unassignDays,
  setCityNights,
  addCity,
}) {
  const [pendingNewCityIndices, setPendingNewCityIndices] = useState(null);
  const [showDays, setShowDays] = useState(false);

  const days = useMemo(() => buildDayAssignments(tripState), [tripState]);
  const orderedCities = useMemo(() => {
    const arr = [...(tripState?.route?.cities || [])];
    arr.sort((a, b) => {
      const ao = Number.isFinite(a.order) ? a.order : 999;
      const bo = Number.isFinite(b.order) ? b.order : 999;
      return ao - bo;
    });
    return arr;
  }, [tripState?.route?.cities]);

  const cityColors = useMemo(
    () => buildCityColors(orderedCities),
    [orderedCities]
  );

  const totalNightsPlaced = useMemo(
    () =>
      orderedCities.reduce(
        (s, c) => s + (Number.isFinite(c.nights) ? c.nights : 0),
        0
      ),
    [orderedCities]
  );

  const tripDayCount = getTripDayCount(tripState);
  const totalNightsFromDates = tripState?.dates?.totalNights;
  const isInteractive = !!(assignDaysToCity || unassignDays || setCityNights);

  const {
    selectedSet,
    selectedIndices,
    selectionCount,
    toggle,
    clear,
  } = useDaySelection({ totalDays: days.length });

  const handleAssign = useCallback(
    (cityIdOrNew, indices) => {
      if (!indices || indices.length === 0) return;
      if (cityIdOrNew === '__new__') {
        // Open the inline city search popover; remember which day indices
        // the user had selected so we can assign them after a city is picked.
        setPendingNewCityIndices([...indices]);
        return;
      }
      if (assignDaysToCity) {
        assignDaysToCity(cityIdOrNew, indices);
      }
      clear();
    },
    [assignDaysToCity, clear]
  );

  const handleNewCitySelect = useCallback(
    (city) => {
      if (!city?.name) {
        setPendingNewCityIndices(null);
        return;
      }
      const created = addCity?.({
        name: city.name,
        id: city.id,
        country: city.country,
        latitude: city.latitude,
        longitude: city.longitude,
      }) || null;
      const newId = created?.id || city.id || city.name.toLowerCase();
      if (assignDaysToCity && pendingNewCityIndices?.length) {
        assignDaysToCity(newId, pendingNewCityIndices);
      }
      setPendingNewCityIndices(null);
      clear();
    },
    [addCity, assignDaysToCity, clear, pendingNewCityIndices]
  );

  const handleCancelNewCity = useCallback(() => {
    setPendingNewCityIndices(null);
  }, []);

  const handleUnassign = useCallback(
    (indices) => {
      if (!indices || indices.length === 0) return;
      unassignDays?.(indices);
      clear();
    },
    [unassignDays, clear]
  );

  const handleDatesChange = useCallback(
    (partial) => {
      setTripDates?.(partial);
    },
    [setTripDates]
  );

  const reflow = tripState?.lastReflow;
  const reflowFresh = reflow?.at && Date.now() - reflow.at < 10000;

  return (
    <div className="z-20 shrink-0 bg-[#faf8f5]/95 backdrop-blur-sm">
      <div className="space-y-1 px-3 py-1.5">
        {reflowFresh && (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-[#eadfc8] bg-[#fffaf0] px-3 py-2 text-xs text-[#6a6459] shadow-sm">
            <span className="min-w-0 truncate">
              <span className="font-semibold text-[#2a2520]">Reflowed.</span>{' '}
              {reflow.summary}
            </span>
            {undoLastReflow && (
              <button
                type="button"
                onClick={() => undoLastReflow()}
                className="shrink-0 rounded-full border border-[#c9a227]/50 bg-white px-2.5 py-1 text-[11px] font-semibold text-[#8a6f18] hover:bg-[#fff5d8]"
              >
                Undo
              </button>
            )}
          </div>
        )}

        <div className="flex max-w-full flex-nowrap items-stretch gap-1.5 overflow-x-auto pb-0.5">
          <DateRangeChip
            startDate={tripState?.dates?.startDate}
            endDate={tripState?.dates?.endDate}
            onDatesChange={handleDatesChange}
          />
          {tripDayCount > 0 && (
            <div className="flex shrink-0 items-center rounded-xl border border-[#e5e0d8] bg-white px-3 py-2 shadow-sm">
              <span className="text-[11px] font-medium text-[#2a2520]">
                {tripDayCount} {tripDayCount === 1 ? 'day' : 'days'}
                {totalNightsFromDates != null && totalNightsFromDates > 0 && (
                  <span className="text-[#8a8578]">
                    {' '}
                    · {totalNightsFromDates} nights
                  </span>
                )}
                {totalNightsPlaced > 0 &&
                  totalNightsFromDates != null &&
                  totalNightsPlaced !== totalNightsFromDates && (
                    <span className="text-[#8a8578]">
                      {' '}
                      · {totalNightsPlaced} placed
                    </span>
                  )}
              </span>
            </div>
          )}
          {days.length > 0 && (
            <button
              type="button"
              onClick={() => setShowDays((value) => !value)}
              className="flex shrink-0 items-center rounded-xl border border-[#e5e0d8] bg-white px-3 py-2 text-[11px] font-semibold text-[#6a6459] shadow-sm hover:bg-[#f5f0e8] hover:text-[#2a2520]"
            >
              {showDays ? 'Hide fine tune' : 'Fine tune days'}
            </button>
          )}
        </div>

        {days.length > 0 && showDays && (
          <DayStrip
            days={days}
            cityColors={cityColors}
            cities={orderedCities}
            selectedSet={selectedSet}
            selectionCount={selectionCount}
            selectedIndices={selectedIndices}
            onToggleDay={isInteractive ? toggle : undefined}
            onClearSelection={clear}
            onAssignSelectionToCity={isInteractive ? handleAssign : undefined}
            onUnassignSelection={isInteractive ? handleUnassign : undefined}
            focusedDayIndex={null}
          />
        )}

        {pendingNewCityIndices && (
          <div className="rounded-xl border border-[#e5e0d8] bg-white p-2 shadow-sm">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#8a8578]">
                Pick a city for the selected {pendingNewCityIndices.length}{' '}
                {pendingNewCityIndices.length === 1 ? 'day' : 'days'}
              </span>
              <button
                type="button"
                onClick={handleCancelNewCity}
                className="text-[10px] uppercase tracking-[0.1em] text-[#8a8578] hover:text-[#2a2520]"
              >
                Cancel
              </button>
            </div>
            <CitySearchInput purpose="stop" onSelect={handleNewCitySelect} />
          </div>
        )}
      </div>
    </div>
  );
}
