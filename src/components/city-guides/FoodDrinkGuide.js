'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, MapPin, Clock, Star, Utensils, Wine, Coffee, ShoppingBag, ChefHat } from 'lucide-react';
import { fetchCityDataUrl, getCityPaths } from '@/lib/city-data';

const DEFAULT_FOOD_DATA = {
  intro: `Every great city has its own food culture. Here's how to eat and drink like a local.`,
  sections: [
    { title: "Getting Started", content: `Research local specialties before you arrive. Ask locals for recommendations—hotel staff, taxi drivers, and shopkeepers often know the best spots. Avoid restaurants with photos on the menu or aggressive hosts outside.` },
    { title: "Dining Tips", content: `Learn local meal times—they vary widely across cultures. Lunch is often the best value for quality dining. Make reservations for popular spots. Don't be afraid to eat where you don't see other tourists.` },
  ],
  highlights: [],
};


// Category definitions for restaurant filtering
const RESTAURANT_CATEGORIES = [
  { id: 'all', label: 'All', icon: Utensils },
  { id: 'fine_dining', label: 'Fine Dining', icon: Star },
  { id: 'casual_dining', label: 'Casual', icon: Utensils },
  { id: 'street_food', label: 'Street Food', icon: ShoppingBag },
  { id: 'coffee_shops', label: 'Coffee', icon: Coffee },
  { id: 'bars', label: 'Bars', icon: Wine },
];

// Price filter options - support both € and £ currencies
const PRICE_FILTERS = [
  { id: 'all', label: 'All Prices', match: null },
  { id: 'budget', label: '$ Budget', match: ['€', '£'] },
  { id: 'mid', label: '$$ Mid-range', match: ['€€', '££'] },
  { id: 'upscale', label: '$$$ Upscale', match: ['€€€', '£££'] },
  { id: 'luxury', label: '$$$$ Fine Dining', match: ['€€€€', '££££'] },
];

