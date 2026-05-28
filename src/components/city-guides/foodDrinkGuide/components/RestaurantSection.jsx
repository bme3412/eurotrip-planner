'use client';

import React, { useState } from 'react';
import { ChefHat } from 'lucide-react';
import RestaurantCard from './RestaurantCard';
import RestaurantFilters from './RestaurantFilters';
import { useFilteredRestaurants } from '../hooks/useRestaurantList';
import { DEFAULT_RESTAURANT_PAGE_SIZE } from '../lib/constants';

export default function RestaurantSection({ allRestaurants }) {
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priceFilter, setPriceFilter] = useState('all');
  const [showAll, setShowAll] = useState(false);

  const filteredRestaurants = useFilteredRestaurants(
    allRestaurants,
    categoryFilter,
    priceFilter,
  );

  const displayed = showAll
    ? filteredRestaurants
    : filteredRestaurants.slice(0, DEFAULT_RESTAURANT_PAGE_SIZE);

  return (
    <section className="border-t border-gray-200 pt-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
          <ChefHat className="w-6 h-6 text-amber-600" />
          Restaurant Guide
        </h2>
        <span className="text-sm text-gray-500">{allRestaurants.length} places</span>
      </div>

      <RestaurantFilters
        allRestaurants={allRestaurants}
        categoryFilter={categoryFilter}
        onCategoryChange={(id) => {
          setCategoryFilter(id);
          setShowAll(false);
        }}
        priceFilter={priceFilter}
        onPriceChange={(id) => {
          setPriceFilter(id);
          setShowAll(false);
        }}
      />

      {/* Restaurant Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayed.map((restaurant, i) => (
          <RestaurantCard
            key={`${restaurant.name}-${i}`}
            restaurant={restaurant}
            category={restaurant._category}
          />
        ))}
      </div>

      {/* Show more button */}
      {filteredRestaurants.length > DEFAULT_RESTAURANT_PAGE_SIZE && !showAll && (
        <div className="mt-6 text-center">
          <button
            onClick={() => setShowAll(true)}
            className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
          >
            Show all {filteredRestaurants.length} places
          </button>
        </div>
      )}

      {filteredRestaurants.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No restaurants match your filters. Try adjusting your selection.
        </div>
      )}
    </section>
  );
}
