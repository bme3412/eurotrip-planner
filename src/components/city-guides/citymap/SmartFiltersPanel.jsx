'use client';

import React from 'react';

const TIME_OPTIONS = [
  ['all', 'All Times'],
  ['now', 'Open Now'],
  ['morning', 'Morning'],
  ['afternoon', 'Afternoon'],
  ['evening', 'Evening'],
];

const PRICE_OPTIONS = [
  ['all', 'All Prices'],
  ['free', 'Free'],
  ['moderate', 'Moderate'],
  ['expensive', 'Expensive'],
];

const DURATION_OPTIONS = [
  ['all', 'Any Duration'],
  ['quick', 'Quick (≤1.5h)'],
  ['medium', 'Medium (1.5-3h)'],
  ['long', 'Long (>3h)'],
];

const INDOOR_OPTIONS = [
  ['all', 'All Locations'],
  ['indoor', 'Indoor Only'],
  ['outdoor', 'Outdoor Only'],
];

const DEFAULT_FILTERS = {
  timeFilter: 'all',
  priceFilter: 'all',
  durationFilter: 'all',
  indoorFilter: 'all',
};

/**
 * Floating filter panel anchored top-left of the map. Owns no state — the
 * orchestrator passes `smartFilters` + setters down.
 */
export default function SmartFiltersPanel({
  cityName,
  currentLocalTime,
  showingIconicOnly,
  onShowingIconicOnlyChange,
  smartFilters,
  onSmartFiltersChange,
  collapsed,
  onToggleCollapsed,
}) {
  const updateFilter = (key, value) => {
    onSmartFiltersChange({ ...smartFilters, [key]: value });
  };

  return (
    <div className="absolute top-4 left-4 z-20 w-72 max-w-xs bg-white/95 backdrop-blur-md border border-gray-200 rounded-xl shadow-xl p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">Smart Filters</h3>
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? 'Expand filters' : 'Collapse filters'}
          className="text-gray-500 hover:text-gray-700 transition-colors"
        >
          {collapsed ? '▾' : '▴'}
        </button>
      </div>

      <div className={`${collapsed ? 'hidden' : 'block'} mt-3`}>
        <div className="mb-3 flex items-center justify-between text-[11px] text-gray-600">
          <span className="font-medium">
            Local time ({cityName ? cityName.charAt(0).toUpperCase() + cityName.slice(1) : 'City'}):{' '}
            {currentLocalTime || '—'}
          </span>
          <label className="inline-flex items-center gap-1 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showingIconicOnly}
              onChange={(e) => onShowingIconicOnlyChange(e.target.checked)}
              className="accent-blue-600"
            />
            <span>{showingIconicOnly ? 'Highlights' : 'All'}</span>
          </label>
        </div>

        <FilterSelect
          label="Time"
          value={smartFilters.timeFilter}
          options={TIME_OPTIONS}
          onChange={(v) => updateFilter('timeFilter', v)}
        />
        <FilterSelect
          label="Price"
          value={smartFilters.priceFilter}
          options={PRICE_OPTIONS}
          onChange={(v) => updateFilter('priceFilter', v)}
        />
        <FilterSelect
          label="Duration"
          value={smartFilters.durationFilter}
          options={DURATION_OPTIONS}
          onChange={(v) => updateFilter('durationFilter', v)}
        />
        <FilterSelect
          label="Location"
          value={smartFilters.indoorFilter}
          options={INDOOR_OPTIONS}
          onChange={(v) => updateFilter('indoorFilter', v)}
        />

        <button
          type="button"
          onClick={() => onSmartFiltersChange(DEFAULT_FILTERS)}
          className="w-full text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 py-1 px-2 rounded-lg transition-colors"
        >
          Clear All Filters
        </button>
      </div>
    </div>
  );
}

function FilterSelect({ label, value, options, onChange }) {
  return (
    <div className="mb-3">
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1 bg-white"
      >
        {options.map(([val, lbl]) => (
          <option key={val} value={val}>
            {lbl}
          </option>
        ))}
      </select>
    </div>
  );
}
