"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from 'next/navigation'; // Import the Next.js router

// Import InteractiveHeader instead of HeaderSection
import InteractiveHeader from "./common/InteractiveHeader";
import NavigationTabs from "./common/NavigationTabs";
import PaginatedRow from "./planner/PaginatedRow";
import SelectedCitiesList from "./planner/SelectedCitiesList";
import SeasonalRecommendations from "./planner/SeasonalRecommendations";
import InterestCategories from "./planner/InterestCategories";
import TripRouteDisplay from "./planner/TripRouteDisplay";

// Import city data
import { austriaCities } from "../data/austriaData";
import { belgiumCities } from "../data/belgiumData";
import { czechRepublicCities } from "../data/czechrepublicData";
import { franceCities } from "../data/franceData";
import { germanyCities } from "../data/germanyData";
import { hungaryCities } from "../data/hungaryData";
import { irelandCities } from "../data/irelandData";
import { italyCities } from "../data/italyData";
import { netherlandsCities } from "../data/netherlandsData";
import { polandCities } from "../data/polandData";
import { portugalCities } from "../data/portugalData";
import { spainCities } from "../data/spainData";
import { switzerlandCities } from "../data/switzerlandData";
import { ukCities } from "../data/ukData";
import { countryFlags } from "../data/sharedData";

// Import constants and utility functions
import { calculateTripDuration } from "../data/tripConstants";

