'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getCityHeaderInfo, getCityDisplayName, getCityNickname, getCityDescription, getCityHeroImage } from "@/utils/cityDataUtils";
import { useMonthlyData } from '@/hooks/useMonthlyData';
import { useUIState } from '@/hooks/useUIState';
import { getCityPaths } from '@/lib/city-data';
import Hero from '@/components/common/Hero';
import SaveToTrips from '@/components/common/SaveToTrips';
import AuthButton from '@/components/auth/AuthButton';
import { 
  SkeletonOverview, 
  SkeletonMapLoader, 
  SkeletonTabContent 
} from '@/components/common/SkeletonLoader';

// Lazy imports for better code splitting
import {
  LazyCityOverview,
  LazyStartHere,
  LazyAttractionsList,
  LazyNeighborhoodsList,
  LazySeasonalActivities,
  LazyMonthlyGuideSection,
  LazyMapSection,
  LazyFoodDrinkGuide,
  LazyPhotoSpots,
  TabSuspenseWrapper,
  MapSuspenseWrapper,
  TabLoader,
  MapLoader
} from '@/components/common/LazyComponents';

// Central Europe fallback for cities with no coordinates
const DEFAULT_CENTER = [9.19, 48.66];

/**
 * Extract map center coordinates from city data.
 * Priority: overview.coordinates > average of attraction coords > fallback.
 */
function getCityCenter(cityData, cityName) {
  // 1. Try overview coordinates
  const ov = cityData?.overview;
  if (ov?.coordinates) {
    if (Array.isArray(ov.coordinates) && ov.coordinates.length >= 2) {
      return ov.coordinates; // [lon, lat]
    }
    if (ov.coordinates.latitude && ov.coordinates.longitude) {
      return [ov.coordinates.longitude, ov.coordinates.latitude];
    }
  }

  // 2. Try averaging attraction coordinates
  const sites = cityData?.attractions?.sites;
  if (sites && Array.isArray(sites)) {
    const withCoords = sites.filter(s => s.latitude && s.longitude);
    if (withCoords.length > 0) {
      const avgLon = withCoords.reduce((sum, s) => sum + s.longitude, 0) / withCoords.length;
      const avgLat = withCoords.reduce((sum, s) => sum + s.latitude, 0) / withCoords.length;
      return [avgLon, avgLat];
    }
  }

  // 3. Try generated city list data
  try {
    const { cityById } = require('@/generated/cityIndex');
    const match = cityById[cityName?.toLowerCase()];
    if (match?.longitude && match?.latitude) {
      return [match.longitude, match.latitude];
    }
  } catch { /* generated data not available yet */ }

  return DEFAULT_CENTER;
}

