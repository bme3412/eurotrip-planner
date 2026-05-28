'use client';

import React from 'react';
import IntroSections from './components/IntroSections';
import RestaurantSection from './components/RestaurantSection';
import HighlightsSection from './components/HighlightsSection';
import FoodFooter from './components/FoodFooter';
import { useFoodGuideData } from './hooks/useFoodGuideData';
import { useFlattenedRestaurants } from './hooks/useRestaurantList';

export default function FoodDrinkGuide({ cityName, cityData }) {
  const cityKey = cityName?.toLowerCase();
  const displayName =
    cityName?.charAt(0).toUpperCase() + cityName?.slice(1) || 'This City';

  const culinaryGuide = cityData?.culinaryGuide;
  const foodData = useFoodGuideData(cityKey, cityData?.country);
  const allRestaurants = useFlattenedRestaurants(culinaryGuide);

  return (
    <div className="space-y-10">
      <IntroSections intro={foodData.intro} sections={foodData.sections} />

      {culinaryGuide && allRestaurants.length > 0 && (
        <RestaurantSection allRestaurants={allRestaurants} />
      )}

      <HighlightsSection highlights={foodData.highlights} />

      <FoodFooter cityName={cityName} displayName={displayName} />
    </div>
  );
}
