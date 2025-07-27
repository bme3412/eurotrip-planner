"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from 'next/navigation';

// Import components only
import InteractiveHeader from "./common/InteractiveHeader";
import NavigationTabs from "./common/NavigationTabs";
import PaginatedRow from "./planner/PaginatedRow";
import SelectedCitiesList from "./planner/SelectedCitiesList";
import SeasonalRecommendations from "./planner/SeasonalRecommendations";
import InterestCategories from "./planner/InterestCategories";
import TripRouteDisplay from "./planner/TripRouteDisplay";

// Import hooks for data fetching
import { useCities } from "../hooks/useCityData";

const EuroTripPlanner = () => {
  const router = useRouter();
  
  // State management
  const [startCity, setStartCity] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [activeTab, setActiveTab] = useState("Explore");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [tripDuration, setTripDuration] = useState(0);
  const [selectedCities, setSelectedCities] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");

  // Fetch cities using our new API
  const { cities: allCities, loading: citiesLoading, error: citiesError } = useCities();

  // Define European city categories (simplified - these could also come from API)
  const cityCategories = useMemo(() => [
    {
      section: "Summer Getaways",
      items: allCities.filter(city => 
        ['barcelona', 'nice', 'split', 'lisbon', 'santorini', 'mykonos'].includes(city.id)
      ).map(city => ({
        title: city.name,
        country: city.country,
        flags: ["🌊"],
        description: city.description || `Beautiful coastal destination in ${city.country}`,
      }))
    },
    {
      section: "Trending Destinations", 
      items: allCities.filter(city =>
        ['porto', 'dubrovnik', 'reykjavik', 'valencia', 'ljubljana', 'tallinn'].includes(city.id)
      ).map(city => ({
        title: city.name,
        country: city.country,
        flags: ["🔥"],
        description: city.description || `Trending destination in ${city.country}`,
      }))
    },
    {
      section: "Café Culture",
      items: allCities.filter(city => 
        ['vienna', 'paris', 'copenhagen', 'amsterdam', 'prague', 'budapest'].includes(city.id)
      ).map(city => ({
        title: city.name,
        country: city.country,
        flags: ["☕"],
        description: city.description || `Perfect for café lovers in ${city.country}`,
      }))
    },
    {
      section: "Art & History",
      items: allCities.filter(city => 
        ['florence', 'rome', 'berlin', 'athens', 'madrid', 'bruges'].includes(city.id)
      ).map(city => ({
        title: city.name,
        country: city.country,
        flags: ["🎨"],
        description: city.description || `Rich cultural heritage in ${city.country}`,
      }))
    },
    {
      section: "Foodie Heaven",
      items: allCities.filter(city => 
        ['bologna', 'lyon', 'naples', 'copenhagen', 'barcelona', 'istanbul'].includes(city.id)
      ).map(city => ({
        title: city.name,
        country: city.country,
        flags: ["🍽️"],
        description: city.description || `Culinary destination in ${city.country}`,
      }))
    }
  ], [allCities]);

  // Update trip duration when dates change
  useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setTripDuration(diffDays);
    }
  }, [startDate, endDate]);

  // Set initial city if one is entered
  useEffect(() => {
    if (startCity && selectedCities.length === 0 && allCities.length > 0) {
      const matchingCity = allCities.find(
        city => city.name.toLowerCase() === startCity.toLowerCase()
      );

      if (matchingCity) {
        setSelectedCities([{
          name: matchingCity.name,
          country: matchingCity.country,
          flag: "🇪🇺" // Default flag, could be enhanced
        }]);
        setSelectedCountry(matchingCity.country);
      }
    }
  }, [startCity, selectedCities.length, allCities]);

  // View city guide
  const viewCityGuide = (city) => {
    console.log("Viewing city guide for:", city.title);
    const citySlug = city.title.toLowerCase().replace(/\s+/g, '-');
    router.push(`/city-guides/${citySlug}`);
  };

  // Add city to trip
  const addCityToTrip = (city) => {
    setSelectedCities([
      ...selectedCities,
      { name: city.title, country: city.country, flag: "🇪🇺" },
    ]);
  };

  // Remove city from trip
  const removeCityFromTrip = (index) => {
    const updatedCities = [...selectedCities];
    updatedCities.splice(index, 1);
    setSelectedCities(updatedCities);
  };

  // Filter categories based on selected category
  const getCategoryPlaces = () => {
    if (!selectedCategory) return [];

    const categoryMap = {
      beaches: "Summer Getaways",
      cultural: "Art & History", 
      food: "Foodie Heaven",
      nature: "Nature & Adventure",
      urban: "Trending Destinations",
      events: "Café Culture",
    };

    const categoryName = categoryMap[selectedCategory] || selectedCategory;
    return cityCategories.find(category =>
      category.section.toLowerCase().includes(categoryName.toLowerCase())
    ) || { section: "No matches found", items: [] };
  };

  const categoryPlaces = getCategoryPlaces();

  // Loading state
  if (citiesLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading destination data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (citiesError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Unable to Load Destinations
          </h2>
          <p className="text-gray-600 mb-4">{citiesError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Render different content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case "Explore":
        return (
          <section>
            {cityCategories.map((category) => (
              <div key={category.section} className="mb-12">
                <h2 className="text-2xl font-bold text-slate-800 mb-6 capitalize">
                  {category.section}
                </h2>
                <PaginatedRow
                  items={category.items.map((item) => ({
                    ...item,
                    theme: category.section,
                    onView: () => viewCityGuide(item),
                    onAdd: () => addCityToTrip(item),
                  }))}
                />
              </div>
            ))}
          </section>
        );

      case "By Interest":
        return (
          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-6">
              Explore by Interest
            </h2>
            <InterestCategories setSelectedCategory={setSelectedCategory} />

            {selectedCategory && (
              <div className="mb-12">
                <h2 className="text-xl font-bold text-slate-800 mb-6 capitalize">
                  {categoryPlaces.section}
                </h2>
                <PaginatedRow
                  items={categoryPlaces.items.map((item) => ({
                    ...item,
                    theme: categoryPlaces.section,
                    onView: () => viewCityGuide(item),
                    onAdd: () => addCityToTrip(item),
                  }))}
                />
              </div>
            )}
          </section>
        );

      case "Seasonal":
        return (
          <section>
            <SeasonalRecommendations
              startDate={startDate}
              endDate={endDate}
              predefinedRoutes={cityCategories}
              viewCityGuide={viewCityGuide}
            />
          </section>
        );

      case "My Trip":
        return (
          <section>
            <SelectedCitiesList
              cities={selectedCities}
              removeCity={removeCityFromTrip}
              viewCityGuide={(city) => {
                const citySlug = city.name.toLowerCase().replace(/\s+/g, '-');
                router.push(`/city-guides/${citySlug}`);
              }}
            />
            {selectedCities.length > 0 ? (
              <TripRouteDisplay
                cities={selectedCities}
                tripDuration={tripDuration}
                viewCityGuide={(city) => {
                  const citySlug = city.name.toLowerCase().replace(/\s+/g, '-');
                  router.push(`/city-guides/${citySlug}`);
                }}
              />
            ) : (
              <div className="bg-white rounded-xl p-8 text-center shadow-md">
                <h3 className="text-xl font-medium text-slate-800 mb-4">
                  Your trip is empty
                </h3>
                <p className="text-slate-600 mb-6">
                  Start by adding destinations to your itinerary
                </p>
                <button
                  onClick={() => setActiveTab("Explore")}
                  className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Explore destinations
                </button>
              </div>
            )}
          </section>
        );

      default:
        return (
          <section>
            <div className="text-center p-12 bg-white rounded-xl shadow-md">
              <h2 className="text-2xl font-bold text-slate-800 mb-4">
                Ready to Plan Your European Adventure?
              </h2>
              <p className="text-slate-600 mb-8">
                Explore destinations and create your perfect itinerary.
              </p>
              <button
                onClick={() => setActiveTab("Explore")}
                className="px-8 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-colors"
              >
                Start Exploring
              </button>
            </div>
          </section>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <InteractiveHeader
        title="European Travel Planner"
        subtitle="Discover your perfect European adventure"
      />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <NavigationTabs activeTab={activeTab} setActiveTab={setActiveTab} />
        {renderTabContent()}
      </main>
    </div>
  );
};

export default EuroTripPlanner;