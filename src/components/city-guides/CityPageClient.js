'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback, useTransition, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getCityHeaderInfo, getCityDisplayName, getCityNickname, getCityDescription, getCityHeroImage } from "@/utils/cityDataUtils";
import { useMonthlyData } from '@/hooks/useMonthlyData';
import { useUIState } from '@/hooks/useUIState';
import { getCityIndex, getCitySection } from '@/lib/city-data';
import { legacyCountryFolder } from '@/lib/city-data/resolver';
import Hero from '@/components/common/Hero';
import SaveToTrips from '@/components/common/SaveToTrips';
import AuthButton from '@/components/auth/AuthButton';
import BookActivities from '@/components/city-guides/BookActivities';
import CityShortlistBar from '@/components/city-guides/CityShortlistBar';
import ShareGuideButton from '@/components/city-guides/ShareGuideButton';
import { useFavorites } from '@/hooks/useFavorites';
import { readTabFromUrl, writeTabToUrl } from '@/components/city-guides/tabUrl';
import { 
  SkeletonOverview, 
  SkeletonMapLoader, 
  SkeletonTabContent 
} from '@/components/common/SkeletonLoader';

// Lazy imports for better code splitting
import {
  LazyOverviewStartHere,
  LazyWhenToGo,
  LazyStartHere,
  LazyAttractionsList,
  LazyNeighborhoodsList,
  LazySeasonalActivities,
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

// ── Per-section lazy loading ─────────────────────────────────────────────
// Each tab declares the heavy data sections it needs. Sections are fetched
// from /data/{country}/{slug}/sections/*.json on demand (when the tab is
// opened or hovered) instead of pulling the whole consolidated index.json.
const TAB_SECTIONS = {
  overview: ['visitCalendar'], // landing's "right now" verdict needs the calendar
  when: ['visitCalendar'], // merged calendar + monthly view
  map: ['attractions'],
  attractions: ['attractions'],
  neighborhoods: ['neighborhoods'],
  food: ['culinary'],
  gettingin: [], // StartHere self-fetches its prose sections
  photos: [], // PhotoSpots uses static module data
};

// Section key (getCitySection) -> cityData state field.
const SECTION_TO_FIELD = {
  visitCalendar: 'visitCalendar',
  attractions: 'attractions',
  neighborhoods: 'neighborhoods',
  culinary: 'culinaryGuide',
};

// Section key -> key inside the consolidated index.json (fallback path).
const SECTION_TO_INDEX_KEY = {
  visitCalendar: 'visitCalendar',
  attractions: 'attractions',
  neighborhoods: 'neighborhoods',
  culinary: 'culinaryGuide',
};

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

function CityPageClient({ cityData: initialCityData, cityName }) {
  // Initialise from the URL (?tab=) so a guide tab is deep-linkable and
  // survives refresh. Safe: first paint is the `componentLoaded` spinner, so
  // this window read never runs on the server path. See tabUrl.js.
  const [activeTab, setActiveTab] = useState(() => readTabFromUrl('overview'));
  // `useTransition` lets React keep the previously-rendered tab visible while
  // the new tab's lazy chunk / suspended data is in-flight. No artificial
  // setTimeout delay needed — cached chunks switch instantly, slow ones keep
  // the old UI usable + show a top progress bar.
  const [isTabPending, startTabTransition] = useTransition();
  const [componentLoaded, setComponentLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showBreadcrumb, setShowBreadcrumb] = useState(true);
  const [isTabBarSticky, setIsTabBarSticky] = useState(false);
  const tabBarRef = useRef(null);
  const tabScrollerRef = useRef(null);
  const tabBarOriginalTop = useRef(null);
  const lastScrollY = useRef(0);
  const scrollTicking = useRef(false);

  // The server only ships a small "shell" ({ cityName, country, overview }).
  // Heavy sections (attractions, neighborhoods, culinary, visit calendar) are
  // fetched lazily per tab from /data/{country}/{slug}/sections/*.json, so the
  // browser only downloads the ~20-35KB a tab actually needs instead of the
  // full ~200-380KB consolidated index.json.
  const [cityData, setCityData] = useState(initialCityData);
  const [loadingSections, setLoadingSections] = useState(() => new Set());

  // Sections we've already started loading (dedupe). Pre-seed with any heavy
  // fields the shell already shipped (e.g. local dev with a full payload).
  const requestedRef = useRef(null);
  if (requestedRef.current === null) {
    const seed = new Set();
    for (const [section, field] of Object.entries(SECTION_TO_FIELD)) {
      if (initialCityData?.[field] != null) seed.add(section);
    }
    requestedRef.current = seed;
  }

  // Lazily fetch the consolidated index.json once, as a fallback for cities
  // that are missing an individual section file.
  const indexFallbackRef = useRef(null);
  const loadIndexFallback = useCallback(() => {
    if (!indexFallbackRef.current) {
      indexFallbackRef.current = getCityIndex(cityName).catch(() => null);
    }
    return indexFallbackRef.current;
  }, [cityName]);

  const loadSection = useCallback((section) => {
    const field = SECTION_TO_FIELD[section];
    if (!field || !cityName) return;
    if (requestedRef.current.has(section)) return;
    requestedRef.current.add(section);
    setLoadingSections((prev) => new Set(prev).add(section));

    getCitySection(cityName, section)
      .then(async (data) => {
        if (data != null) {
          setCityData((prev) => ({ ...prev, [field]: data }));
          return;
        }
        // Section file missing — fall back to the consolidated index.
        const idx = await loadIndexFallback();
        if (idx) {
          const idxKey = SECTION_TO_INDEX_KEY[section];
          setCityData((prev) => ({ ...prev, [field]: idx[idxKey] ?? null }));
        }
      })
      .catch((err) => {
        console.error(`Failed to load section "${section}" for ${cityName}:`, err);
      })
      .finally(() => {
        setLoadingSections((prev) => {
          const next = new Set(prev);
          next.delete(section);
          return next;
        });
      });
  }, [cityName, loadIndexFallback]);

  // Load the data the active tab needs whenever it changes (includes the
  // default 'overview' tab on mount).
  useEffect(() => {
    (TAB_SECTIONS[activeTab] || []).forEach(loadSection);
  }, [activeTab, loadSection]);

  // Auto-load when SSR/index didn't include monthly data (slim-index mode).
  const monthlyEventsKeys = cityData?.monthlyEvents ? Object.keys(cityData.monthlyEvents).length : 0;
  const monthlyAutoLoad = monthlyEventsKeys === 0;
  const { monthlyData, isLoading: monthlyDataLoading, error: monthlyDataError, refetch: loadAllMonthly } = useMonthlyData(
    cityData?.country || 'Unknown',
    cityName || 'unknown',
    { initialData: cityData?.monthlyEvents || {}, autoLoad: monthlyAutoLoad }
  );
  const { actions: uiActions } = useUIState();

  // Favorites are lifted here (single instance) so the Experiences cards and
  // the shortlist bar share one source of truth. The shortlist IS this array.
  const { favorites, isFavorite, toggle: toggleFavorite } = useFavorites(cityName);

  const {
    overview = {},
    attractions = null,
    neighborhoods = null,
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

  // `shortLabel` keeps every tab legible on phones narrower than the `xs`
  // breakpoint (475px — i.e. most phones), where the full label is hidden.
  const tabs = useMemo(() => [
    { id: 'overview', label: 'Overview', shortLabel: 'Overview', icon: '✨' },
    { id: 'when', label: 'When to Go', shortLabel: 'When', icon: monthlyDataError ? '⚠️' : '📆' },
    { id: 'gettingin', label: 'Getting In', shortLabel: 'Arrival', icon: '✈️' },
    { id: 'map', label: 'Interactive Map', shortLabel: 'Map', icon: '🗺️' },
    { id: 'attractions', label: 'Experiences', shortLabel: 'To Do', icon: '🎯' },
    { id: 'food', label: 'Food + Drink', shortLabel: 'Food', icon: '🍽️' },
    { id: 'photos', label: 'Photo Spots', shortLabel: 'Photos', icon: '📸' },
    { id: 'neighborhoods', label: 'Neighborhoods', shortLabel: 'Areas', icon: '🏘️' }
  ], [monthlyDataError]);

  useEffect(() => {
    setComponentLoaded(true);
    // Eager preload the default landing view to reduce perceived latency.
    import('@/components/city-guides/overview/OverviewStartHere');
    // Also preload logistics since it is commonly accessed early.
    import('@/components/city-guides/StartHere');
  }, []);

  // Breadcrumb & sticky tab bar scroll behavior (throttled with requestAnimationFrame)
  useEffect(() => {
    // Capture the original position of the tab bar on mount
    if (tabBarRef.current && tabBarOriginalTop.current === null) {
      tabBarOriginalTop.current = tabBarRef.current.getBoundingClientRect().top + window.scrollY;
    }

    const handleScroll = () => {
      if (scrollTicking.current) return;

      scrollTicking.current = true;
      requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        const heroHeight = 400;
        const prevScrollY = lastScrollY.current;

        // Breadcrumb visibility - only update if changed
        let newShowBreadcrumb;
        if (currentScrollY < heroHeight) {
          newShowBreadcrumb = true;
        } else if (currentScrollY < prevScrollY) {
          newShowBreadcrumb = true;
        } else if (currentScrollY > prevScrollY && currentScrollY > heroHeight) {
          newShowBreadcrumb = false;
        }

        if (newShowBreadcrumb !== undefined) {
          setShowBreadcrumb(prev => prev !== newShowBreadcrumb ? newShowBreadcrumb : prev);
        }

        // Sticky tab bar - only update if changed
        if (tabBarOriginalTop.current !== null) {
          const shouldBeSticky = currentScrollY > tabBarOriginalTop.current - 60;
          setIsTabBarSticky(prev => prev !== shouldBeSticky ? shouldBeSticky : prev);
        }

        lastScrollY.current = currentScrollY;
        scrollTicking.current = false;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleTabSwitch = useCallback((tabId) => {
    if (tabId === activeTab) return;
    // Kick off any required data fetches synchronously so they start as soon
    // as the click registers, in parallel with the lazy-chunk download.
    (TAB_SECTIONS[tabId] || []).forEach(loadSection);
    // Reflect the tab in the URL immediately (outside the transition, which
    // can defer) so deep links / Share capture the right tab.
    writeTabToUrl(tabId);
    // Mark the tab change as a transition so React keeps the current tab
    // rendered while the new one suspends. No artificial timeout.
    startTabTransition(() => {
      setActiveTab(tabId);
    });
  }, [activeTab, loadSection]);

  const handleExploreBestDates = useCallback(() => {
    if (activeTab !== 'when') {
      handleTabSwitch('when');
    }

    setTimeout(() => {
      tabBarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, activeTab === 'when' ? 0 : 220);
  }, [activeTab, handleTabSwitch]);

  // Print/PDF handler
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const preloadTab = (tabId) => {
    // Warm the data section(s) this tab needs so they're ready by click.
    (TAB_SECTIONS[tabId] || []).forEach(loadSection);

    switch (tabId) {
      case 'gettingin':
        import('@/components/city-guides/StartHere');
        break;
      case 'overview':
        import('@/components/city-guides/overview/OverviewStartHere');
        break;
      case 'when':
        import('@/components/city-guides/WhenToGo');
        // Hint monthly data fetch early on hover (the month-by-month sub-view).
        loadAllMonthly();
        break;
      case 'map':
        import('@/components/city-guides/MapSection');
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

  // On first open of the "When to Go" tab, fetch full monthly index (if not
  // already loaded) — the month-by-month sub-view needs it.
  useEffect(() => {
    if (activeTab === 'when') {
      loadAllMonthly();
    }
  }, [activeTab, loadAllMonthly]);

  // Keep the active tab visible within the horizontal scroller — needed when a
  // deep link (?tab=neighborhoods) lands on a tab that's off-screen on mobile.
  useEffect(() => {
    const scroller = tabScrollerRef.current;
    if (!scroller) return;
    const activeBtn = scroller.querySelector('[aria-current="page"]');
    activeBtn?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [activeTab]);

  const memoizedData = useMemo(() => ({
    safeAttractions,
    safeCategories,
    safeNeighborhoods,
    safeMonthlyEvents
  }), [safeAttractions, safeCategories, safeNeighborhoods, safeMonthlyEvents]);

  const cityPaths = useMemo(() => {
    const folder = legacyCountryFolder(cityData?.country);
    const slug = (cityName || '').trim().toLowerCase();
    return { experiences: `/data/${folder}/${slug}/${slug}-experiences.json` };
  }, [cityData?.country, cityName]);
  const isParis = cityName?.toLowerCase() === 'paris';
  const heroDescription = isParis
    ? 'Art, cafe terraces, Seine-side walks, grand boulevards, and golden-hour views over the rooftops.'
    : description;
  const heroSubtitle = isParis
    ? 'The City of Light'
    : headerInfo?.subtitle || "A City to Explore";
  const heroMetaItems = isParis
    ? [
        { label: 'Country', value: 'France' },
        { label: 'River', value: 'Seine' },
        { label: 'Known for', value: 'Art, cafes, architecture' }
      ]
    : [
        { label: 'Ideal stay', value: headerInfo.avgVisit || '4-5 days' },
        { label: 'Country', value: country }
      ];

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

  // Check for cities with incomplete data (e.g., data contamination was removed).
  // `cityData.hasContent` is set by the server for legacy cities that ship a
  // null overview shell but have full sections (attractions, neighborhoods,
  // culinary, monthly) loaded lazily per tab — they must render, not show
  // the "Coming Soon" placeholder reserved for genuinely-empty stubs.
  const hasMinimalData = overview?.city_name || overview?.brief_description || safeAttractions.length > 0 || cityData?.hasContent;
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
    // Show a skeleton while the active tab's section(s) are still loading
    // (either in flight, or not yet requested for this newly-selected tab).
    const activeTabPending = (TAB_SECTIONS[activeTab] || []).some(
      (section) => loadingSections.has(section) || !requestedRef.current.has(section)
    );
    if (activeTabPending) {
      return activeTab === 'map' ? <SkeletonMapLoader /> : <SkeletonTabContent />;
    }

    switch (activeTab) {
      case 'gettingin':
        return (
          <Suspense fallback={<SkeletonOverview />}>
            <LazyStartHere cityName={cityName} cityData={cityData} />
          </Suspense>
        );
      case 'overview':
        return (
          <Suspense fallback={<SkeletonOverview />}>
            <LazyOverviewStartHere
              overview={overview}
              cityName={cityName}
              visitCalendar={visitCalendar}
              experiencesUrl={cityPaths.experiences}
              onOpenTab={handleTabSwitch}
            />
          </Suspense>
        );
      case 'when':
        return (
          <Suspense fallback={<SkeletonOverview />}>
            <LazyWhenToGo
              overview={overview}
              cityName={cityName}
              country={country}
              visitCalendar={visitCalendar}
              monthlyData={memoizedData.safeMonthlyEvents}
              monthlyDataLoading={monthlyDataLoading}
              monthlyDataError={monthlyDataError}
              hideCalendarIntroHero={cityName?.toLowerCase() === 'paris'}
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
              title={`${displayName} Interactive Map`}
              subtitle="Explore attractions, neighborhoods, and more"
            />
          </MapSuspenseWrapper>
        );
      case 'attractions':
        return (
          <>
            <Suspense fallback={<SkeletonTabContent />}>
              <LazyAttractionsList
                attractions={memoizedData.safeAttractions}
                categories={memoizedData.safeCategories}
                cityName={cityName}
                monthlyData={memoizedData.safeMonthlyEvents}
                experiencesUrl={cityPaths.experiences}
                limit={Infinity}
                forceList
                isFavorite={isFavorite}
                toggle={toggleFavorite}
              />
            </Suspense>
            <div className="mt-8">
              <BookActivities cityName={displayName} country={country} />
            </div>
          </>
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
            <LazyOverviewStartHere
              overview={overview}
              cityName={cityName}
              visitCalendar={visitCalendar}
              experiencesUrl={cityPaths.experiences}
              onOpenTab={handleTabSwitch}
            />
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
          
          {/* Right: Share / Print + Auth */}
          <div className="flex items-center gap-2">
            <ShareGuideButton title={`${displayName} travel guide`} onPrint={handlePrint} />
            <AuthButton />
          </div>
        </div>
      </header>

      {/* Hero */}
      <Hero
        cityName={cityName && typeof cityName === 'string' ? cityName.toLowerCase() : undefined}
        country={cityData?.country}
        backgroundImageSrc={isParis ? '/images/city-page/France/paris-montmartre-hero-2x.jpeg' : undefined}
        backgroundAlt={`${cityData?.displayName || cityName || 'City'} cityscape`}
        heightClass="min-h-[430px] lg:min-h-[520px]"
        imagePositionClass={isParis ? 'object-[62%_35%]' : 'object-center md:object-[62%_50%]'}
        darkOverlayOpacity={isParis ? 'bg-black/25' : 'bg-black/35'}
        showImageOverlays={!isParis}
        eyebrow={`${displayName} city guide`}
        title={getCityDisplayName(cityData, cityName) || cityName || 'City'}
        subtitle={heroSubtitle}
        description={heroDescription}
        metaItems={heroMetaItems}
        primaryCta={{ label: `Plan a ${displayName} Trip`, href: `/plan/${encodeURIComponent(cityName.toLowerCase())}` }}
        secondaryCta={{ label: 'Explore Best Dates', onClick: handleExploreBestDates, variant: 'outline' }}
        actionElement={<SaveToTrips cityName={cityName} cityData={cityData} showLabel={false} variant="hero" className="px-3 py-2" />}
      />

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
            <div className="relative min-w-0 flex-1">
              <div
                ref={tabScrollerRef}
                className="flex overflow-x-auto gap-2 scrollbar-hide tab-navigation snap-x"
              >
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabSwitch(tab.id)}
                  onMouseEnter={() => preloadTab(tab.id)}
                  aria-label={`Switch to ${tab.label} tab`}
                  aria-current={activeTab === tab.id ? 'page' : undefined}
                  className={`snap-start px-3.5 sm:px-4.5 py-3 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-100'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 active:bg-gray-100'
                  }`}
                >
                  <span className="text-base sm:text-lg opacity-90" aria-hidden="true">{tab.icon}</span>
                  <span className="sm:hidden">{tab.shortLabel}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
              </div>
              {/* Edge fade hints there are more tabs to scroll on small screens */}
              <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent" aria-hidden />
            </div>
          </div>
        </div>
      </div>
      
      {/* Spacer when tab bar is sticky */}
      {isTabBarSticky && <div className="h-24" />}

      {/* Thin top progress bar — shown only while a tab transition is in flight.
          Replaces the old full-content skeleton swap, so cached tabs feel
          instant and slow ones keep the previous tab usable. */}
      {isTabPending && (
        <div
          aria-hidden
          className="fixed top-0 left-0 right-0 h-[2px] z-[60] overflow-hidden bg-blue-100"
        >
          <div className="h-full w-1/3 bg-blue-500 rounded-full animate-[tabloader_1.1s_ease-in-out_infinite]" />
          <style>{`
            @keyframes tabloader {
              0%   { transform: translateX(-100%); }
              100% { transform: translateX(400%); }
            }
          `}</style>
        </div>
      )}

      {/* Content */}
      <div className="mx-auto max-w-7xl px-3 sm:px-4 py-4 sm:py-6 pb-24 overflow-visible">
        <div
          aria-busy={isTabPending}
          className={`transition-opacity duration-150 ${
            isTabPending ? 'opacity-60' : 'opacity-100'
          }`}
        >
          {renderTabContent()}
        </div>
      </div>

      {/* Sticky bottom bar — the "Plan a Trip" CTA when nothing is shortlisted,
          and a shortlist tray once the visitor has saved experiences. */}
      <CityShortlistBar
        cityName={cityName}
        displayName={displayName}
        favorites={favorites}
        onRemove={toggleFavorite}
      />

    </div>
  );
}

export default CityPageClient; 