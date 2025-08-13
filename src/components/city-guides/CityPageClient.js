'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getCityHeaderInfo, getCityDisplayName, getCityNickname, getCityDescription } from "@/utils/cityDataUtils";
import { useMonthlyData } from '@/hooks/useMonthlyData';
import { useUIState } from '@/hooks/useUIState';
import Hero from '@/components/common/Hero';

// Lazy imports for better code splitting
import {
  LazyCityOverview,
  LazyAttractionsList,
  LazyNeighborhoodsList,
  LazyCulinaryGuide,
  LazyTransportConnections,
  LazySeasonalActivities,
  LazyMonthlyGuideSection,
  LazyMapSection,
  TabSuspenseWrapper,
  MapSuspenseWrapper,
  TabLoader,
  MapLoader
} from '@/components/common/LazyComponents';

// Default coordinates for various European regions
const DEFAULT_COORDINATES = {
  France: [2.3522, 48.8566],
  Nice: [7.262, 43.7102],
  Italy: [12.4964, 41.9028],
  Germany: [13.405, 52.52],
  Spain: [-3.7038, 40.4168],
  Netherlands: [4.9041, 52.3676],
  Belgium: [4.3517, 50.8503],
  Austria: [16.3738, 48.2082],
  Denmark: [12.5683, 55.6761],
  Ireland: [-6.2603, 53.3498],
  default: [9.19, 48.66],
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
  brno: [16.6068, 49.1951],
  milan: [9.19, 45.4642],
  florence: [11.2558, 43.7696],
  salzburg: [13.055, 47.8095],
  innsbruck: [11.4041, 47.2692],
  antwerp: [4.4024, 51.2194],
  seville: [-5.9845, 37.3891],
};

