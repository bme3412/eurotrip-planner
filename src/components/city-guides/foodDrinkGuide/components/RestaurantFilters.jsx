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
    <div className="space-y-3 mb-6">
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
                  ? 'bg-blue-600 text-white'
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

      {/* Price filter — pills, same interaction language as the categories */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-gray-500">Price:</span>
        {PRICE_FILTERS.map((p) => {
          const isActive = priceFilter === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onPriceChange(p.id)}
              title={p.label}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {p.symbol || p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
