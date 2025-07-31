'use client';

import React, { useState } from 'react';
import Link from 'next/link';
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
    { id: 'overview', label: 'Overview', icon: '🏛️' },
    { id: 'map', label: 'Interactive Map', icon: '🗺️' },
    { id: 'monthly', label: 'Monthly Guide', icon: '📅' },
    { id: 'attractions', label: 'Attractions', icon: '🎯' },
    { id: 'neighborhoods', label: 'Neighborhoods', icon: '🏘️' },
    { id: 'transport', label: 'Getting Around', icon: '🚇' },
    { id: 'things-to-do', label: 'Things to Do', icon: '🎭' },
    { id: 'things-to-see', label: 'Things to See', icon: '👀' }
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
        return <MonthlyGuideSection 
          monthlyData={safeMonthlyEvents} 
          cityName={cityName} 
          city={cityName}
          visitCalendar={visitCalendar}
          countryName={country}
        />;
      case 'attractions':
        return <AttractionsList attractions={safeAttractions} categories={safeCategories} cityName={cityName} monthlyData={safeMonthlyEvents} />;
      case 'neighborhoods':
        return <NeighborhoodsList neighborhoods={safeNeighborhoods} cityName={cityName} />;
      case 'transport':
        return <TransportConnections connections={connections} cityName={cityName} />;
      case 'things-to-do':
        return <AttractionsList attractions={safeAttractions} categories={safeCategories} cityName={cityName} monthlyData={safeMonthlyEvents} />;
      case 'things-to-see':
        return <AttractionsList attractions={safeAttractions} categories={safeCategories} cityName={cityName} monthlyData={safeMonthlyEvents} />;
      default:
        return <CityOverview overview={overview} cityName={cityName} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced Hero Header */}
      <header className="relative bg-gradient-to-r from-blue-900 via-purple-900 to-indigo-900 text-white">
        <div className="absolute inset-0 bg-black/30"></div>
        <div className="relative container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            {/* Breadcrumb */}
            <nav className="mb-4">
              <ol className="flex items-center space-x-2 text-sm opacity-80">
                <li><Link href="/city-guides" className="hover:underline">City Guides</Link></li>
                <li>/</li>
                <li><Link href={`/city-guides?country=${country}`} className="hover:underline">{country}</Link></li>
                <li>/</li>
                <li className="font-medium">{displayName}</li>
              </ol>
            </nav>

            {/* Main Header Content */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-4">
                  <div className="text-5xl mr-4">✨</div>
                  <div>
                    <h1 className="text-4xl md:text-6xl font-bold mb-2">{displayName}</h1>
                    {nickname && (
                      <p className="text-xl md:text-2xl opacity-90">{nickname}</p>
                    )}
                  </div>
                </div>

              </div>
              

            </div>
          </div>
        </div>
      </header>

      {/* Enhanced Navigation Tabs */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex space-x-1 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-4 border-b-2 font-medium text-sm whitespace-nowrap transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {renderTabContent()}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto text-center">
            <h3 className="text-xl font-semibold mb-2">Explore More of {country}</h3>
            <p className="text-gray-400 mb-4">
              Discover other amazing cities and destinations in {country}
            </p>
            <Link 
              href="/city-guides" 
              className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
            >
              Browse All Cities
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default CityPageClient; 