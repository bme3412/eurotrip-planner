'use client';

import { useCallback, useMemo, useState } from 'react';
import DateRangeChip from './DateRangeChip';
import DayStrip from './DayStrip';
import { useDaySelection } from './useDaySelection';
import { CitySearchInput } from '../../conversation/InputArea';
import { buildDayAssignments, getTripDayCount } from '@/lib/conversation/dayAssignments';
import { buildSuggestedAllocation, formatCityDateRange } from '@/lib/conversation/plannerActions';
import { getFlagForCountry } from '@/utils/countryFlags';

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

function cityKey(city) {
  return city?.id || city?.name?.toLowerCase?.() || null;
}

function formatDayLabel(day) {
  if (!day?.date) return `Day ${day.dayIndex + 1}`;
  return day.date.slice(5).replace('-', '/');
}

function buildTimelineSegments(days, cities) {
  if (days.length > 0) {
    const cityById = new Map(cities.map((city) => [cityKey(city), city]));
    const segments = [];
    for (const day of days) {
      const key = day.cityId || '__free__';
      const last = segments[segments.length - 1];
      if (last?.key === key) {
        last.days.push(day);
        continue;
      }
      const city = day.cityId ? cityById.get(day.cityId) : null;
      segments.push({
        key,
        city,
        cityId: day.cityId,
        days: [day],
        isFree: !day.cityId,
      });
    }
    return segments;
  }

  return cities.map((city, index) => ({
    key: cityKey(city) || `${city.name}-${index}`,
    city,
    cityId: cityKey(city),
    days: [],
    isFree: false,
  }));
}

