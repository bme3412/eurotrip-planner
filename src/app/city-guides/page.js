'use client';

import React, {
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

export default function CityGuidesPage() {
  /* ───────── state ───────── */
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('All Regions');
  const [selectedCountries, setSelectedCountries] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [allCountries, setAllCountries] = useState([]);
  const [error, setError] = useState(null);
  const [activeFilterType, setActiveFilterType] = useState('euro-region');

  const [itemsToShow, setItemsToShow] = useState(INITIAL_LOAD);
  const [displayed, setDisplayed] = useState([]);
  const [hasMore, setHasMore] = useState(false);

  const observerRef = useRef(null);

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

  /* ───────── data load ───────── */
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/cities?limit=all`, { cache: 'no-store' });
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

  /* ───────── infinite scroll ───────── */
  useEffect(() => {
    setDisplayed(sorted.slice(0, INITIAL_LOAD));
    setItemsToShow(INITIAL_LOAD);
    setHasMore(sorted.length > INITIAL_LOAD);
  }, [sorted]);

  const loadMore = useCallback(() => {
    const next = itemsToShow + LOAD_INCREMENT;
    setDisplayed(sorted.slice(0, next));
    setItemsToShow(next);
    setHasMore(sorted.length > next);
  }, [itemsToShow, sorted]);

  useEffect(() => {
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      { threshold: 1 },
    );
    
    if (observerRef.current) {
      io.observe(observerRef.current);
    }
    
    return () => io.disconnect();
  }, [hasMore, loading, loadMore]);

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

  /* ───────── render ───────── */
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f3f7ff] to-white">
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
            rightExtras={<InlineDateControl value={tripDates} onChange={updateDates} />}
          />
        </div>

        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Your curated picks</h2>
        </div>

        {/* Pill is now mounted inside the filter bar via rightExtras */}

        {/* Single unified grid */}
        {displayed.length > 0 && !error && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {displayed.map((city) => (
              <CityCard key={city.id} city={city} />
            ))}
          </div>
        )}

        {/* Infinite Scroll Sentinel */}
        {hasMore && (
          <div ref={observerRef} className="flex items-center justify-center py-4">
            <div className="flex items-center space-x-2 text-gray-600">
              <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              <span className="text-xs">Loading more cities...</span>
            </div>
          </div>
        )}

        {/* End of Results */}
        {!hasMore && displayed.length > 0 && (
          <div className="text-center py-4">
            <div className="inline-flex items-center space-x-2 text-gray-500">
              <div className="w-px h-3 bg-gray-300"></div>
              <span className="text-xs">You&apos;ve reached the end</span>
              <div className="w-px h-3 bg-gray-300"></div>
            </div>
          </div>
        )}

        {/* Initial Loading */}
        {loading && !error && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-2"></div>
              <p className="text-gray-600 text-sm">Loading amazing destinations...</p>
            </div>
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