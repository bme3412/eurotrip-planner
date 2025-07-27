'use client';

import React, { useState } from 'react';
import CityOverview from "./CityOverview";
import AttractionsList from "./AttractionsList";
import NeighborhoodsList from "./NeighborhoodsList";
import CulinaryGuide from "./CulinaryGuide";
import TransportConnections from "./TransportConnections";
import SeasonalActivities from "./SeasonalActivities";
import CityVisitSection from "./CityVisitSection";
import MonthlyGuideSection from "./MonthlyGuideSection";
import CityMapLoader from "./CityMapLoader";
import { getCityHeaderInfo, getCityDisplayName, getCityNickname, getCityDescription } from "@/utils/cityDataUtils";

// Default coordinates for various European regions
const DEFAULT_COORDINATES = {
  France: [2.3522, 48.8566], // Paris
  Nice: [7.262, 43.7102], // Nice, France
  Italy: [12.4964, 41.9028], // Rome
  Germany: [13.405, 52.52], // Berlin
  Spain: [-3.7038, 40.4168], // Madrid
  Netherlands: [4.9041, 52.3676], // Amsterdam
  Belgium: [4.3517, 50.8503], // Brussels
  Austria: [16.3738, 48.2082], // Vienna
  Denmark: [12.5683, 55.6761], // Copenhagen
  Ireland: [-6.2603, 53.3498], // Dublin
  default: [9.19, 48.66], // Central Europe
};

// Add city-specific coordinates using lowercase keys
const CITY_COORDINATES = {
  paris: [2.3522, 48.8566],
  nice: [7.262, 43.7102],
  rome: [12.4964, 41.9028],
  berlin: [13.405, 52.52],
  madrid: [-3.7038, 40.4168],
  amsterdam: [4.9041, 52.3676],
  brussels: [4.3517, 50.8503],
  vienna: [16.3738, 48.2082],
  copenhagen: [12.5683, 55.6761],
  dublin: [-6.2603, 53.3498],
  barcelona: [2.1734, 41.3851],
  munich: [11.582, 48.1351],
  prague: [14.4378, 50.0755],
  milan: [9.19, 45.4642],
  florence: [11.2558, 43.7696],
  salzburg: [13.055, 47.8095],
  innsbruck: [11.4041, 47.2692],
  antwerp: [4.4024, 51.2194],
  seville: [-5.9845, 37.3891],
};

function CityPageClient({ cityData, cityName }) {
  const [activeTab, setActiveTab] = useState('overview');

  // Extract data with defaults
  const { 
    overview = {},
    attractions = null,
    neighborhoods = null,
    culinaryGuide = {},
    connections = {},
    seasonalActivities = {},
    monthlyEvents: rawMonthlyEvents = {}, 
    summary = {},
    visitCalendar = {},
    country = 'Unknown'
  } = cityData || {};

  // Get dynamic header information
  const headerInfo = getCityHeaderInfo(cityData);
  const displayName = getCityDisplayName(cityName, overview);
  const nickname = getCityNickname(overview);
  const description = getCityDescription(overview, cityName);

  // Process data safely
  const safeAttractions = (attractions?.sites && Array.isArray(attractions.sites)) 
                          ? attractions.sites 
                          : [];
  const safeCategories = safeAttractions
      .map(site => site.category)
      .filter((value, index, self) => value && self.indexOf(value) === index);

  const safeNeighborhoods = (neighborhoods?.neighborhoods && Array.isArray(neighborhoods.neighborhoods))
                             ? neighborhoods.neighborhoods
                             : [];
                             
  const safeMonthlyEvents = rawMonthlyEvents !== null && typeof rawMonthlyEvents === 'object' 
                           ? rawMonthlyEvents 
                           : {}; 

  const center = CITY_COORDINATES[cityName.toLowerCase()] || DEFAULT_COORDINATES.default;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'map', label: 'Map' },
    { id: 'monthly', label: 'Monthly Guide' },
    { id: 'visit', label: 'When to Visit' },
    { id: 'attractions', label: 'Attractions' },
    { id: 'neighborhoods', label: 'Neighborhoods' },
    { id: 'food', label: 'Food & Drink' },
    { id: 'transport', label: 'Transport' },
    { id: 'seasonal', label: 'Seasonal' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <CityOverview overview={overview} cityName={cityName} />;
      case 'map':
        return (
          <CityMapLoader
            attractions={safeAttractions}
            categories={safeCategories} 
            cityName={cityName}
            center={center}
            zoom={12} 
            title={`${cityName} Interactive Map`}
            subtitle="Explore attractions, neighborhoods, and more"
          />
        );
      case 'monthly':
        return <MonthlyGuideSection monthlyData={safeMonthlyEvents} cityName={cityName} city={cityName} />;
      case 'visit':
        return <CityVisitSection summary={summary} cityName={cityName} countryName={country} monthlyData={visitCalendar} />;
      case 'attractions':
        return <AttractionsList attractions={safeAttractions} categories={safeCategories} cityName={cityName} />;
      case 'neighborhoods':
        return <NeighborhoodsList neighborhoods={safeNeighborhoods} cityName={cityName} />;
      case 'food':
        return <CulinaryGuide guide={culinaryGuide} cityName={cityName} />;
      case 'transport':
        return <TransportConnections connections={connections} cityName={cityName} />;
      case 'seasonal':
        return <SeasonalActivities activities={seasonalActivities} cityName={cityName} />;
      default:
        return <CityOverview overview={overview} cityName={cityName} />;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Top Header Bar */}
      <header className="bg-blue-900 text-white py-3">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <div className="text-lg font-semibold">
              {country} {displayName}
            </div>
            <div className="flex gap-6 text-sm">
              <span>Best time: {headerInfo.bestTime}</span>
              <span>Avg. visit: {headerInfo.avgVisit}</span>
              <span>Currency: {headerInfo.currency}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {renderTabContent()}
      </main>
    </div>
  );
}

export default CityPageClient; 