function CityPageClient({ cityData, cityName }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [componentLoaded, setComponentLoaded] = useState(false);
  const { monthlyData, isLoading: monthlyDataLoading, error: monthlyDataError, refetch: loadAllMonthly } = useMonthlyData(
    cityData?.country || 'Unknown',
    cityName,
    { initialData: cityData?.monthlyEvents || {}, autoLoad: false }
  );
  const { actions: uiActions } = useUIState();

  const {
    overview = {},
    attractions = null,
    neighborhoods = null,
    culinaryGuide = {},
    connections = {},
    seasonalActivities = {},
    summary = {},
    visitCalendar = {},
    country = 'Unknown'
  } = cityData || {};

  const headerInfo = getCityHeaderInfo(cityData);
  const displayName = getCityDisplayName(cityName, overview);
  const nickname = getCityNickname(overview);
  const description = getCityDescription(overview, cityName);

  const safeAttractions = useMemo(() =>
    (attractions?.sites && Array.isArray(attractions.sites)) ? attractions.sites : [],
    [attractions]
  );

  const safeCategories = useMemo(() =>
    safeAttractions
      .map(site => site.category)
      .filter((value, index, self) => value && self.indexOf(value) === index),
    [safeAttractions]
  );

  const safeNeighborhoods = useMemo(() =>
    (neighborhoods?.neighborhoods && Array.isArray(neighborhoods.neighborhoods)) ? neighborhoods.neighborhoods : [],
    [neighborhoods]
  );

  const safeMonthlyEvents = useMemo(() =>
    monthlyData && typeof monthlyData === 'object' ? monthlyData : {},
    [monthlyData]
  );

  const center = CITY_COORDINATES[cityName.toLowerCase()] || DEFAULT_COORDINATES.default;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '🏛️' },
    { id: 'map', label: 'Interactive Map', icon: '🗺️' },
    { id: 'monthly', label: monthlyDataLoading ? 'Monthly Guide...' : 'Monthly Guide', icon: monthlyDataLoading ? '⏳' : monthlyDataError ? '⚠️' : '📅' },
    { id: 'attractions', label: 'Experiences', icon: '🎯' },
    { id: 'neighborhoods', label: 'Neighborhoods', icon: '🏘️' },
    { id: 'transport', label: 'Getting Around', icon: '🚇' }
  ];

  useEffect(() => {
    setComponentLoaded(true);
  }, []);

  const handleTabSwitch = (tabId) => setActiveTab(tabId);

  const preloadTab = (tabId) => {
    switch (tabId) {
      case 'overview':
        import('@/components/city-guides/CityOverview');
        break;
      case 'map':
        import('@/components/city-guides/MapSection');
        break;
      case 'monthly':
        import('@/components/city-guides/MonthlyGuideSection');
        // Hint data fetch early on hover
        loadAllMonthly();
        break;
      case 'attractions':
        import('@/components/city-guides/AttractionsList');
        break;
      case 'neighborhoods':
        import('@/components/city-guides/NeighborhoodsList');
        break;
      case 'transport':
        import('@/components/city-guides/TransportConnections');
        break;
      default:
        break;
    }
  };

  // On first open of Monthly tab, fetch full monthly index (if not already loaded)
  useEffect(() => {
    if (activeTab === 'monthly') {
      loadAllMonthly();
    }
  }, [activeTab, loadAllMonthly]);

  const memoizedData = useMemo(() => ({
    safeAttractions,
    safeCategories,
    safeNeighborhoods,
    safeMonthlyEvents
  }), [safeAttractions, safeCategories, safeNeighborhoods, safeMonthlyEvents]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <Suspense fallback={<div className="animate-pulse h-32 bg-gray-100 rounded"></div>}>
            <LazyCityOverview overview={overview} cityName={cityName} visitCalendar={visitCalendar} monthlyData={memoizedData.safeMonthlyEvents} hideIntroHero={cityName?.toLowerCase() === 'paris'} />
          </Suspense>
        );
      case 'map':
        return (
          <MapSuspenseWrapper>
            <LazyMapSection
              attractions={memoizedData.safeAttractions}
              categories={memoizedData.safeCategories}
              cityName={cityName}
              center={center}
              zoom={12}
              title={`${cityName} Interactive Map`}
              subtitle="Explore attractions, neighborhoods, and more"
            />
          </MapSuspenseWrapper>
        );
      case 'monthly':
        if (monthlyDataLoading) {
          return (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                <p className="text-gray-600">Loading monthly guide for {cityName}...</p>
              </div>
            </div>
          );
        }
        if (monthlyDataError) {
          return (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="text-yellow-600 text-4xl mb-4">⚠️</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Monthly Guide Unavailable</h3>
                <p className="text-gray-600 mb-4">We couldn&apos;t load the monthly guide for {cityName} at this time.</p>
                <p className="text-sm text-gray-500">You can still explore other sections like attractions and neighborhoods.</p>
              </div>
            </div>
          );
        }
        return (
          <Suspense fallback={<div className="animate-pulse h-32 bg-gray-100 rounded"></div>}>
            <LazyMonthlyGuideSection monthlyData={memoizedData.safeMonthlyEvents} cityName={cityName} city={cityName} visitCalendar={visitCalendar} countryName={country} />
          </Suspense>
        );
      case 'attractions':
        return (
          <Suspense fallback={<div className="animate-pulse h-32 bg-gray-100 rounded"></div>}>
            <LazyAttractionsList
              attractions={memoizedData.safeAttractions}
              categories={memoizedData.safeCategories}
              cityName={cityName}
              monthlyData={memoizedData.safeMonthlyEvents}
              experiencesUrl={`/data/France/${cityName.toLowerCase()}/${cityName.toLowerCase()}-experiences.json`}
              limit={50}
              forceList
            />
          </Suspense>
        );
      case 'neighborhoods':
        return (
          <Suspense fallback={<div className="animate-pulse h-32 bg-gray-100 rounded"></div>}>
            <LazyNeighborhoodsList neighborhoods={memoizedData.safeNeighborhoods} cityName={cityName} />
          </Suspense>
        );
      case 'transport':
        return (
          <Suspense fallback={<div className="animate-pulse h-32 bg-gray-100 rounded"></div>}>
            <LazyTransportConnections connections={connections} cityName={cityName} />
          </Suspense>
        );
      default:
        return (
          <Suspense fallback={<div className="animate-pulse h-32 bg-gray-100 rounded"></div>}>
            <LazyCityOverview overview={overview} cityName={cityName} />
          </Suspense>
        );
    }
  };

  if (!componentLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Loading {displayName}</h2>
          <p className="text-gray-600">Preparing your city guide...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f3f7ff] to-white">
      {/* Hero */}
      {cityName?.toLowerCase() === 'paris' ? (
        <Hero
          backgroundImageSrc="/images/optimized/paris-hero.jpeg"
          backgroundAlt="Paris skyline with Eiffel Tower"
          chipText="Discover the Timeless Elegance"
          title="Paris"
          subtitle="City of Light & Love"
          description={description}
          primaryCta={{ label: 'Plan Your Journey', disabled: true, variant: 'solid' }}
          secondaryCta={{ label: 'Explore Seasonal Picks', onClick: () => { setActiveTab('monthly'); loadAllMonthly(); }, variant: 'outline' }}
        />
      ) : (
        <div className="px-6 pt-10 pb-6 text-center">
          <div className="mx-auto max-w-6xl">
            <span className="badge bg-white/80">City Guide</span>
            <h1 className="mt-3 text-4xl md:text-5xl font-extrabold tracking-tight text-zinc-900">{displayName}</h1>
            <p className="mt-3 text-base md:text-lg text-zinc-700 max-w-3xl mx-auto">{description}</p>
            <div className="mt-2 text-xs text-zinc-500">{country}</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mx-auto max-w-6xl px-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="flex overflow-x-auto gap-1 p-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabSwitch(tab.id)}
                onMouseEnter={() => preloadTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                <span className="mr-1">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-6 py-6">
        {renderTabContent()}
      </div>

      {/* Footer CTA */}
      <div className="mx-auto max-w-6xl px-6 pb-12">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Explore more of {country}</h3>
          <p className="text-gray-600 mb-3 text-sm">Browse other amazing cities and destinations.</p>
          <Link href="/city-guides" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm">Browse All Cities</Link>
        </div>
      </div>
    </div>
  );
}

export default CityPageClient; 