'use client';

import React from 'react';
import IntroSections from './components/IntroSections';
import RestaurantSection from './components/RestaurantSection';
import FoodFooter from './components/FoodFooter';
import { useFoodGuideData } from './hooks/useFoodGuideData';
import { useFlattenedRestaurants } from './hooks/useRestaurantList';

export default function FoodDrinkGuide({ cityName, cityData, isFavorite = null, toggle = null }) {
  const cityKey = cityName?.toLowerCase();
  const displayName =
    cityName?.charAt(0).toUpperCase() + cityName?.slice(1) || 'This City';

  const culinaryGuide = cityData?.culinaryGuide;
  const foodData = useFoodGuideData(cityKey, cityData?.country);
  const allRestaurants = useFlattenedRestaurants(culinaryGuide);

  return (
    <div className="space-y-10">
      {/* Lede, then the Restaurant Guide leads the page; the prose guide
          sections follow as supporting editorial. */}
      {foodData.intro && (
        <p className="text-xl md:text-2xl text-gray-800 leading-relaxed font-medium max-w-4xl">
          {foodData.intro}
        </p>
      )}

      {culinaryGuide && allRestaurants.length > 0 && (
        <RestaurantSection
          allRestaurants={allRestaurants}
          cityName={cityName}
          isFavorite={isFavorite}
          onToggleFavorite={toggle}
        />
      )}

      <div className="border-t border-gray-200 pt-10">
        <IntroSections sections={foodData.sections} />
      </div>

      <FoodFooter cityName={cityName} displayName={displayName} />
    </div>
  );
}
