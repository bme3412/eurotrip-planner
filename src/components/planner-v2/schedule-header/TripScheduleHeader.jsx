'use client';

import { useCallback, useMemo, useState } from 'react';
import DateRangeChip from './DateRangeChip';
import CityScheduleCard from './CityScheduleCard';
import DayStrip from './DayStrip';
import Legend from './Legend';
import { useDaySelection } from './useDaySelection';
import { buildDayAssignments, getTripDayCount } from '@/lib/conversation/dayAssignments';

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
}) {
  const [focusedDayIndex, setFocusedDayIndex] = useState(null);

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
        const name = (typeof window !== 'undefined'
          ? window.prompt('New city name?')
          : ''
        )?.trim();
        if (!name) return;
        const created = addCity?.({ name }) || null;
        const newId = created?.id || name.toLowerCase();
        if (assignDaysToCity) {
          assignDaysToCity(newId, indices);
        }
      } else if (assignDaysToCity) {
        assignDaysToCity(cityIdOrNew, indices);
      }
      clear();
    },
    [addCity, assignDaysToCity, clear]
  );

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

  const hasGaps = useMemo(() => days.some((d) => d.cityId == null), [days]);

  // Empty shell: seed dates without chat.
  if (!hasDates && orderedCities.length === 0) {
    return (
      <div className="z-20 max-h-[200px] shrink-0 overflow-y-auto border-b border-[#e5e0d8] bg-[#faf8f5]/95 px-4 py-2.5 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-2">
          <DateRangeChip
            startDate={tripState?.dates?.startDate}
            endDate={tripState?.dates?.endDate}
            onDatesChange={handleDatesChange}
          />
          <p className="text-xs text-[#8a8578]">
            Pick dates or tell me where you want to go.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="z-20 max-h-[200px] shrink-0 overflow-y-auto border-b border-[#e5e0d8] bg-[#faf8f5]/95 backdrop-blur-sm">
      <div className="space-y-2 px-4 py-2.5">
        <div className="flex max-w-full flex-nowrap items-stretch gap-2 overflow-x-auto pb-1">
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
            />
          ))}
        </div>

        {days.length > 0 && (
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

        {orderedCities.length > 0 && (
          <Legend
            cities={orderedCities.map((c) => ({
              id: c.id || c.name?.toLowerCase(),
              name: c.name,
              color: cityColors[c.id || c.name?.toLowerCase()],
            }))}
            hasGaps={hasGaps}
          />
        )}
      </div>
    </div>
  );
}
