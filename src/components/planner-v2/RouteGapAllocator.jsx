'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildDayAssignments } from '@/lib/conversation/dayAssignments';
import { getFlagForCountry } from '@/utils/countryFlags';

function SuggestedStopsPanel({ suggestions = [], selectedDayCount = 0, onSelectCity }) {
  if (!suggestions.length) return null;
  const regionLabels = [...new Set(suggestions.map((city) => city.regionFocus).filter(Boolean))];
  const label = regionLabels.length === 1
    ? `Good bases for ${regionLabels[0]}`
    : regionLabels.length > 1
      ? `Recommended bases for ${regionLabels.join(' + ')}`
      : 'Suggested stops for this route';

  return (
    <div className="mb-3 rounded-2xl border border-[#e5e0d8] bg-white p-3 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8a8578]">
            {label}
          </p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-[#4a4540]">
            {selectedDayCount > 0
              ? `Choose one to add to the ${selectedDayCount} selected open night${selectedDayCount === 1 ? '' : 's'}.`
              : 'Choose a suggestion to add to the open nights.'}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[#f5f0e8] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6a6459]">
          Ranked
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {suggestions.slice(0, 6).map((city) => {
          const meta = [
            city.regionFocus || null,
            city.routeRole || null,
            city.rank ? `#${city.rank}` : null,
            city.travelTime || city.duration || null,
          ].filter(Boolean);

          return (
            <button
              key={city.id || `${city.name}-${city.country || ''}`}
              type="button"
              disabled={selectedDayCount === 0}
              onClick={() => onSelectCity(city)}
              className="group rounded-2xl border border-[#e5e0d8] bg-[#faf8f5] p-3 text-left transition hover:border-[#c9a227] hover:bg-white hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-45"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-base font-semibold leading-tight text-[#2a2520]">
                    {city.country ? `${getFlagForCountry(city.country)} ` : ''}
                    {city.name}
                    {city.country ? (
                      <span className="font-sans text-sm font-normal text-[#8a8578]">, {city.country}</span>
                    ) : null}
                  </p>
                  {city.reason && (
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#6a6459]">
                      {city.reason}
                    </p>
                  )}
                  {city.transportNote && (
                    <p className="mt-1 text-[11px] leading-relaxed text-[#8a8578]">
                      {city.transportNote}
                    </p>
                  )}
                  {meta.length > 0 && (
                    <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a8578]">
                      {meta.join(' · ')}
                    </p>
                  )}
                </div>
                <span className="shrink-0 rounded-full bg-[#2a2520] px-3 py-1.5 text-[11px] font-semibold text-white transition group-hover:bg-[#c9a227]">
                  Add
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function RouteGapAllocator({ interaction, tripState, assignDaysToCity, addCity }) {
  const [selected, setSelected] = useState(() => new Set());

  const days = useMemo(() => buildDayAssignments(tripState), [tripState]);
  const freeDays = useMemo(
    () => {
      const totalNights = tripState?.dates?.totalNights;
      return days.filter((day) => {
        if (day.cityId) return false;
        // The final day is a checkout/departure day in the nights-based model,
        // so assigning it would accidentally create an extra night.
        if (Number.isFinite(totalNights) && day.dayIndex >= totalNights) return false;
        return true;
      });
    },
    [days, tripState?.dates?.totalNights]
  );
  const freeIndices = useMemo(
    () => freeDays.map((day) => day.dayIndex),
    [freeDays]
  );
  const suggestions = interaction?.previewSuggestions || [];

  useEffect(() => {
    setSelected((prev) => {
      const valid = new Set(freeIndices);
      const next = new Set([...prev].filter((idx) => valid.has(idx)));
      if (next.size === 0 && freeIndices.length > 0) {
        freeIndices.forEach((idx) => next.add(idx));
      }
      return next;
    });
  }, [freeIndices]);

  const selectedIndices = useMemo(() => {
    const next = [...selected].filter((idx) => freeIndices.includes(idx));
    next.sort((a, b) => a - b);
    return next;
  }, [freeIndices, selected]);

  const toggleDay = useCallback((dayIndex) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(dayIndex)) next.delete(dayIndex);
      else next.add(dayIndex);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(freeIndices));
  }, [freeIndices]);

  const handleCitySelect = useCallback(
    (city) => {
      if (!city?.name || selectedIndices.length === 0) return;
      const created = addCity?.({
        id: city.id,
        name: city.name,
        country: city.country,
        latitude: city.latitude,
        longitude: city.longitude,
      });
      const cityId = created?.id || city.id || city.name.toLowerCase();
      assignDaysToCity?.(cityId, selectedIndices);
      setSelected(new Set());
    },
    [addCity, assignDaysToCity, selectedIndices]
  );

  if (
    !assignDaysToCity ||
    !addCity ||
    freeDays.length === 0 ||
    !interaction?.showRouteAllocator
  ) {
    return null;
  }
  const title = interaction.copy?.status || 'Allocate nights';
  const subtitle = `Assign ${freeDays.length} open ${freeDays.length === 1 ? 'night' : 'nights'} to the selected route stop.`;

  return (
    <div className="border-b border-[#e5e0d8] bg-[#faf8f5] px-4 py-3 shrink-0">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8a8578]">
            {title}
          </p>
          <p className="mt-0.5 text-[12px] text-[#4a4540]">
            {subtitle}
          </p>
        </div>
        <button
          type="button"
          onClick={selectAll}
          className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a8578] hover:text-[#2a2520]"
        >
          All free
        </button>
      </div>

      <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
        {freeDays.map((day) => {
          const active = selected.has(day.dayIndex);
          return (
            <button
              key={day.dayIndex}
              type="button"
              onClick={() => toggleDay(day.dayIndex)}
              className={`min-w-[56px] rounded-xl border px-2 py-1.5 text-left transition-colors ${
                active
                  ? 'border-[#2a2520] bg-[#2a2520] text-white'
                  : 'border-dashed border-[#d5d0c8] bg-white text-[#8a8578] hover:border-[#b5b0a8]'
              }`}
              aria-pressed={active}
            >
              <span className="block text-[9px] uppercase tracking-[0.12em] opacity-70">
                Night {day.dayIndex + 1}
              </span>
              <span className="block text-[10px] font-medium">
                {day.date ? day.date.slice(5).replace('-', '/') : 'Free'}
              </span>
            </button>
          );
        })}
      </div>

      <SuggestedStopsPanel
        suggestions={suggestions}
        selectedDayCount={selectedIndices.length}
        onSelectCity={handleCitySelect}
      />
    </div>
  );
}
