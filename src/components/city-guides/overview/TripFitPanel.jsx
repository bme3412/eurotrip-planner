'use client';

import React from 'react';
import { TRAVELER_LABELS, RATING_LABELS } from './lib/constants';

const TRAVELER_TYPES = ['families', 'couples', 'solo', 'budget', 'luxury'];

/**
 * Right side of the "compare & plan" row. Selectors for traveler /
 * budget / crowd, with the top recommendations as clickable chips.
 */
export default function TripFitPanel({
  tripFit,
  tripFitRecommendations,
  onUpdateTripFit,
  onSelectMonth,
}) {
  const setField = (field) => (event) => {
    onUpdateTripFit?.((current) => ({ ...current, [field]: event.target.value }));
  };

  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
      <h3 className="text-lg font-bold text-gray-900">Find your best trip window</h3>
      <p className="text-sm text-gray-600">Tune the calendar around how you like to travel.</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Style
          <select
            value={tripFit.traveler}
            onChange={setField('traveler')}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm normal-case tracking-normal text-gray-800"
          >
            {TRAVELER_TYPES.map((type) => (
              <option key={type} value={type}>{TRAVELER_LABELS[type]}</option>
            ))}
          </select>
        </label>

        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Budget
          <select
            value={tripFit.budget}
            onChange={setField('budget')}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm normal-case tracking-normal text-gray-800"
          >
            <option value="budget">Value</option>
            <option value="mid">Balanced</option>
            <option value="luxury">Splurge-worthy</option>
          </select>
        </label>

        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Crowds
          <select
            value={tripFit.crowd}
            onChange={setField('crowd')}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm normal-case tracking-normal text-gray-800"
          >
            <option value="quiet">Prefer quiet</option>
            <option value="balanced">Balanced</option>
            <option value="lively">Love energy</option>
          </select>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {tripFitRecommendations.map((month) => (
          <button
            key={`fit-${month.monthName}`}
            type="button"
            onClick={() => onSelectMonth?.(month.monthName)}
            className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100"
          >
            {month.monthName} · {RATING_LABELS[month.rating]}
          </button>
        ))}
      </div>
    </div>
  );
}
