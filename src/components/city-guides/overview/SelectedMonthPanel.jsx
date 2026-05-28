'use client';

import React from 'react';
import Link from 'next/link';
import { RATING_LABELS } from './lib/constants';
import { planMonthHref } from './lib/derived';

/**
 * Inline panel shown when the user selects a month from the calendar
 * or trip-fit chips. Sits above the 12-month grid.
 */
export default function SelectedMonthPanel({
  cityName,
  selectedCalendarMonth,
  selectedInsight,
  onOpenMonthlyGuide,
  onClear,
}) {
  if (!selectedCalendarMonth || !selectedInsight) return null;

  return (
    <div className="rounded-xl border border-blue-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
            Selected month
          </p>
          <h3 className="text-xl font-bold text-gray-900">
            {selectedCalendarMonth} looks{' '}
            {RATING_LABELS[selectedInsight.rating]?.toLowerCase() || 'promising'}
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            {selectedInsight.weatherLabel || 'Seasonal weather'} ·{' '}
            {selectedInsight.crowdLevel || 'moderate'} crowds ·{' '}
            {selectedInsight.specialEventsCount}{' '}
            {selectedInsight.specialEventsCount === 1 ? 'highlighted event' : 'highlighted events'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={planMonthHref(cityName, selectedCalendarMonth)}
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Plan {selectedCalendarMonth}
          </Link>
          {onOpenMonthlyGuide && (
            <button
              type="button"
              onClick={() => onOpenMonthlyGuide(selectedCalendarMonth)}
              className="rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
            >
              Open {selectedCalendarMonth} guide
            </button>
          )}
          <button
            type="button"
            onClick={onClear}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
