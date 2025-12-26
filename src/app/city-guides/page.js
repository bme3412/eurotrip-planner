'use client';

import React, {
  Suspense,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import InlineDateControl from '@/components/InlineDateControl';
import { parseDatesFromParams } from '@/hooks/useTripDates';
import UnifiedFilter from '@/components/city-guides/UnifiedFilter';
import CityCard from '@/components/city-guides/CityCard';
import CityCardSkeleton from '@/components/city-guides/CityCardSkeleton';
import { getCitiesData as getStaticCityData } from '@/components/city-guides/cityData';
import { COASTAL_CITY_IDS as COASTAL_CITY_IDS_CURATED } from '@/components/city-guides/coastalCityIds';
import { getFlagForCountry } from '@/utils/countryFlags';

// Build a map of city descriptions from static data for fallback
const staticCityDescriptions = (() => {
  const map = {};
  getStaticCityData().forEach(city => {
    if (city.description) {
      map[city.id] = city.description;
    }
  });
  return map;
})();

const INITIAL_LOAD = 24;
const LOAD_INCREMENT = 24;

// 8 most popular European cities for the featured section
const POPULAR_CITIES = [
  { id: 'paris', name: 'Paris', country: 'France', description: 'The City of Light, famous for the Eiffel Tower, world-class museums, and romantic boulevards.' },
  { id: 'london', name: 'London', country: 'United Kingdom', description: 'Historic capital blending royal heritage with cutting-edge culture, from Big Ben to Borough Market.' },
  { id: 'barcelona', name: 'Barcelona', country: 'Spain', description: 'Gaudí\'s masterpieces, Mediterranean beaches, and legendary tapas in Catalonia\'s vibrant capital.' },
  { id: 'rome', name: 'Rome', country: 'Italy', description: 'The Eternal City where ancient ruins, Renaissance art, and Italian dolce vita converge.' },
  { id: 'amsterdam', name: 'Amsterdam', country: 'Netherlands', description: 'Picturesque canals, world-renowned museums, and a famously free-spirited atmosphere.' },
  { id: 'prague', name: 'Prague', country: 'Czech Republic', description: 'Fairytale spires, medieval charm, and one of Europe\'s best-preserved historic centers.' },
  { id: 'lisbon', name: 'Lisbon', country: 'Portugal', description: 'Sun-drenched hills, historic trams, and a thriving food scene on the Atlantic coast.' },
  { id: 'vienna', name: 'Vienna', country: 'Austria', description: 'Imperial palaces, legendary coffee houses, and the birthplace of classical music.' },
];

// Normalize countries from manifest to UI labels used across components
const COUNTRY_NORMALIZATION = {
  UK: 'United Kingdom',
  Czechia: 'Czech Republic',
};

const normalizeCountry = (country) => COUNTRY_NORMALIZATION[country] || country;

// Region group mappings for the euro-region filter buttons
const EURO_REGION_GROUPS = {
  'Benelux': ['Belgium', 'Netherlands', 'Luxembourg'],
  'Alpine': ['Austria', 'Switzerland'],
  'Mediterranean': ['Italy', 'Spain', 'Portugal', 'Greece', 'France'],
  'The Nordics': ['Denmark', 'Sweden', 'Norway', 'Finland', 'Iceland'],
  'Central Europe': ['Poland', 'Hungary', 'Czech Republic', 'Austria', 'Germany'],
};

// Curated list for the Historic Capitals filter
const HISTORIC_CAPITALS = new Set([
  'paris', 'rome', 'madrid', 'berlin', 'vienna', 'prague', 'budapest',
  'warsaw', 'athens', 'lisbon', 'dublin', 'copenhagen', 'stockholm',
  'oslo', 'helsinki', 'amsterdam', 'brussels', 'bern'
]);

// Coastal cities = curated union derived-from-static tourismCategories
const COASTAL_CITY_IDS = (() => {
  const derived = new Set(
    getStaticCityData()
      .filter(c => Array.isArray(c.tourismCategories) && c.tourismCategories.includes('Beach Destinations'))
      .map(c => c.id)
  );
  const union = new Set(COASTAL_CITY_IDS_CURATED);
  derived.forEach(id => union.add(id));
  return union;
})();

function CityGuidesContent() {
  /* ───────── state ───────── */
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('All Regions');
  const [selectedCountries, setSelectedCountries] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [allCountries, setAllCountries] = useState([]);
  const [error, setError] = useState(null);
  const [activeFilterType, setActiveFilterType] = useState('euro-region');

  const [displayed, setDisplayed] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  /* ───────── date init from URL ───────── */
  const searchParams = useSearchParams();
  const router = useRouter();
  const [tripDates, setTripDates] = useState(() => parseDatesFromParams(searchParams));

  useEffect(() => {
    const parsed = parseDatesFromParams(searchParams);
    if (parsed) setTripDates(parsed);
  }, [searchParams]);

  const updateDates = useCallback((next) => {
    setTripDates(next);
    const p = new URLSearchParams();
    if (next?.mode) p.set('mode', next.mode);
    if (next?.start) p.set('start', next.start);
    if (next?.end) p.set('end', next.end);
    if (next?.month) p.set('month', next.month);
    router.replace(`/city-guides?${p.toString()}`);
  }, [router]);

  /* ───────── data load with caching ───────── */
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Check cache first (5 minute cache)
        const cacheKey = 'eurotrip_cities_data';
        const cacheTimeKey = 'eurotrip_cities_timestamp';
        const cacheExpiry = 5 * 60 * 1000; // 5 minutes
        
        const cachedData = localStorage.getItem(cacheKey);
        const cachedTime = localStorage.getItem(cacheTimeKey);
        const now = Date.now();
        
        if (cachedData && cachedTime && (now - parseInt(cachedTime)) < cacheExpiry) {
          // Use cached data
          const list = JSON.parse(cachedData);
          if (!cancelled) {
            setCities(list);
            setAllCountries([...new Set(list.map((x) => x.country).filter(Boolean))].sort());
            setLoading(false);
          }
          return;
        }
        
        // Fetch fresh data
        const res = await fetch(`/api/cities?limit=all`, { 
          cache: 'force-cache',
          next: { revalidate: 300 } // 5 minutes
        });
        const json = await res.json();
        const list = (json?.data || []).map((c) => ({
          id: c.id,
          name: c.name,
          country: normalizeCountry(c.country),
          thumbnail: c.thumbnail,
          region: c.region,
          description: c.description,
        }));

        if (!cancelled) {
          // Cache the data
          localStorage.setItem(cacheKey, JSON.stringify(list));
          localStorage.setItem(cacheTimeKey, now.toString());
          
          setCities(list);
          setAllCountries([...new Set(list.map((x) => x.country).filter(Boolean))].sort());
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load cities from API:', err);
          setError('Failed to load city data');
          setLoading(false);
        }
      }
    };

    load();
    return () => { cancelled = true; };
  }, []);

  /* ───────── filtering ───────── */
  const filtered = useMemo(() => {
    return cities.filter((city) => {
      const matchesSearch =
        !searchTerm ||
        city.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (city.country && city.country.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (city.description && city.description.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCountry =
        selectedCountries.length === 0 || selectedCountries.includes(city.country);

      let matchesRegion = true;
      if (activeFilterType === 'euro-region' && selectedRegion && selectedRegion !== 'All Regions') {
        if (selectedRegion === 'Historic Capitals') {
          matchesRegion = HISTORIC_CAPITALS.has(city.id);
        } else if (selectedRegion === 'Beach Destinations') {
          // Any city tagged as Beach Destinations across all countries
          matchesRegion = COASTAL_CITY_IDS.has(city.id);
        } else {
          const countries = EURO_REGION_GROUPS[selectedRegion] || [];
          matchesRegion = countries.includes(city.country);
        }
      } else if (activeFilterType === 'travel-experience' && selectedRegion && selectedRegion !== 'All Experiences') {
        // Filter by tourism categories from city data
        const staticCityData = getStaticCityData();
        const cityData = staticCityData.find(c => c.id === city.id);
        
        if (cityData && cityData.tourismCategories && Array.isArray(cityData.tourismCategories)) {
          matchesRegion = cityData.tourismCategories.includes(selectedRegion);
        } else {
          matchesRegion = false;
        }
      }

      return matchesSearch && matchesCountry && matchesRegion;
    });
  }, [cities, searchTerm, selectedCountries, selectedRegion, activeFilterType]);

  // Sort by country, then by city name
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const c = (a.country || '').localeCompare(b.country || '');
      return c !== 0 ? c : a.name.localeCompare(b.name);
    });
    return arr;
  }, [filtered]);

  /* ───────── pagination ───────── */
  useEffect(() => {
    setCurrentPage(1);
    const total = Math.ceil(sorted.length / INITIAL_LOAD);
    setTotalPages(total);
    const start = 0;
    const end = INITIAL_LOAD;
    setDisplayed(sorted.slice(start, end));
  }, [sorted]);

  const goToPage = useCallback((page) => {
    setCurrentPage(page);
    const start = (page - 1) * INITIAL_LOAD;
    const end = start + INITIAL_LOAD;
    setDisplayed(sorted.slice(start, end));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [sorted]);

  /* ───────── UI handlers ───────── */
  const handleRegionChange = (region, type) => {
    setSelectedRegion(region);
    if (type) setActiveFilterType(type);
  };

  const handleCountryChange = (c) => {
    if (c === 'clear-all') {
      setSelectedCountries([]);
    } else {
      setSelectedCountries((prev) =>
        prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
      );
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedRegion('All Regions');
    setSelectedCountries([]);
  };

  const handleSearchChange = (value) => {
    setSearchTerm(value);
  };

  /* ───────── dynamic heading ───────── */
  const hasActiveFilters = useMemo(() => {
    return (selectedRegion !== 'All Regions' && selectedRegion !== 'All Experiences') || 
           selectedCountries.length > 0 || 
           searchTerm;
  }, [selectedRegion, selectedCountries, searchTerm]);

  const getResultsHeading = () => {
    const count = sorted.length;
    
    if (!hasActiveFilters) {
      return 'All Destinations';
    }
    
    // Build a descriptive heading based on active filters
    const parts = [];
    
    if (count === 0) {
      return 'No cities found';
    }
    
    parts.push(`${count} ${count === 1 ? 'city' : 'cities'}`);
    
    if (selectedRegion !== 'All Regions' && selectedRegion !== 'All Experiences') {
      if (activeFilterType === 'euro-region') {
        parts.push(`in ${selectedRegion}`);
      } else {
        parts.push(`for ${selectedRegion}`);
      }
    }
    
    if (selectedCountries.length === 1) {
      parts.push(`in ${selectedCountries[0]}`);
    } else if (selectedCountries.length > 1) {
      parts.push(`in ${selectedCountries.length} countries`);
    }
    
    if (searchTerm) {
      parts.push(`matching "${searchTerm}"`);
    }
    
    return parts.join(' ');
  };

  /* ───────── render ───────── */
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumbs */}
      <div className="px-6 pt-4">
        <div className="mx-auto max-w-6xl">
          <nav className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/" className="hover:text-blue-600 transition-colors flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Home
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-gray-700 font-medium">City Guides</span>
          </nav>
        </div>
      </div>

      {/* Compact Hero */}
      <div className="px-6 pt-3 pb-4 text-center">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900">City Guides</h1>
          <p className="text-sm text-zinc-400 mt-1">{sorted.length} destinations across Europe</p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-6 pb-6">
        <div className="mb-5">
          <UnifiedFilter
            selectedRegion={selectedRegion}
            selectedCountries={selectedCountries}
            handleRegionChange={handleRegionChange}
            handleCountryChange={handleCountryChange}
            countries={allCountries}
            cities={cities}
            searchTerm={searchTerm}
            onSearchChange={handleSearchChange}
            onClearFilters={clearFilters}
            activeFilterType={activeFilterType}
            onFilterTypeChange={setActiveFilterType}
          />
        </div>

        {/* Popular Cities Section - Only shown when no filters active */}
        {!hasActiveFilters && !loading && cities.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">🌟</span>
              <h2 className="text-lg font-semibold text-gray-900">Popular Cities</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {POPULAR_CITIES.map((popularCity, index) => {
                // Merge loaded city data with our curated description
                const loadedCity = cities.find(c => c.id === popularCity.id);
                const mergedCity = loadedCity 
                  ? { ...loadedCity, description: popularCity.description }
                  : popularCity;
                return (
                  <div 
                    key={popularCity.id}
                    className="animate-in fade-in slide-in-from-bottom-4 duration-500"
                    style={{ animationDelay: `${index * 75}ms`, animationFillMode: 'both' }}
                  >
                    <CityCard 
                      city={mergedCity}
                      priority={index < 4}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Browse by Country Section with TOC */}
        {!hasActiveFilters && !loading && cities.length > 0 && (
          <div className="mt-10" id="browse-by-country">
            {/* Subtle divider with label */}
            <div className="relative mb-6 scroll-mt-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-gray-50 px-4 text-sm text-gray-500 font-medium">Browse by Country</span>
              </div>
            </div>

            {/* Country Quick Nav */}
            <div className="text-sm text-gray-600 mb-6 leading-7">
              {allCountries.map((country, index) => {
                const countryCount = sorted.filter(c => c.country === country).length;
                if (countryCount === 0) return null;
                const isLast = index === allCountries.length - 1;
                const displayName = country;
                return (
                  <span key={country}>
                    <button
                      onClick={() => {
                        const element = document.getElementById(`country-${country.replace(/\s+/g, '-').toLowerCase()}`);
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      }}
                      className="hover:text-blue-600 hover:underline underline-offset-2 transition-colors"
                    >
                      {displayName}
                    </button>
                    {!isLast && <span className="text-gray-400 mx-1">•</span>}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* When filters active, show filtered results grouped by country */}
        {hasActiveFilters && !loading && sorted.length > 0 && (
          <>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-900">{getResultsHeading()}</h2>
            </div>

            {/* Filtered cities grouped by country */}
            <div className="space-y-8">
              {allCountries.map((country) => {
                const countryCities = sorted.filter(c => c.country === country);
                if (countryCities.length === 0) return null;
                
                return (
                  <div key={country}>
                    {/* Country Header */}
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
                      <span className="text-xl">{getFlagForCountry(country)}</span>
                      <h3 className="text-base font-medium text-gray-900">{country}</h3>
                    </div>
                    
                    {/* Cities Grid */}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {countryCities.map((city, cityIndex) => {
                        const cityWithDescription = city.description 
                          ? city 
                          : { ...city, description: staticCityDescriptions[city.id] };
                        return (
                          <div 
                            key={city.id}
                            className="animate-in fade-in duration-300"
                            style={{ animationDelay: `${cityIndex * 40}ms`, animationFillMode: 'both' }}
                          >
                            <CityCard 
                              city={cityWithDescription}
                              priority={cityIndex < 4}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* When no filters, show cities grouped by country */}
        {!hasActiveFilters && !loading && cities.length > 0 && (
          <div className="space-y-10">
            {allCountries.map((country, countryIndex) => {
              const countryCities = sorted.filter(c => c.country === country);
              if (countryCities.length === 0) return null;
              
              return (
                <div 
                  key={country}
                  id={`country-${country.replace(/\s+/g, '-').toLowerCase()}`}
                  className="scroll-mt-6"
                >
                  {/* Country Header */}
                  <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200">
                    <span className="text-2xl">{getFlagForCountry(country)}</span>
                    <h3 className="text-lg font-semibold text-gray-900">{country}</h3>
                  </div>
                  
                  {/* Cities Grid */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {countryCities.map((city, cityIndex) => {
                      // Ensure city has description from static data if not from API
                      const cityWithDescription = city.description 
                        ? city 
                        : { ...city, description: staticCityDescriptions[city.id] };
                      return (
                        <div 
                          key={city.id}
                          className="animate-in fade-in duration-300"
                          style={{ animationDelay: `${cityIndex * 50}ms`, animationFillMode: 'both' }}
                        >
                          <CityCard 
                            city={cityWithDescription}
                            priority={countryIndex < 2 && cityIndex < 4}
                          />
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Back to Index Link */}
                  <div className="mt-5 flex justify-end">
                    <button
                      onClick={() => {
                        const element = document.getElementById('browse-by-country');
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      }}
                      className="text-sm text-gray-500 hover:text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      </svg>
                      Back to Index
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination - only show when filters are active */}
        {hasActiveFilters && sorted.length > INITIAL_LOAD && (
          <div className="mt-8 flex flex-col items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                aria-label="Previous page"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 7) {
                    pageNum = i + 1;
                  } else if (currentPage <= 4) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 3) {
                    pageNum = totalPages - 6 + i;
                  } else {
                    pageNum = currentPage - 3 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => goToPage(pageNum)}
                      className={`min-w-[40px] px-3 py-2 rounded-lg font-medium transition-all ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                      aria-label={`Go to page ${pageNum}`}
                      aria-current={currentPage === pageNum ? 'page' : undefined}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                aria-label="Next page"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            
            {/* Page info */}
            <div className="text-sm text-gray-600">
              Showing {((currentPage - 1) * INITIAL_LOAD) + 1}-{Math.min(currentPage * INITIAL_LOAD, sorted.length)} of {sorted.length} cities
            </div>
          </div>
        )}

        {/* Initial Loading with Skeletons - Staggered Animation */}
        {loading && !error && (
          <div className="space-y-8">
            {/* Popular Cities Skeleton */}
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="h-7 w-7 bg-gray-200 rounded-lg animate-pulse"></div>
                <div>
                  <div className="h-6 w-40 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 w-56 bg-gray-100 rounded animate-pulse mt-2"></div>
                </div>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div 
                    key={`pop-${i}`}
                    className="animate-in fade-in duration-500"
                    style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'both' }}
                  >
                    <CityCardSkeleton />
                  </div>
                ))}
              </div>
            </div>
            
            {/* Divider Skeleton */}
            <div className="relative my-10">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-gray-50 px-4 text-sm text-gray-400 font-medium">Browse by Country</span>
              </div>
            </div>
            
            {/* Country Sections Skeleton */}
            {['Austria', 'Belgium', 'Czech Republic'].map((country, countryIdx) => (
              <div key={country} className="animate-in fade-in duration-500" style={{ animationDelay: `${600 + countryIdx * 200}ms`, animationFillMode: 'both' }}>
                <div className="flex items-center gap-3 mb-4 pb-2 border-b border-gray-200">
                  <div className="h-6 w-24 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-5 w-16 bg-gray-100 rounded-full animate-pulse"></div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div 
                      key={`${country}-${i}`}
                      className="animate-in fade-in duration-400"
                      style={{ animationDelay: `${i * 75}ms`, animationFillMode: 'both' }}
                    >
                      <CityCardSkeleton />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && sorted.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No cities found</h3>
            <p className="text-gray-600 mb-3 text-sm">Try adjusting your search terms or filters.</p>
            <button onClick={clearFilters} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm">Clear All Filters</button>
          </div>
        )}
      </div>
    </div>
  );
}

// Elegant loading spinner component
function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero skeleton */}
      <div className="px-6 pt-12 pb-6 text-center">
        <div className="mx-auto max-w-6xl">
          <div className="inline-block h-6 w-24 bg-gray-200 rounded-full animate-pulse mb-3"></div>
          <div className="h-12 w-96 max-w-full bg-gray-200 rounded-lg animate-pulse mx-auto mb-3"></div>
          <div className="h-5 w-80 max-w-full bg-gray-100 rounded animate-pulse mx-auto"></div>
        </div>
      </div>
      
      {/* Content skeleton */}
      <div className="mx-auto max-w-6xl px-6 py-6">
        {/* Filter skeleton */}
        <div className="mb-6 p-4 bg-white rounded-xl border border-gray-100">
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-9 w-24 bg-gray-100 rounded-lg animate-pulse"></div>
            ))}
          </div>
        </div>
        
        {/* Cards skeleton */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div 
              key={i}
              className="animate-in fade-in duration-700"
              style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'both' }}
            >
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="h-48 bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse"></div>
                <div className="p-5 space-y-3">
                  <div className="h-5 w-3/4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 w-full bg-gray-100 rounded animate-pulse"></div>
                  <div className="h-4 w-2/3 bg-gray-100 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CityGuidesPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <CityGuidesContent />
    </Suspense>
  );
}
