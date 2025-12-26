'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getCityHeaderInfo, getCityDisplayName, getCityNickname, getCityDescription, getCityHeroImage } from "@/utils/cityDataUtils";
import { useMonthlyData } from '@/hooks/useMonthlyData';
import { useUIState } from '@/hooks/useUIState';
import Hero from '@/components/common/Hero';
import SaveToTrips from '@/components/common/SaveToTrips';
import { 
  SkeletonOverview, 
  SkeletonMapLoader, 
  SkeletonTabContent 
} from '@/components/common/SkeletonLoader';

// Lazy imports for better code splitting
import {
  LazyCityOverview,
  LazyAttractionsList,
  LazyNeighborhoodsList,
  LazyCulinaryGuide,
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
  const [isTabTransitioning, setIsTabTransitioning] = useState(false);
  const [componentLoaded, setComponentLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileActions, setShowMobileActions] = useState(false);
  const [showBreadcrumb, setShowBreadcrumb] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  
  const { monthlyData, isLoading: monthlyDataLoading, error: monthlyDataError, refetch: loadAllMonthly } = useMonthlyData(
    cityData?.country || 'Unknown',
    cityName || 'unknown',
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
  const displayName = getCityDisplayName(cityData, cityName);
  const nickname = getCityNickname(cityData);
  const description = getCityDescription(cityData, cityName);

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

  const center = cityName && typeof cityName === 'string' 
    ? CITY_COORDINATES[cityName.toLowerCase()] || DEFAULT_COORDINATES.default
    : DEFAULT_COORDINATES.default;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '🏛️' },
    { id: 'map', label: 'Interactive Map', icon: '🗺️' },
    { id: 'monthly', label: monthlyDataLoading ? 'Monthly Guide...' : 'Monthly Guide', icon: monthlyDataLoading ? '⏳' : monthlyDataError ? '⚠️' : '📅' },
    { id: 'attractions', label: 'Experiences', icon: '🎯' },
    { id: 'neighborhoods', label: 'Neighborhoods', icon: '🏘️' }
  ];

  useEffect(() => {
    setComponentLoaded(true);
  }, []);

  // Breadcrumb scroll behavior - show on scroll up, hide on scroll down
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const heroHeight = 400; // Approximate hero height
      
      if (currentScrollY < heroHeight) {
        // Always show breadcrumb when in hero area
        setShowBreadcrumb(true);
      } else if (currentScrollY < lastScrollY) {
        // Scrolling up - show breadcrumb
        setShowBreadcrumb(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > heroHeight) {
        // Scrolling down past hero - hide breadcrumb
        setShowBreadcrumb(false);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const handleTabSwitch = (tabId) => {
    if (tabId === activeTab) return;
    setIsTabTransitioning(true);
    // Brief delay to show loading state
    setTimeout(() => {
      setActiveTab(tabId);
      setIsTabTransitioning(false);
    }, 150);
  };

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

  // Safety check - ensure cityName is a string
  if (!cityName || typeof cityName !== 'string') {
    console.warn('CityPageClient: cityName is not a valid string:', cityName);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">City Not Found</h2>
          <p className="text-gray-600">The requested city could not be loaded.</p>
        </div>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <Suspense fallback={<SkeletonOverview />}>
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
              title={`${displayName} Interactive Map`}
              subtitle="Explore attractions, neighborhoods, and more"
            />
          </MapSuspenseWrapper>
        );
      case 'monthly':
        if (monthlyDataLoading) {
          return <SkeletonTabContent />;
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
          <Suspense fallback={<SkeletonTabContent />}>
            <LazyMonthlyGuideSection monthlyData={memoizedData.safeMonthlyEvents} cityName={cityName} city={cityName} visitCalendar={visitCalendar} countryName={country} />
          </Suspense>
        );
      case 'attractions':
        return (
          <Suspense fallback={<SkeletonTabContent />}>
            <LazyAttractionsList
              attractions={memoizedData.safeAttractions}
              categories={memoizedData.safeCategories}
              cityName={cityName}
              monthlyData={memoizedData.safeMonthlyEvents}
              experiencesUrl={`/data/France/${cityName && typeof cityName === 'string' ? cityName.toLowerCase() : 'unknown'}/${cityName && typeof cityName === 'string' ? cityName.toLowerCase() : 'unknown'}-experiences.json`}
              limit={Infinity}
              forceList
            />
          </Suspense>
        );
      case 'neighborhoods':
        return (
          <Suspense fallback={<SkeletonTabContent />}>
            <LazyNeighborhoodsList neighborhoods={memoizedData.safeNeighborhoods} cityName={cityName} />
          </Suspense>
        );
      default:
        return (
          <Suspense fallback={<SkeletonOverview />}>
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
      {/* Top bar - fixed, transparent over hero with breadcrumb (shows/hides on scroll) */}
      <div className={`fixed top-0 left-0 right-0 z-40 transition-transform duration-300 ${showBreadcrumb ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3">
          <Link 
            href="/city-guides" 
            className="inline-flex items-center gap-2 text-sm text-white/90 hover:text-white transition-colors drop-shadow-md"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span>All City Guides</span>
          </Link>
        </div>
      </div>

      {/* Hero */}
      <Hero
        cityName={cityName && typeof cityName === 'string' ? cityName.toLowerCase() : undefined}
        country={cityData?.country}
        backgroundAlt={`${cityData?.displayName || cityName || 'City'} cityscape`}
        title={getCityDisplayName(cityData, cityName) || cityName || 'City'}
        subtitle={getCityHeaderInfo(cityData)?.subtitle || "A City to Explore"}
        description={description}
      />

      {/* Tabs + Actions */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 mt-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between gap-2 p-2">
            {/* Tab buttons */}
            <div className="flex overflow-x-auto gap-1 scrollbar-hide tab-navigation snap-x">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabSwitch(tab.id)}
                  onMouseEnter={() => preloadTab(tab.id)}
                  aria-label={`Switch to ${tab.label} tab`}
                  aria-current={activeTab === tab.id ? 'page' : undefined}
                  className={`snap-start px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap flex items-center gap-1 ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 active:bg-gray-100'
                  }`}
                >
                  <span className="text-base sm:text-lg">{tab.icon}</span>
                  <span className="hidden xs:inline sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>
            
            {/* Action buttons - desktop: show all, mobile: overflow menu */}
            <div className="flex items-center gap-1 flex-shrink-0 border-l border-gray-200 pl-2 ml-1">
              {/* Desktop: show all buttons */}
              <div className="hidden sm:flex items-center gap-1">
                <SaveToTrips cityName={cityName} cityData={cityData} showLabel={false} />
              </div>
              
              {/* Mobile: overflow menu */}
              <div className="sm:hidden relative">
                <button
                  onClick={() => setShowMobileActions(!showMobileActions)}
                  className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600"
                  aria-label="More actions"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
                
                {showMobileActions && (
                  <>
                    {/* Backdrop */}
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowMobileActions(false)}
                    />
                    {/* Dropdown */}
                    <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-lg border border-gray-200 py-2 min-w-[180px]">
                      <div className="px-3 py-2">
                        <SaveToTrips cityName={cityName} cityData={cityData} showLabel={true} />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 sm:py-6">
        <div className={`transition-opacity duration-150 ${isTabTransitioning ? 'opacity-50' : 'opacity-100'}`}>
          {isTabTransitioning ? (
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-gray-200 rounded w-48"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="bg-gray-100 rounded-xl h-64"></div>
                ))}
              </div>
            </div>
          ) : (
            renderTabContent()
          )}
        </div>
      </div>

    </div>
  );
}

export default CityPageClient; 