'use client';

import React from 'react';
import { RESTAURANT_CATEGORIES, PRICE_FILTERS } from '../lib/constants';

export default function RestaurantFilters({
  allRestaurants,
  categoryFilter,
  onCategoryChange,
  priceFilter,
  onPriceChange,
}) {
  return (
    <div className="flex flex-wrap gap-3 mb-6">
      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {RESTAURANT_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const count =
            cat.id === 'all'
              ? allRestaurants.length
              : allRestaurants.filter((r) => r._category === cat.id).length;
          if (count === 0 && cat.id !== 'all') return null;

          const isActive = categoryFilter === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-amber-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {cat.label}
              {cat.id !== 'all' && (
                <span className="text-xs opacity-75">({count})</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Price filter */}
      <select
        value={priceFilter}
        onChange={(e) => onPriceChange(e.target.value)}
        className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm bg-white text-gray-700"
      >
        {PRICE_FILTERS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
    </div>
  );
}
