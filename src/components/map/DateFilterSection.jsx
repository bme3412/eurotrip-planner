"use client";

import React, { useState } from "react";
import DateRangePicker from "@/components/common/DateRangePicker";
import { MONTH_NAMES_SHORT } from "./constants";

/**
 * "Visit Dates" section rendered at the top of the Filters panel.
 *
 * Replaces the old native mm/dd/yyyy inputs with the shared two-month calendar
 * (Exact) and the season + month grid (Flexible). Lives INSIDE the filter panel
 * — not a separate floating popover — and commits live like the other filters
 * (country/search), so there's a single surface and nothing overlaps.
 *
 * @param {Object} props.dateFilters - { useFlexibleDates, startDate, endDate, selectedMonths }
 * @param {Function} props.onPickRange - ({ start, end }) => void, commits exact dates
 * @param {Function} props.onDateTypeToggle - flip Exact <-> Flexible
 * @param {Function} props.onMonthToggle - (monthIndex, selected) => void
 * @param {Function} props.onClearDates - clear the date selection
 */

const SEASONS = [
  { name: "Winter", months: [11, 0, 1] },
  { name: "Spring", months: [2, 3, 4] },
  { name: "Summer", months: [5, 6, 7] },
  { name: "Fall", months: [8, 9, 10] },
];

function tripDurationDays(start, end) {
  if (!start || !end) return 0;
  const s = new Date(`${start}T00:00:00`);
  const e = new Date(`${end}T00:00:00`);
  return Math.max(1, Math.ceil((e - s) / (1000 * 60 * 60 * 24)) + 1);
}

export default function DateFilterSection({
  dateFilters,
  onPickRange,
  onDateTypeToggle,
  onMonthToggle,
  onClearDates,
}) {
  const { useFlexibleDates, startDate, endDate, selectedMonths = [] } = dateFilters;

  // The calendar / month grid stays hidden until the user actively picks a
  // mode, so the panel opens clean. Pre-open it if a selection already exists.
  const hasExistingSelection = useFlexibleDates
    ? selectedMonths.length > 0
    : Boolean(startDate || endDate);
  const [chosen, setChosen] = useState(hasExistingSelection);

  const pickExact = () => {
    if (useFlexibleDates) onDateTypeToggle();
    setChosen(true);
  };
  const pickFlexible = () => {
    if (!useFlexibleDates) onDateTypeToggle();
    setChosen(true);
  };

  const handleSeasonToggle = (seasonMonths) => {
    const allSelected = seasonMonths.every((m) => selectedMonths.includes(m));
    seasonMonths.forEach((m) => {
      const isSelected = selectedMonths.includes(m);
      if (allSelected && isSelected) onMonthToggle(m, false);
      else if (!allSelected && !isSelected) onMonthToggle(m, true);
    });
  };

  const hasSelection = useFlexibleDates ? selectedMonths.length > 0 : Boolean(startDate || endDate);
  const duration = tripDurationDays(startDate, endDate);

  // A mode is "active" only once the user has chosen one (so nothing expands on
  // first open). `chosen` gates the calendar/month grid below.
  const exactActive = chosen && !useFlexibleDates;
  const flexibleActive = chosen && useFlexibleDates;

  return (
    <div className="mb-4">
      <label className="mb-2 block text-sm font-medium text-gray-700">Visit Dates</label>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={pickExact}
          className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            exactActive
              ? "border-blue-500 bg-blue-50 text-blue-700"
              : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          Exact dates
        </button>
        <button
          type="button"
          onClick={pickFlexible}
          className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            flexibleActive
              ? "border-blue-500 bg-blue-50 text-blue-700"
              : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          Flexible
        </button>
      </div>

      {!chosen ? (
        <p className="mt-2 text-xs text-gray-500">
          Choose exact dates or flexible months to rank cities for your trip.
        </p>
      ) : useFlexibleDates ? (
        <div className="mt-3">
          <div className="mb-2 flex flex-wrap gap-2">
            {SEASONS.map((season) => {
              const all = season.months.every((m) => selectedMonths.includes(m));
              const some = season.months.some((m) => selectedMonths.includes(m)) && !all;
              return (
                <button
                  key={season.name}
                  type="button"
                  onClick={() => handleSeasonToggle(season.months)}
                  className={`rounded-md border px-3 py-1 text-xs transition-colors ${
                    all
                      ? "border-blue-300 bg-blue-100 font-medium text-blue-800"
                      : some
                      ? "border-blue-200 bg-blue-50 text-blue-700"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {season.name}
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {MONTH_NAMES_SHORT.map((month, index) => (
              <button
                key={month}
                type="button"
                onClick={() => onMonthToggle(index, !selectedMonths.includes(index))}
                className={`rounded-md border px-1 py-1.5 text-center text-sm transition-colors ${
                  selectedMonths.includes(index)
                    ? "border-blue-300 bg-blue-100 font-medium text-blue-800"
                    : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100"
                }`}
              >
                {month}
              </button>
            ))}
          </div>
          {selectedMonths.length === 0 && (
            <p className="mt-2 text-xs text-amber-600">Pick at least one month to rank cities.</p>
          )}
        </div>
      ) : (
        <div className="mt-3">
          <DateRangePicker
            bare
            value={{ start: startDate || "", end: endDate || "" }}
            onChange={(next) => onPickRange({ start: next.start || "", end: next.end || "" })}
            initialMonth={startDate || undefined}
          />
          {startDate && endDate ? (
            <p className="text-center text-xs font-medium text-blue-600">{duration} day trip</p>
          ) : (
            <p className="text-center text-xs text-amber-600">Pick a start and end date to rank cities.</p>
          )}
        </div>
      )}

      {hasSelection && (
        <div className="mt-2 text-right">
          <button
            type="button"
            onClick={onClearDates}
            className="text-xs font-medium text-gray-500 underline-offset-2 hover:text-gray-800 hover:underline"
          >
            Clear dates
          </button>
        </div>
      )}
    </div>
  );
}