const EuroTripPlanner = () => {
  const router = useRouter(); // Initialize the router
  
  // State management
  const [startCity, setStartCity] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [activeTab, setActiveTab] = useState("Explore");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [tripDuration, setTripDuration] = useState(0);
  const [selectedCities, setSelectedCities] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");

  // Define European city categories
  const cityCategories = [
    {
      section: "Summer Getaways",
      items: [
        {
          title: "Barcelona",
          country: "Spain",
          flags: ["🇪🇸"],
          description:
            "Vibrant coastal city with stunning architecture and beaches",
        },
        {
          title: "Nice",
          country: "France",
          flags: ["🇫🇷"],
          description: "Elegant seaside city on the French Riviera",
        },
        {
          title: "Mykonos",
          country: "Greece",
          flags: ["🇬🇷"],
          description:
            "Iconic island with whitewashed buildings and beautiful beaches",
        },
        {
          title: "Split",
          country: "Croatia",
          flags: ["🇭🇷"],
          description:
            "Historic coastal city with Roman ruins and Mediterranean charm",
        },
        {
          title: "Lisbon",
          country: "Portugal",
          flags: ["🇵🇹"],
          description: "Colorful coastal capital with rich maritime history",
        },
        {
          title: "Amalfi Coast",
          country: "Italy",
          flags: ["🇮🇹"],
          description: "Dramatic coastline with picturesque cliffside villages",
        },
        {
          title: "Santorini",
          country: "Greece",
          flags: ["🇬🇷"],
          description:
            "Stunning island with blue-domed churches and volcanic views",
        },
        {
          title: "Mallorca",
          country: "Spain",
          flags: ["🇪🇸"],
          description:
            "Balearic island with beautiful beaches and mountain scenery",
        },
        {
          title: "Corsica",
          country: "France",
          flags: ["🇫🇷"],
          description: "Mountainous Mediterranean island with pristine beaches",
        },
        {
          title: "Sardinia",
          country: "Italy",
          flags: ["🇮🇹"],
          description:
            "Island paradise with turquoise waters and white sand beaches",
        },
        {
          title: "Hvar",
          country: "Croatia",
          flags: ["🇭🇷"],
          description:
            "Sunny island with lavender fields and crystal-clear waters",
        },
        {
          title: "Algarve",
          country: "Portugal",
          flags: ["🇵🇹"],
          description:
            "Southern coastal region with stunning cliffs and golden beaches",
        },
      ],
    },
    {
      section: "Trending Destinations",
      items: [
        {
          title: "Porto",
          country: "Portugal",
          flags: ["🇵🇹"],
          description: "Historic port city known for wine and riverside charm",
        },
        {
          title: "Dubrovnik",
          country: "Croatia",
          flags: ["🇭🇷"],
          description: "Walled city with stunning Adriatic views",
        },
        {
          title: "Reykjavík",
          country: "Iceland",
          flags: ["🇮🇸"],
          description:
            "Colorful capital with access to incredible natural wonders",
        },
        {
          title: "Tbilisi",
          country: "Georgia",
          flags: ["🇬🇪"],
          description:
            "Ancient city with diverse architecture and thermal baths",
        },
        {
          title: "Valencia",
          country: "Spain",
          flags: ["🇪🇸"],
          description:
            "Modern city with futuristic architecture and beautiful beaches",
        },
        {
          title: "Ljubljana",
          country: "Slovenia",
          flags: ["🇸🇮"],
          description:
            "Charming capital with beautiful bridges and green spaces",
        },
        {
          title: "Kotor",
          country: "Montenegro",
          flags: ["🇲🇪"],
          description: "Coastal town with an impressive bay and medieval walls",
        },
        {
          title: "Tallinn",
          country: "Estonia",
          flags: ["🇪🇪"],
          description:
            "Well-preserved medieval old town with digital innovation",
        },
        {
          title: "Krakow",
          country: "Poland",
          flags: ["🇵🇱"],
          description:
            "Historic gem with one of Europe's largest medieval squares",
        },
        {
          title: "Bologna",
          country: "Italy",
          flags: ["🇮🇹"],
          description:
            "Less touristy Italian city with rich culinary traditions",
        },
        {
          title: "Ghent",
          country: "Belgium",
          flags: ["🇧🇪"],
          description:
            "Historic university town with beautiful medieval center",
        },
        {
          title: "Lviv",
          country: "Ukraine",
          flags: ["🇺🇦"],
          description:
            "Cultural gem with Habsburg architecture and vibrant cafe scene",
        },
      ],
    },
    {
      section: "Café Culture",
      items: [
        {
          title: "Vienna",
          country: "Austria",
          flags: ["🇦🇹"],
          description: "Elegant city of music with historic coffeehouses",
        },
        {
          title: "Paris",
          country: "France",
          flags: ["🇫🇷"],
          description: "Iconic city with charming cafés and patisseries",
        },
        {
          title: "Copenhagen",
          country: "Denmark",
          flags: ["🇩🇰"],
          description:
            "Design-focused city with cozy cafés and hygge atmosphere",
        },
        {
          title: "Amsterdam",
          country: "Netherlands",
          flags: ["🇳🇱"],
          description: "Canal-lined city with unique café culture",
        },
        {
          title: "Prague",
          country: "Czech Republic",
          flags: ["🇨🇿"],
          description: "Fairytale city with historic cafés and beer halls",
        },
        {
          title: "Budapest",
          country: "Hungary",
          flags: ["🇭🇺"],
          description: "City of thermal baths with grand historic coffeehouses",
        },
        {
          title: "Rome",
          country: "Italy",
          flags: ["🇮🇹"],
          description: "Espresso culture and piazza people-watching",
        },
        {
          title: "Istanbul",
          country: "Turkey",
          flags: ["🇹🇷"],
          description: "Traditional coffee houses and tea gardens",
        },
        {
          title: "Lisbon",
          country: "Portugal",
          flags: ["🇵🇹"],
          description: "Pastel de nata bakeries and historic cafés",
        },
        {
          title: "Berlin",
          country: "Germany",
          flags: ["🇩🇪"],
          description: "Hipster coffee scene and all-day café lounging",
        },
        {
          title: "Stockholm",
          country: "Sweden",
          flags: ["🇸🇪"],
          description: "Fika tradition with coffee and cinnamon buns",
        },
        {
          title: "Milan",
          country: "Italy",
          flags: ["🇮🇹"],
          description: "Sophisticated coffee bars and aperitivo culture",
        },
      ],
    },
    {
      section: "Art & History",
      items: [
        {
          title: "Florence",
          country: "Italy",
          flags: ["🇮🇹"],
          description: "Renaissance masterpiece with world-class art museums",
        },
        {
          title: "Rome",
          country: "Italy",
          flags: ["🇮🇹"],
          description: "Eternal city with ancient ruins and artistic treasures",
        },
        {
          title: "Berlin",
          country: "Germany",
          flags: ["🇩🇪"],
          description:
            "Dynamic capital with turbulent history and vibrant art scene",
        },
        {
          title: "Athens",
          country: "Greece",
          flags: ["🇬🇷"],
          description: "Ancient city with iconic archaeological sites",
        },
        {
          title: "Madrid",
          country: "Spain",
          flags: ["🇪🇸"],
          description: "Elegant capital with world-renowned art museums",
        },
        {
          title: "Bruges",
          country: "Belgium",
          flags: ["🇧🇪"],
          description:
            "Medieval gem with picturesque canals and Gothic architecture",
        },
        {
          title: "Vienna",
          country: "Austria",
          flags: ["🇦🇹"],
          description: "Imperial splendor with outstanding art collections",
        },
        {
          title: "London",
          country: "UK",
          flags: ["🇬🇧"],
          description: "World-class museums and historical landmarks",
        },
        {
          title: "St. Petersburg",
          country: "Russia",
          flags: ["🇷🇺"],
          description: "Opulent palaces and the spectacular Hermitage Museum",
        },
        {
          title: "Amsterdam",
          country: "Netherlands",
          flags: ["🇳🇱"],
          description: "City of Rembrandt with remarkable art museums",
        },
        {
          title: "Istanbul",
          country: "Turkey",
          flags: ["🇹🇷"],
          description: "Byzantine and Ottoman heritage spanning two continents",
        },
        {
          title: "Krakow",
          country: "Poland",
          flags: ["🇵🇱"],
          description: "Preserved medieval core with rich Jewish heritage",
        },
      ],
    },
    {
      section: "Foodie Heaven",
      items: [
        {
          title: "Bologna",
          country: "Italy",
          flags: ["🇮🇹"],
          description:
            "Culinary capital of Italy known for pasta and rich cuisine",
        },
        {
          title: "San Sebastián",
          country: "Spain",
          flags: ["🇪🇸"],
          description:
            "Basque coastal city with the highest concentration of Michelin stars",
        },
        {
          title: "Lyon",
          country: "France",
          flags: ["🇫🇷"],
          description: "Gastronomic center of France with traditional bouchons",
        },
        {
          title: "Naples",
          country: "Italy",
          flags: ["🇮🇹"],
          description: "Birthplace of pizza with vibrant street food culture",
        },
        {
          title: "Istanbul",
          country: "Turkey",
          flags: ["🇹🇷"],
          description:
            "Transcontinental city with rich and diverse culinary traditions",
        },
        {
          title: "Copenhagen",
          country: "Denmark",
          flags: ["🇩🇰"],
          description: "Hub of New Nordic cuisine with innovative restaurants",
        },
        {
          title: "Bordeaux",
          country: "France",
          flags: ["🇫🇷"],
          description: "Wine capital with excellent regional cuisine",
        },
        {
          title: "Porto",
          country: "Portugal",
          flags: ["🇵🇹"],
          description: "Home of port wine with hearty Portuguese fare",
        },
        {
          title: "Barcelona",
          country: "Spain",
          flags: ["🇪🇸"],
          description: "Catalan cuisine paradise with vibrant food markets",
        },
        {
          title: "Palermo",
          country: "Italy",
          flags: ["🇮🇹"],
          description: "Sicilian street food and Arab-influenced cuisine",
        },
        {
          title: "Brussels",
          country: "Belgium",
          flags: ["🇧🇪"],
          description: "Chocolate, waffles, fries, and excellent beer culture",
        },
        {
          title: "Athens",
          country: "Greece",
          flags: ["🇬🇷"],
          description: "Mediterranean flavors with authentic mezze and seafood",
        },
      ],
    },
    // Other sections remain the same...
  ];

  // Combine all destination data
  const allDestinations = useMemo(() => {
    return [
      ...austriaCities,
      ...belgiumCities,
      ...czechRepublicCities,
      ...franceCities,
      ...germanyCities,
      ...hungaryCities,
      ...irelandCities,
      ...italyCities,
      ...netherlandsCities,
      ...polandCities,
      ...portugalCities,
      ...spainCities,
      ...switzerlandCities,
      ...ukCities,
    ];
  }, []);

  // Update trip duration when dates change
  useEffect(() => {
    const duration = calculateTripDuration(startDate, endDate);
    setTripDuration(duration);
  }, [startDate, endDate]);

  // Set initial city if one is entered
  useEffect(() => {
    if (startCity && selectedCities.length === 0) {
      const matchingCity = allDestinations.find(
        (city) => city.city.toLowerCase() === startCity.toLowerCase()
      );

      if (matchingCity) {
        const flag = countryFlags[matchingCity.country] || "🇪🇺";
        setSelectedCities([
          { name: matchingCity.city, country: matchingCity.country, flag },
        ]);
        setSelectedCountry(matchingCity.country);
      }
    }
  }, [startCity, selectedCities.length, allDestinations]);

  // View city guide - Modified to use router to navigate to city guide page
  const viewCityGuide = (city) => {
    console.log("Viewing city guide for:", city.title);
    
    // Convert city name to slug format for the URL
    const citySlug = city.title.toLowerCase().replace(/\s+/g, '-');
    
    // Navigate to the city guide page
    router.push(`/city-guides/${citySlug}`);
  };

  // Add city to trip
  const addCityToTrip = (city) => {
    const flag = countryFlags[city.country] || "🇪🇺";
    setSelectedCities([
      ...selectedCities,
      { name: city.title, country: city.country, flag },
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

    let categoryMap = {
      beaches: "Summer Destinations",
      cultural: "Art & History",
      food: "Foodie Heaven",
      nature: "Nature & Adventure",
      urban: "Trending Destinations",
      events: "Nightlife Hotspots",
    };

    const categoryName = categoryMap[selectedCategory] || selectedCategory;

    return (
      cityCategories.find((category) =>
        category.section.toLowerCase().includes(categoryName.toLowerCase())
      ) || { section: "No matches found", items: [] }
    );
  };

  const categoryPlaces = getCategoryPlaces();

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
                // Convert city name to slug format for the URL
                const citySlug = city.name.toLowerCase().replace(/\s+/g, '-');
                // Navigate to the city guide page
                router.push(`/city-guides/${citySlug}`);
              }}
            />
            {selectedCities.length > 0 ? (
              <TripRouteDisplay
                cities={selectedCities}
                tripDuration={tripDuration}
                viewCityGuide={(city) => {
                  // Convert city name to slug format for the URL
                  const citySlug = city.name.toLowerCase().replace(/\s+/g, '-');
                  // Navigate to the city guide page
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

        {/* Render the content based on the active tab */}
        {renderTabContent()}
      </main>
    </div>
  );
};

export default EuroTripPlanner;