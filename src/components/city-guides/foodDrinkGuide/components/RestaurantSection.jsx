'use client';

import React, { useCallback, useState } from 'react';
import { Check } from 'lucide-react';
import RestaurantCard from './RestaurantCard';
import RestaurantFilters from './RestaurantFilters';
import { useFilteredRestaurants } from '../hooks/useRestaurantList';
import { DEFAULT_RESTAURANT_PAGE_SIZE } from '../lib/constants';

export default function RestaurantSection({ allRestaurants, cityName = null, isFavorite = null, onToggleFavorite = null }) {
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priceFilter, setPriceFilter] = useState('all');
  const [showAll, setShowAll] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const filteredRestaurants = useFilteredRestaurants(
    allRestaurants,
    categoryFilter,
    priceFilter,
  );

  const showToast = useCallback((message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // Enrich the raw guide entry so the saved row reads well everywhere
  // favorites surface (shortlist bar, My Trips "Saved experiences").
  // Identity stays `restaurant.name` (defaultIdOf), so isFavorite matches
  // the raw entry too.
  const handleToggleFavorite = useCallback(async (restaurant) => {
    if (!onToggleFavorite) return;
    const res = await onToggleFavorite({
      ...restaurant,
      category: 'Food & Drink',
      subcategory: restaurant._category || null,
      description:
        restaurant.cuisine_type || restaurant.type || restaurant.specialty || null,
      location: restaurant.neighborhood || restaurant.location || null,
      priceLevel: restaurant.price_range || null,
    });
    if (res?.action === 'added') showToast(`Saved "${res.id}" to favorites`);
    else if (res?.action === 'removed') showToast(`Removed "${res.id}" from favorites`);
  }, [onToggleFavorite, showToast]);

  const displayed = showAll
    ? filteredRestaurants
    : filteredRestaurants.slice(0, DEFAULT_RESTAURANT_PAGE_SIZE);

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <header>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600 mb-1.5">
            Curated picks
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-gray-900 tracking-tight">
            Restaurant Guide
          </h2>
        </header>
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
            cityName={cityName}
            isFavorite={isFavorite}
            onToggleFavorite={onToggleFavorite ? handleToggleFavorite : null}
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

      {/* Toast notification (same pattern as AttractionsList) */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-gray-900 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3">
            <Check className="h-5 w-5 text-emerald-400" />
            <span className="text-sm font-medium">{toastMessage}</span>
          </div>
        </div>
      )}
    </section>
  );
}
