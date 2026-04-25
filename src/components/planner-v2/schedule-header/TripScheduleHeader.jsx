'use client';

import { useCallback, useMemo, useState } from 'react';
import DateRangeChip from './DateRangeChip';
import CityScheduleCard from './CityScheduleCard';
import DayStrip from './DayStrip';
import { useDaySelection } from './useDaySelection';
import { CitySearchInput } from '../../conversation/InputArea';
import { buildDayAssignments, getTripDayCount } from '@/lib/conversation/dayAssignments';
import { buildSuggestedAllocation, formatCityDateRange } from '@/lib/conversation/plannerActions';

const CITY_PALETTE = [
  '#d97706',
  '#0d9488',
  '#7c3aed',
  '#db2777',
  '#0369a1',
  '#16a34a',
  '#b45309',
  '#4338ca',
];

function buildCityColors(cities) {
  const out = {};
  cities.forEach((c, i) => {
    const id = c.id || c.name?.toLowerCase();
    if (!id) return;
    out[id] = CITY_PALETTE[i % CITY_PALETTE.length];
  });
  return out;
}

/**
 * Compact trip schedule header: date range, duration, per-city cards, day strip.
 * Not sticky — the /plan page flex column allocates height to chat + map below.
 */
export default function TripScheduleHeader({
  tripState,
  setTripDates,
  assignDaysToCity,
  unassignDays,
  setCityNights,
  addCity,
  acceptSuggestedAllocation,
  latestPlannerAction,
}) {
  const [focusedDayIndex, setFocusedDayIndex] = useState(null);
  const [pendingNewCityIndices, setPendingNewCityIndices] = useState(null);
  const [showDays, setShowDays] = useState(true);

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
  const hasDates =
    !!tripState?.dates?.startDate || !!tripState?.dates?.endDate;
  const isInteractive = !!(assignDaysToCity || unassignDays || setCityNights);
  const suggestedAllocation = useMemo(
    () => buildSuggestedAllocation(tripState),
    [tripState]
  );

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

  const handleIncrementNights = useCallback(
    (city) => {
      if (!setCityNights) return;
      const id = city.id || city.name?.toLowerCase();
      const next = (Number.isFinite(city.nights) ? city.nights : 0) + 1;
      setCityNights(id, next);
    },
    [setCityNights]
  );

  const handleDecrementNights = useCallback(
    (city) => {
      if (!setCityNights) return;
      const id = city.id || city.name?.toLowerCase();
      const current = Number.isFinite(city.nights) ? city.nights : 0;
      if (current <= 0) return;
      setCityNights(id, current - 1);
    },
    [setCityNights]
  );

  const handleDayFocus = useCallback((dayIndex) => {
    setFocusedDayIndex(dayIndex);
    setTimeout(
      () =>
        setFocusedDayIndex((prev) => (prev === dayIndex ? null : prev)),
      1200
    );
  }, []);

  const handleDatesChange = useCallback(
    (partial) => {
      setTripDates?.(partial);
    },
    [setTripDates]
  );

  const handleAcceptSuggestedAllocation = useCallback(() => {
    if (!suggestedAllocation) return;
    acceptSuggestedAllocation?.(suggestedAllocation);
  }, [acceptSuggestedAllocation, suggestedAllocation]);

  return (
    <div className="z-20 shrink-0 bg-[#faf8f5]/95 backdrop-blur-sm">
      <div className="space-y-1 px-3 py-1.5">
        {latestPlannerAction?.confirmation && (
          <div className="rounded-xl border border-[#eadfc8] bg-white px-3 py-2 text-xs text-[#6a6459] shadow-sm">
            <span className="font-semibold text-[#2a2520]">{latestPlannerAction.title || 'Trip updated'}.</span>{' '}
            {latestPlannerAction.confirmation}
          </div>
        )}

        {suggestedAllocation && (
          <div className="rounded-xl border border-[#eadfc8] bg-white p-3 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a8578]">
                  Suggested date split
                </p>
                <p className="mt-1 text-xs text-[#6a6459]">
                  Accept this split, then we can compare transport between each leg.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAcceptSuggestedAllocation}
                className="rounded-full bg-[#2a2520] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1a1510]"
              >
                Apply split
              </button>
            </div>
            <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
              {suggestedAllocation.segments.map((segment) => (
                <div
                  key={segment.cityId}
                  className="min-w-[150px] rounded-xl border border-[#e5e0d8] bg-[#faf8f5] px-3 py-2"
                >
                  <p className="truncate text-xs font-semibold text-[#2a2520]">
                    {segment.cityName}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#6a6459]">
                    {segment.nights}n · {segment.label.split(': ')[1]}
                  </p>
                </div>
              ))}
            </div>
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
          {orderedCities.map((city) => (
            <CityScheduleCard
              key={city.id || city.name}
              city={city}
              days={days}
              color={cityColors[city.id || city.name?.toLowerCase()]}
              onIncrementNights={isInteractive ? handleIncrementNights : null}
              onDecrementNights={isInteractive ? handleDecrementNights : null}
              onDayFocus={handleDayFocus}
              dateRange={formatCityDateRange(city)}
            />
          ))}
          {days.length > 0 && (
            <button
              type="button"
              onClick={() => setShowDays((value) => !value)}
              className="flex shrink-0 items-center rounded-xl border border-[#e5e0d8] bg-white px-3 py-2 text-[11px] font-semibold text-[#6a6459] shadow-sm hover:bg-[#f5f0e8] hover:text-[#2a2520]"
            >
              {showDays ? 'Hide days' : 'Show days'}
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
            focusedDayIndex={focusedDayIndex}
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
