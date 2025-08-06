'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { getCityHeaderInfo, getCityDisplayName, getCityNickname, getCityDescription } from "@/utils/cityDataUtils";
import { preloadComponent } from '@/utils/chunkOptimization';
import { useMonthlyData } from '@/hooks/useMonthlyData';
import { useUIState } from '@/hooks/useUIState';

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
  
  // Use optimized hooks for monthly data and UI state
  const { monthlyData, isLoading: monthlyDataLoading, error: monthlyDataError } = useMonthlyData(cityData?.country || 'Unknown', cityName);
  const { actions: uiActions } = useUIState();

  // Extract data with defaults
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

  // Get dynamic header information
  const headerInfo = getCityHeaderInfo(cityData);
  const displayName = getCityDisplayName(cityName, overview);
  const nickname = getCityNickname(overview);
  const description = getCityDescription(overview, cityName);

  // Memoize safe data processing to prevent re-renders
  const safeAttractions = useMemo(() => 
    (attractions?.sites && Array.isArray(attractions.sites)) 
      ? attractions.sites 
      : [], [attractions]);

  const safeCategories = useMemo(() => 
    safeAttractions
      .map(site => site.category)
      .filter((value, index, self) => value && self.indexOf(value) === index), 
    [safeAttractions]);

  const safeNeighborhoods = useMemo(() => 
    (neighborhoods?.neighborhoods && Array.isArray(neighborhoods.neighborhoods))
      ? neighborhoods.neighborhoods
      : [], [neighborhoods]);
                             
  const safeMonthlyEvents = useMemo(() => 
    monthlyData && typeof monthlyData === 'object' 
      ? monthlyData 
      : {}, [monthlyData]); 

  const center = CITY_COORDINATES[cityName.toLowerCase()] || DEFAULT_COORDINATES.default;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '🏛️' },
    { id: 'map', label: 'Interactive Map', icon: '🗺️' },
    { 
      id: 'monthly', 
      label: monthlyDataLoading ? 'Monthly Guide...' : 'Monthly Guide', 
      icon: monthlyDataLoading ? '⏳' : monthlyDataError ? '⚠️' : '📅' 
    },
    { id: 'attractions', label: 'Experiences', icon: '🎯' },
    { id: 'neighborhoods', label: 'Neighborhoods', icon: '🏘️' },
    { id: 'transport', label: 'Getting Around', icon: '🚇' }
  ];

  // Load component and preload components on mount
  useEffect(() => {
    setComponentLoaded(true);
    
    // Aggressively preload all tab components immediately
    const preloadAllComponents = async () => {
      try {
        // Preload all components in parallel for faster switching
        await Promise.allSettled([
          import('@/components/city-guides/CityOverview'),
          import('@/components/city-guides/AttractionsList'),
          import('@/components/city-guides/NeighborhoodsList'),
          import('@/components/city-guides/MonthlyGuideSection'),
          import('@/components/city-guides/TransportConnections'),
          // Map section will still use MapSuspenseWrapper for proper loading
          import('@/components/city-guides/MapSection')
        ]);
      } catch (error) {
        // Silently handle preload errors - components will load when needed
        console.log('Some components preloaded with errors, will load on demand');
      }
    };

    preloadAllComponents();
  }, []);

  // Handle tab switching - simplified since components are preloaded
  const handleTabSwitch = (tabId) => {
    setActiveTab(tabId);
  };

  // Memoize heavy data processing
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
            <LazyCityOverview 
              overview={overview} 
              cityName={cityName} 
              visitCalendar={visitCalendar} 
              monthlyData={memoizedData.safeMonthlyEvents} 
            />
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
                <p className="text-gray-600 mb-4">
                  We couldn&apos;t load the monthly guide for {cityName} at this time.
                </p>
                <p className="text-sm text-gray-500">
                  You can still explore other sections like attractions and neighborhoods.
                </p>
              </div>
            </div>
          );
        }
        
        return (
          <Suspense fallback={<div className="animate-pulse h-32 bg-gray-100 rounded"></div>}>
            <LazyMonthlyGuideSection 
              monthlyData={memoizedData.safeMonthlyEvents} 
              cityName={cityName} 
              city={cityName}
              visitCalendar={visitCalendar}
              countryName={country}
            />
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
            />
          </Suspense>
        );
        
      case 'neighborhoods':
        return (
          <Suspense fallback={<div className="animate-pulse h-32 bg-gray-100 rounded"></div>}>
            <LazyNeighborhoodsList 
              neighborhoods={memoizedData.safeNeighborhoods} 
              cityName={cityName} 
            />
          </Suspense>
        );
        
      case 'transport':
        return (
          <Suspense fallback={<div className="animate-pulse h-32 bg-gray-100 rounded"></div>}>
            <LazyTransportConnections 
              connections={connections} 
              cityName={cityName} 
            />
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

  // Show immediate loading state if component isn't ready
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

            {/* Main Header Content - Removed for space saving */}
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
                onClick={() => handleTabSwitch(tab.id)}
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