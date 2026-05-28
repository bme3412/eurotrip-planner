'use client';

import React from 'react';
import { MONTH_NAMES, RATING_COLORS, RATING_LABELS } from './lib/constants';

/**
 * Left side of the "compare & plan" row. Two month selectors driving
 * a side-by-side breakdown (weather, crowds, events).
 */
export default function CompareMonthsPanel({
  compareMonths,
  comparisonInsights,
  onUpdateCompareMonth,
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Compare months</h3>
          <p className="text-sm text-gray-600">
            Choose two windows and compare weather, crowds, events, and value.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {[0, 1].map((index) => (
          <select
            key={`compare-select-${index}`}
            value={compareMonths[index]}
            onChange={(event) => onUpdateCompareMonth?.(index, event.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800"
            aria-label={`Compare month ${index + 1}`}
          >
            {MONTH_NAMES.map((monthName) => (
              <option key={monthName} value={monthName}>{monthName}</option>
            ))}
          </select>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {comparisonInsights.map((month) => (
          <div key={`compare-${month.monthName}`} className="rounded-lg bg-white p-3 ring-1 ring-gray-200">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-900">{month.monthName}</span>
              <span
                className="rounded-full px-2 py-0.5 text-xs font-semibold text-white"
                style={{ backgroundColor: RATING_COLORS[month.rating] }}
              >
                {RATING_LABELS[month.rating]}
              </span>
            </div>
            <dl className="mt-3 space-y-1 text-sm text-gray-600">
              <div className="flex justify-between gap-3">
                <dt>Weather</dt>
                <dd className="font-medium text-gray-800">{month.weatherLabel || 'Mixed'}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Crowds</dt>
                <dd className="font-medium text-gray-800">{month.crowdLevel || 'Moderate'}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Events</dt>
                <dd className="font-medium text-gray-800">{month.specialEventsCount}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}