function RouteTimeline({
  days,
  cities,
  cityColors,
  selectedSet,
  onSelectSegment,
  onIncrementNights,
  onDecrementNights,
  suggestedAllocation,
}) {
  const segments = useMemo(() => buildTimelineSegments(days, cities), [cities, days]);
  if (segments.length === 0) return null;

  return (
    <div className="rounded-2xl border border-[#e5e0d8] bg-white p-3 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a8578]">
            Route timeline
          </p>
          <p className="mt-1 hidden text-xs text-[#6a6459] sm:block">
            Click a stop to edit nights.
          </p>
        </div>
        {suggestedAllocation && (
          <span className="rounded-full border border-[#eadfc8] bg-[#fffaf0] px-3 py-1.5 text-xs font-semibold text-[#8a6f18]">
            Suggested split ready
          </span>
        )}
      </div>

      {suggestedAllocation && (
        <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
          {suggestedAllocation.segments.map((segment) => (
            <div
              key={segment.cityId}
              className="min-w-[140px] rounded-xl border border-[#eadfc8] bg-[#fffaf0] px-3 py-2"
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
      )}

      <div className="flex items-stretch gap-2 overflow-x-auto pb-1">
        {segments.map((segment, index) => {
          const firstDay = segment.days[0];
          const lastDay = segment.days[segment.days.length - 1];
          const city = segment.city;
          const color = segment.cityId ? cityColors[segment.cityId] : '#b5ad9f';
          const selected = segment.days.length > 0 && segment.days.every((day) => selectedSet?.has(day.dayIndex));
          const nights = city && Number.isFinite(city.nights) ? city.nights : segment.days.length;
          const label = segment.isFree ? 'Open nights' : city?.name || 'Route stop';
          const dateRange = city ? formatCityDateRange(city) : [
            formatDayLabel(firstDay),
            lastDay && lastDay !== firstDay ? formatDayLabel(lastDay) : null,
          ].filter(Boolean).join('-');

          return (
            <div key={`${segment.key}-${index}`} className="flex items-center gap-2">
              <div
                role="button"
                tabIndex={0}
                onClick={() => onSelectSegment(segment.days.map((day) => day.dayIndex))}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelectSegment(segment.days.map((day) => day.dayIndex));
                  }
                }}
                className={`min-h-[92px] min-w-[168px] rounded-2xl border p-3 text-left transition ${
                  selected
                    ? 'border-[#2a2520] bg-[#2a2520] text-white shadow-md'
                    : segment.isFree
                      ? 'border-dashed border-[#c9a227] bg-[#fffaf0] text-[#2a2520] hover:bg-white'
                      : 'border-[#e5e0d8] bg-[#faf8f5] text-[#2a2520] hover:border-[#c9a227]/60 hover:bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className={`text-[9px] font-semibold uppercase tracking-[0.14em] ${
                      selected ? 'text-white/70' : 'text-[#8a8578]'
                    }`}>
                      {segment.isFree ? 'Needs assignment' : city?.role || 'Stop'}
                    </p>
                    <p className="mt-1 truncate font-display text-base font-semibold">
                      {city?.country ? (
                        <span className="mr-1 font-sans" aria-hidden="true">
                          {getFlagForCountry(city.country)}
                        </span>
                      ) : null}
                      {label}
                    </p>
                    <p className={`mt-1 text-xs ${selected ? 'text-white/75' : 'text-[#6a6459]'}`}>
                      {nights || segment.days.length} {nights === 1 ? 'night' : 'nights'}
                      {dateRange ? ` · ${dateRange}` : ''}
                    </p>
                  </div>
                  <span
                    className="mt-1 h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: selected ? 'rgba(255,255,255,0.75)' : color }}
                    aria-hidden="true"
                  />
                </div>

                {city && (onIncrementNights || onDecrementNights) && (
                  <div className="mt-3 flex gap-1.5">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDecrementNights?.(city);
                      }}
                      disabled={!nights}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold disabled:opacity-30 ${
                        selected ? 'border-white/25 text-white' : 'border-[#e5e0d8] text-[#6a6459] hover:bg-[#f5f0e8]'
                      }`}
                    >
                      - night
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onIncrementNights?.(city);
                      }}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                        selected ? 'border-white/25 text-white' : 'border-[#e5e0d8] text-[#6a6459] hover:bg-[#f5f0e8]'
                      }`}
                    >
                      + night
                    </button>
                  </div>
                )}
              </div>

              {index < segments.length - 1 && (
                <div className="flex shrink-0 flex-col items-center text-[#b5ad9f]">
                  <span className="h-px w-7 bg-[#d5d0c8]" />
                  <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.12em]">
                    travel
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Compact trip schedule header: date range, route timeline, and optional day strip.
 * Not sticky — the /plan page flex column allocates height to chat + map below.
 */
export default function TripScheduleHeader({
  tripState,
  setTripDates,
  assignDaysToCity,
  unassignDays,
  setCityNights,
  addCity,
  latestPlannerAction,
}) {
  const [focusedDayIndex, setFocusedDayIndex] = useState(null);
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
  const suggestedAllocation = useMemo(
    () => buildSuggestedAllocation(tripState),
    [tripState]
  );

  const {
    selectedSet,
    selectedIndices,
    selectionCount,
    toggle,
    selectMany,
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

  const handleSegmentSelect = useCallback(
    (indices) => {
      if (!indices?.length) return;
      selectMany(indices);
      handleDayFocus(indices[0]);
    },
    [handleDayFocus, selectMany]
  );

  const handleDatesChange = useCallback(
    (partial) => {
      setTripDates?.(partial);
    },
    [setTripDates]
  );

  return (
    <div className="z-20 shrink-0 bg-[#faf8f5]/95 backdrop-blur-sm">
      <div className="space-y-1 px-3 py-1.5">
        {latestPlannerAction?.confirmation && (
          <div className="rounded-xl border border-[#eadfc8] bg-white px-3 py-2 text-xs text-[#6a6459] shadow-sm">
            <span className="font-semibold text-[#2a2520]">{latestPlannerAction.title || 'Trip updated'}.</span>{' '}
            {latestPlannerAction.confirmation}
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

        <RouteTimeline
          days={days}
          cities={orderedCities}
          cityColors={cityColors}
          selectedSet={selectedSet}
          onSelectSegment={isInteractive ? handleSegmentSelect : () => {}}
          onIncrementNights={isInteractive ? handleIncrementNights : null}
          onDecrementNights={isInteractive ? handleDecrementNights : null}
          suggestedAllocation={suggestedAllocation}
        />

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