// Restaurant Card Component
function RestaurantCard({ restaurant, category }) {
  const [expanded, setExpanded] = useState(false);

  const isBar = category === 'bars';
  const isCoffee = category === 'coffee_shops';
  const isStreetFood = category === 'street_food';

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-gray-900">{restaurant.name}</h4>
            {restaurant.michelin_stars > 0 && (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold">
                {Array(restaurant.michelin_stars).fill('★').join('')}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {restaurant.cuisine_type || restaurant.type || restaurant.specialty || 'Restaurant'}
          </p>
        </div>
        <span className="text-sm font-medium text-gray-700 shrink-0">
          {restaurant.price_range}
        </span>
      </div>

      {/* Quick info */}
      <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-gray-600">
        {(restaurant.neighborhood || restaurant.location) && (
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-gray-400" />
            {restaurant.neighborhood || restaurant.location}
          </span>
        )}
        {restaurant.best_time && (
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            {restaurant.best_time}
          </span>
        )}
      </div>

      {/* Signature dishes or drinks */}
      {(restaurant.signature_dishes || restaurant.signature_drinks || restaurant.must_try || restaurant.specialties) && (
        <div className="mt-3">
          <p className="text-sm text-gray-700">
            <span className="font-medium">{isBar ? 'Try:' : isCoffee ? 'Must try:' : isStreetFood ? 'Specialties:' : 'Signature:'}</span>{' '}
            {(restaurant.signature_dishes || restaurant.signature_drinks || restaurant.must_try || restaurant.specialties)?.slice(0, 3).join(', ')}
          </p>
        </div>
      )}

      {/* Expandable details */}
      {(restaurant.atmosphere || restaurant.local_tips || restaurant.booking_tips) && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-3 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            {expanded ? 'Show less' : 'More details'}
            <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>

          {expanded && (
            <div className="mt-3 space-y-2 text-sm text-gray-600 border-t border-gray-100 pt-3">
              {restaurant.atmosphere && (
                <p><span className="font-medium text-gray-700">Atmosphere:</span> {restaurant.atmosphere}</p>
              )}
              {restaurant.local_tips && (
                <p><span className="font-medium text-gray-700">Local tip:</span> {restaurant.local_tips}</p>
              )}
              {restaurant.booking_tips && (
                <p><span className="font-medium text-gray-700">Booking:</span> {restaurant.booking_tips}</p>
              )}
              {restaurant.dress_code && (
                <p><span className="font-medium text-gray-700">Dress code:</span> {restaurant.dress_code}</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function FoodDrinkGuide({ cityName, cityData }) {
  const cityKey = cityName?.toLowerCase();
  const displayName = cityName?.charAt(0).toUpperCase() + cityName?.slice(1) || 'This City';

  // Get culinary guide from cityData
  const culinaryGuide = cityData?.culinaryGuide;

  // Filter state
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priceFilter, setPriceFilter] = useState('all');
  const [showAllRestaurants, setShowAllRestaurants] = useState(false);

  // Lazy-loaded per-city food guide content (intro, sections, highlights).
  // Defaults render immediately; JSON swaps in once fetched.
  const [foodData, setFoodData] = useState(DEFAULT_FOOD_DATA);

  useEffect(() => {
    if (!cityKey) return;
    let cancelled = false;
    const { foodGuide } = getCityPaths(cityData?.country, cityKey);
    fetchCityDataUrl(foodGuide, { cache: 'force-cache' })
      .then((json) => {
        if (cancelled || !json) return;
        setFoodData({
          intro: json.intro || DEFAULT_FOOD_DATA.intro,
          sections: Array.isArray(json.sections) && json.sections.length
            ? json.sections
            : DEFAULT_FOOD_DATA.sections,
          highlights: Array.isArray(json.highlights) ? json.highlights : [],
        });
      })
      .catch(() => { /* keep defaults */ });
    return () => { cancelled = true; };
  }, [cityKey, cityData?.country]);

  // Flatten and filter restaurants
  const allRestaurants = useMemo(() => {
    if (!culinaryGuide) return [];

    const restaurants = [];

    // Add restaurants
    if (culinaryGuide.restaurants) {
      Object.entries(culinaryGuide.restaurants).forEach(([category, items]) => {
        if (Array.isArray(items)) {
          items.forEach(item => {
            restaurants.push({ ...item, _category: category });
          });
        }
      });
    }

    // Add bars and cafes
    if (culinaryGuide.bars_and_cafes) {
      Object.entries(culinaryGuide.bars_and_cafes).forEach(([category, items]) => {
        if (Array.isArray(items)) {
          items.forEach(item => {
            restaurants.push({ ...item, _category: category });
          });
        }
      });
    }

    return restaurants;
  }, [culinaryGuide]);

  // Apply filters
  const filteredRestaurants = useMemo(() => {
    return allRestaurants.filter(r => {
      if (categoryFilter !== 'all' && r._category !== categoryFilter) return false;
      if (priceFilter !== 'all') {
        const priceConfig = PRICE_FILTERS.find(p => p.id === priceFilter);
        if (priceConfig?.match && !priceConfig.match.includes(r.price_range)) {
          return false;
        }
      }
      return true;
    });
  }, [allRestaurants, categoryFilter, priceFilter]);

  // Limit displayed restaurants unless "show all" is clicked
  const displayedRestaurants = showAllRestaurants
    ? filteredRestaurants
    : filteredRestaurants.slice(0, 6);

  // Convert markdown-style bold to JSX
  const renderContent = (content) => {
    const parts = content.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="text-gray-900">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const Section = ({ title, content }) => (
    <section className="mb-8 last:mb-0">
      <h2 className="text-xl font-bold text-gray-900 mb-3 tracking-tight">{title}</h2>
      <div className="prose prose-lg max-w-none">
        {content.split('\n\n').map((paragraph, i) => (
          <p key={i} className="text-gray-700 leading-relaxed mb-4 last:mb-0 text-[17px]">
            {renderContent(paragraph)}
          </p>
        ))}
      </div>
    </section>
  );

  return (
    <div className="space-y-10">
      <article className="max-w-4xl mx-auto lg:max-w-none">
        {/* Lead paragraph */}
        <p className="text-xl md:text-2xl text-gray-800 leading-relaxed mb-10 font-medium max-w-4xl">
          {foodData.intro}
        </p>

        {/* Two column layout on larger screens */}
        <div className="grid lg:grid-cols-2 gap-x-12 gap-y-2">
          <div className="divide-y divide-gray-100 lg:divide-y-0">
            {foodData.sections.slice(0, Math.ceil(foodData.sections.length / 2)).map((section, i) => (
              <div key={i} className="py-5 first:pt-0 lg:py-0 lg:mb-8">
                <Section title={section.title} content={section.content} />
              </div>
            ))}
          </div>

          <div className="divide-y divide-gray-100 lg:divide-y-0">
            {foodData.sections.slice(Math.ceil(foodData.sections.length / 2)).map((section, i) => (
              <div key={i} className="py-5 first:pt-0 lg:py-0 lg:mb-8">
                <Section title={section.title} content={section.content} />
              </div>
            ))}
          </div>
        </div>
      </article>

      {/* Restaurant Guide Section - only shows if culinaryGuide exists */}
      {culinaryGuide && allRestaurants.length > 0 && (
        <section className="border-t border-gray-200 pt-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <ChefHat className="w-6 h-6 text-amber-600" />
              Restaurant Guide
            </h2>
            <span className="text-sm text-gray-500">{allRestaurants.length} places</span>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-6">
            {/* Category filter */}
            <div className="flex flex-wrap gap-2">
              {RESTAURANT_CATEGORIES.map(cat => {
                const Icon = cat.icon;
                const count = cat.id === 'all'
                  ? allRestaurants.length
                  : allRestaurants.filter(r => r._category === cat.id).length;
                if (count === 0 && cat.id !== 'all') return null;

                return (
                  <button
                    key={cat.id}
                    onClick={() => { setCategoryFilter(cat.id); setShowAllRestaurants(false); }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      categoryFilter === cat.id
                        ? 'bg-amber-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {cat.label}
                    {cat.id !== 'all' && <span className="text-xs opacity-75">({count})</span>}
                  </button>
                );
              })}
            </div>

            {/* Price filter */}
            <select
              value={priceFilter}
              onChange={(e) => { setPriceFilter(e.target.value); setShowAllRestaurants(false); }}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm bg-white text-gray-700"
            >
              {PRICE_FILTERS.map(p => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Restaurant Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedRestaurants.map((restaurant, i) => (
              <RestaurantCard
                key={`${restaurant.name}-${i}`}
                restaurant={restaurant}
                category={restaurant._category}
              />
            ))}
          </div>

          {/* Show more button */}
          {filteredRestaurants.length > 6 && !showAllRestaurants && (
            <div className="mt-6 text-center">
              <button
                onClick={() => setShowAllRestaurants(true)}
                className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
              >
                Show all {filteredRestaurants.length} places
              </button>
            </div>
          )}

          {/* No results */}
          {filteredRestaurants.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No restaurants match your filters. Try adjusting your selection.
            </div>
          )}
        </section>
      )}

      {/* Highlights */}
      {foodData.highlights && foodData.highlights.length > 0 && (
        <section className="border-t border-gray-200 pt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 tracking-tight">Don&apos;t Miss</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {foodData.highlights.map((item, i) => (
              <div key={i} className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{item.name}</h3>
                  <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">
                    {item.type}
                  </span>
                </div>
                <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                  {item.neighborhood && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      {item.neighborhood}
                    </span>
                  )}
                  {item.time && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      {item.time}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-gray-200 pt-8 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <nav className="flex items-center text-sm text-gray-500" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-gray-700 transition-colors">Home</Link>
            <ChevronRight className="w-4 h-4 mx-2 text-gray-400" />
            <Link href="/city-guides" className="hover:text-gray-700 transition-colors">City Guides</Link>
            <ChevronRight className="w-4 h-4 mx-2 text-gray-400" />
            <Link href={`/city-guides/${cityName?.toLowerCase()}`} className="hover:text-gray-700 transition-colors">{displayName}</Link>
            <ChevronRight className="w-4 h-4 mx-2 text-gray-400" />
            <span className="text-gray-900 font-medium">Food + Drink</span>
          </nav>
        </div>

        <p className="mt-6 text-xs text-gray-400">
          Prices, hours, and availability may change. Always check current information before visiting.
        </p>
      </footer>
    </div>
  );
}
