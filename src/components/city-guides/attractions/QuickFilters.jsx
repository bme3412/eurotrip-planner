'use client';

import React from 'react';

/**
 * QuickFilters — the toggle row that exposes the attraction-list filter state
 * that already drives the filter pipeline in AttractionsList (quick toggles +
 * category chips). Previously this state could only be *cleared*, never set
 * from the UI; this surfaces it. Multi-select; each control is independent.
 */

// `key` matches the `quickFilters` shape in AttractionsList. Indoor/Outdoor are
// mutually exclusive — that's enforced by the toggle handler, not here.
const QUICK_FILTERS = [
  { key: 'freeOnly', label: 'Free', icon: '🆓' },
  { key: 'budgetOnly', label: 'Budget', icon: '💸' },
  { key: 'indoorOnly', label: 'Indoor', icon: '🏛️' },
  { key: 'outdoorOnly', label: 'Outdoor', icon: '🌳' },
  { key: 'shortVisitsOnly', label: 'Quick visits', icon: '⏱️' },
];

export default function QuickFilters({
  quickFilters,
  onToggleQuickFilter,
  categories = [],
  activeCategories = [],
  onToggleCategory,
}) {
  const hasCategories = Array.isArray(categories) && categories.length > 0;

  return (
    <div className="space-y-3" role="group" aria-label="Filter experiences">
      <div className="flex flex-wrap gap-2">
        {QUICK_FILTERS.map((f) => {
          const active = Boolean(quickFilters?.[f.key]);
          return (
            <button
              key={f.key}
              type="button"
              aria-pressed={active}
              onClick={() => onToggleQuickFilter(f.key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <span aria-hidden="true">{f.icon}</span>
              {f.label}
            </button>
          );
        })}
      </div>

      {hasCategories && (
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => {
            const value = String(cat).toLowerCase();
            const active = activeCategories.includes(value);
            return (
              <button
                key={value}
                type="button"
                aria-pressed={active}
                onClick={() => onToggleCategory(value)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  active
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