function CityPageClient({ cityData, cityName }) {
  const [activeTab, setActiveTab] = useState('starthere');
  const [isTabTransitioning, setIsTabTransitioning] = useState(false);
  const [componentLoaded, setComponentLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showBreadcrumb, setShowBreadcrumb] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isTabBarSticky, setIsTabBarSticky] = useState(false);
  const [slideDirection, setSlideDirection] = useState('right');
  const tabBarRef = useRef(null);
  const tabBarOriginalTop = useRef(null);
  
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

  const center = useMemo(
    () => getCityCenter(cityData, cityName),
    [cityData, cityName]
  );

  const tabs = useMemo(() => [
    { id: 'starthere', label: 'Start Here', icon: '🚀' },
    { id: 'overview', label: 'Best Time to Go', icon: '📆' },
    { id: 'map', label: 'Interactive Map', icon: '🗺️' },
    { id: 'monthly', label: monthlyDataLoading ? 'Monthly Guide...' : 'Monthly Guide', icon: monthlyDataLoading ? '⏳' : monthlyDataError ? '⚠️' : '📅' },
    { id: 'attractions', label: 'Experiences', icon: '🎯' },
    { id: 'food', label: 'Food + Drink', icon: '🍽️' },
    { id: 'photos', label: 'Photo Spots', icon: '📸' },
    { id: 'neighborhoods', label: 'Neighborhoods', icon: '🏘️' }
  ], [monthlyDataLoading, monthlyDataError]);

  useEffect(() => {
    setComponentLoaded(true);
  }, []);

  // Breadcrumb & sticky tab bar scroll behavior
  useEffect(() => {
    // Capture the original position of the tab bar on mount
    if (tabBarRef.current && tabBarOriginalTop.current === null) {
      tabBarOriginalTop.current = tabBarRef.current.getBoundingClientRect().top + window.scrollY;
    }
    
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const heroHeight = 400; // Approximate hero height
      
      // Breadcrumb visibility
      if (currentScrollY < heroHeight) {
        setShowBreadcrumb(true);
      } else if (currentScrollY < lastScrollY) {
        setShowBreadcrumb(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > heroHeight) {
        setShowBreadcrumb(false);
      }
      
      // Sticky tab bar - stick when scrolled past original position
      if (tabBarOriginalTop.current !== null) {
        const shouldBeSticky = currentScrollY > tabBarOriginalTop.current - 60; // 60px offset for header
        setIsTabBarSticky(shouldBeSticky);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const handleTabSwitch = useCallback((tabId) => {
    if (tabId === activeTab) return;
    
    // Determine slide direction based on tab order
    const currentIndex = tabs.findIndex(t => t.id === activeTab);
    const newIndex = tabs.findIndex(t => t.id === tabId);
    setSlideDirection(newIndex > currentIndex ? 'left' : 'right');
    
    setIsTabTransitioning(true);
    // Brief delay for exit animation
    setTimeout(() => {
      setActiveTab(tabId);
      // Small delay for enter animation
      setTimeout(() => setIsTabTransitioning(false), 50);
    }, 150);
  }, [activeTab, tabs]);

  // Print/PDF handler
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const preloadTab = (tabId) => {
    switch (tabId) {
      case 'starthere':
        import('@/components/city-guides/StartHere');
        break;
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
      case 'food':
        import('@/components/city-guides/FoodDrinkGuide');
        break;
      case 'photos':
        import('@/components/city-guides/PhotoSpots');
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

  const cityPaths = useMemo(() => getCityPaths(cityData?.country, cityName), [cityData?.country, cityName]);

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

  // Check for cities with incomplete data (e.g., data contamination was removed)
  const hasMinimalData = overview?.city_name || overview?.brief_description || safeAttractions.length > 0;
  if (!hasMinimalData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#f3f7ff] to-white">
        <header className="mx-auto max-w-7xl px-4 sm:px-6 py-4">
          <nav className="flex items-center gap-2 text-sm" aria-label="Breadcrumb">
            <Link href="/" className="text-gray-500 hover:text-blue-600 font-medium">Home</Link>
            <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            <Link href="/city-guides" className="text-gray-500 hover:text-blue-600 font-medium">City Guides</Link>
            <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            <span className="text-gray-900 font-semibold">{displayName}</span>
          </nav>
        </header>
        <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
          <div className="text-6xl mb-6">🏗️</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">{displayName} Guide Coming Soon</h1>
          <p className="text-gray-600 text-lg max-w-md mb-8">
            We&apos;re working on a comprehensive travel guide for {displayName}{country !== 'Unknown' ? `, ${country}` : ''}. Check back soon for detailed recommendations, seasonal advice, and more.
          </p>
          <Link
            href="/city-guides"
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-full hover:bg-blue-700 transition-colors"
          >
            Browse Available Guides
          </Link>
        </div>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'starthere':
        return (
          <Suspense fallback={<SkeletonOverview />}>
            <LazyStartHere cityName={cityName} cityData={cityData} />
          </Suspense>
        );
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
              experiencesUrl={cityPaths.experiences}
              limit={Infinity}
              forceList
            />
          </Suspense>
        );
      case 'food':
        return (
          <Suspense fallback={<SkeletonTabContent />}>
            <LazyFoodDrinkGuide cityName={cityName} cityData={cityData} />
          </Suspense>
        );
      case 'photos':
        return (
          <Suspense fallback={<SkeletonTabContent />}>
            <LazyPhotoSpots cityName={cityName} cityData={cityData} />
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
      {/* Header - fixed, with gradient backdrop for seamless hero blend */}
      <header className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${showBreadcrumb ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
        {/* Gradient backdrop that blends into the hero */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/35 to-transparent backdrop-blur-sm pointer-events-none border-b border-white/10" />
        
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-4 flex items-center justify-between">
          {/* Left: Breadcrumb navigation */}
          <nav className="flex items-center gap-2 text-sm" aria-label="Breadcrumb">
            <Link 
              href="/" 
              className="text-white/70 hover:text-white transition-colors font-medium"
            >
              Home
            </Link>
            <svg className="w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            <Link 
              href="/city-guides" 
              className="text-white/70 hover:text-white transition-colors font-medium"
            >
              City Guides
            </Link>
            <svg className="w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-white font-semibold">{displayName}</span>
          </nav>
          
          {/* Right: Auth button */}
          <div className="flex items-center">
            <AuthButton />
          </div>
        </div>
      </header>

      {/* Hero */}
      <Hero
        cityName={cityName && typeof cityName === 'string' ? cityName.toLowerCase() : undefined}
        country={cityData?.country}
        backgroundAlt={`${cityData?.displayName || cityName || 'City'} cityscape`}
        title={getCityDisplayName(cityData, cityName) || cityName || 'City'}
        subtitle={getCityHeaderInfo(cityData)?.subtitle || "A City to Explore"}
        description={description}
        actionElement={<SaveToTrips cityName={cityName} cityData={cityData} showLabel={false} variant="hero" />}
      />

      {/* Plan Trip CTA */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 -mt-6 mb-4 relative z-20">
        <Link
          href={`/plan/${cityName?.toLowerCase()}`}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold rounded-full hover:from-indigo-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Plan Your Trip to {displayName}
        </Link>
      </div>

      {/* Tabs + Actions - Sticky when scrolled */}
      <div 
        ref={tabBarRef}
        className={`mx-auto max-w-7xl px-3 sm:px-4 mt-2 sm:mt-4 transition-all duration-300 ${
          isTabBarSticky 
            ? 'fixed top-0 left-0 right-0 z-30 mt-0 pt-3 pb-2 bg-white/90 backdrop-blur-lg shadow-lg border-b border-gray-200' 
            : ''
        }`}
      >
        <div className={`bg-white/95 rounded-2xl shadow-sm border border-gray-100 ${isTabBarSticky ? 'max-w-7xl mx-auto' : ''}`}>
          <div className="flex items-center justify-between gap-3 p-3">
            {/* Tab buttons */}
            <div className="flex overflow-x-auto gap-2 scrollbar-hide tab-navigation snap-x flex-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabSwitch(tab.id)}
                  onMouseEnter={() => preloadTab(tab.id)}
                  aria-label={`Switch to ${tab.label} tab`}
                  aria-current={activeTab === tab.id ? 'page' : undefined}
                  className={`snap-start px-3.5 sm:px-4.5 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-100'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 active:bg-gray-100'
                  }`}
                >
                  <span className="text-base sm:text-lg opacity-90">{tab.icon}</span>
                  <span className="hidden xs:inline sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Spacer when tab bar is sticky */}
      {isTabBarSticky && <div className="h-24" />}

      {/* Content */}
      <div className="mx-auto max-w-7xl px-3 sm:px-4 py-4 sm:py-6 overflow-hidden">
        <div 
          className={`transition-all duration-200 ease-out ${
            isTabTransitioning 
              ? `opacity-0 ${slideDirection === 'left' ? '-translate-x-4' : 'translate-x-4'}` 
              : 'opacity-100 translate-x-0'
          }`}
        >
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