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
import InlineDateControl from '@/components/InlineDateControl';
import { parseDatesFromParams } from '@/hooks/useTripDates';
import UnifiedFilter from '@/components/city-guides/UnifiedFilter';
import CityCard from '@/components/city-guides/CityCard';
import CityCardSkeleton from '@/components/city-guides/CityCardSkeleton';
import { getCitiesData as getStaticCityData } from '@/components/city-guides/cityData';
import { COASTAL_CITY_IDS as COASTAL_CITY_IDS_CURATED } from '@/components/city-guides/coastalCityIds';

const INITIAL_LOAD = 24;
const LOAD_INCREMENT = 24;

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
  const getResultsHeading = () => {
    const count = sorted.length;
    const hasFilters = selectedRegion !== 'All Regions' && selectedRegion !== 'All Experiences' || selectedCountries.length > 0 || searchTerm;
    
    if (!hasFilters) {
      return 'Your curated picks';
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
      {/* Hero */}
      <div className="px-6 pt-12 pb-6 text-center">
        <div className="mx-auto max-w-6xl">
          <span className="badge bg-white/80">City Guides</span>
          <h1 className="mt-3 text-4xl md:text-5xl font-extrabold tracking-tight text-zinc-900">Explore Europe, city by city</h1>
          <p className="mt-3 text-base md:text-lg text-zinc-700 max-w-3xl mx-auto">Filter by region, experience, or country to find the perfect match for your dates.</p>
          <div className="mt-2 text-xs text-zinc-500">
            {sorted.length > 0 ? `${sorted.length} cities available` : (loading ? 'Loading cities…' : 'No cities found')}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-6 py-6">
        <div className="mb-4">
          <UnifiedFilter
            selectedRegion={selectedRegion}
            selectedCountries={selectedCountries}
            handleRegionChange={handleRegionChange}
            handleCountryChange={handleCountryChange}
            countries={allCountries}
            searchTerm={searchTerm}
            onSearchChange={handleSearchChange}
            onClearFilters={clearFilters}
            activeFilterType={activeFilterType}
            onFilterTypeChange={setActiveFilterType}
          />
        </div>

        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">{getResultsHeading()}</h2>
        </div>

        {/* Single unified grid */}
        {displayed.length > 0 && !error && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {displayed.map((city, index) => (
              <CityCard 
                key={city.id} 
                city={city}
                priority={index < 4} // Priority load first 4 images
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {sorted.length > INITIAL_LOAD && (
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

        {/* Initial Loading with Skeletons */}
        {loading && !error && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <CityCardSkeleton key={i} />
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

export default function CityGuidesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm text-zinc-600">Loading city guides…</div>}>
      <CityGuidesContent />
    </Suspense>
  );
}
