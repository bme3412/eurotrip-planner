'use client';

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import RegionFilter from '@/components/city-guides/RegionFilter';
import CountryFilter from '@/components/city-guides/CountryFilter';
import CityCard from '@/components/city-guides/CityCard';
import { getCitiesData } from '@/components/city-guides/cityData';
import { regionThemes } from '@/components/city-guides/regionData';

const INITIAL_LOAD = 12;
const LOAD_INCREMENT = 8;

export default function CityGuidesPage() {
  /* ───────── state ───────── */
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('All');
  const [selectedCountries, setSelectedCountries] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [allCountries, setAllCountries] = useState([]);
  const [error, setError] = useState(null);
  const [activeFilterType, setActiveFilterType] = useState('geographic');

  const [itemsToShow, setItemsToShow] = useState(INITIAL_LOAD);
  const [displayed, setDisplayed] = useState([]);
  const [hasMore, setHasMore] = useState(false);

  const observerRef = useRef(null);

  /* ───────── data load ───────── */
  useEffect(() => {
    try {
      const data = getCitiesData();
      setCities(data);
      setAllCountries(
        [...new Set(data.map((c) => c.country).filter(Boolean))].sort(),
      );
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('Failed to load city data');
      setLoading(false);
    }
  }, []);

  /* ───────── filtering ───────── */
  const filtered = useMemo(() => {
    return cities.filter((city) => {
      const matchesSearch =
        !searchTerm ||
        city.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (city.country &&
          city.country.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (city.description &&
          city.description.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCountry =
        selectedCountries.length === 0 || selectedCountries.includes(city.country);

      let matchesRegion = true;
      if (selectedRegion !== 'All') {
        if (activeFilterType === 'geographic') {
          const theme = regionThemes.find((t) => t.id === selectedRegion);
          matchesRegion = theme?.countries?.includes(city.country) ?? false;
        } else if (activeFilterType === 'region') {
          matchesRegion = city.region === selectedRegion;
        } else if (activeFilterType === 'travel' || activeFilterType === 'tourism') {
          matchesRegion =
            city.tourismCategories?.includes(selectedRegion) ?? false;
        }
      }

      return matchesSearch && matchesCountry && matchesRegion;
    });
  }, [cities, searchTerm, selectedCountries, selectedRegion, activeFilterType]);

  /* ───────── infinite scroll ───────── */
  useEffect(() => {
    setDisplayed(filtered.slice(0, INITIAL_LOAD));
    setItemsToShow(INITIAL_LOAD);
    setHasMore(filtered.length > INITIAL_LOAD);
  }, [filtered]);

  const loadMore = useCallback(() => {
    const next = itemsToShow + LOAD_INCREMENT;
    setDisplayed(filtered.slice(0, next));
    setItemsToShow(next);
    setHasMore(filtered.length > next);
  }, [itemsToShow, filtered]);

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

  const handleCountryChange = (c) =>
    setSelectedCountries((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedRegion('All');
    setSelectedCountries([]);
  };

  const filterLabel =
    activeFilterType === 'geographic'
      ? 'Region'
      : activeFilterType === 'tourism'
      ? 'Style'
      : 'Filter';

  /* ───────── render ───────── */
  return (
    <div className="min-h-screen bg-gray-50">
      {/* hero */}
      <div className="relative h-64 overflow-hidden text-white">
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-blue-700/80 to-indigo-800/80" />
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(/images/europe-map-bg.jpg)' }}
        />
        <div className="relative z-20 container mx-auto flex h-full flex-col justify-center px-4">
          <h1 className="text-3xl font-bold md:text-4xl">
            Explore European Cities
          </h1>
          <p className="mt-1 max-w-2xl opacity-90">
            Discover insider tips, interactive maps, and local recommendations
            for Europe&apos;s most compelling destinations.
          </p>

          <div className="relative mt-4 max-w-lg">
            <input
              type="text"
              placeholder="Search for a city or country..."
              className="w-full rounded-lg bg-white/90 py-2 px-4 pr-10 text-gray-800 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="absolute right-6 top-[11px] text-gray-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </span>
          </div>
        </div>
      </div>

      {/* filters & grid */}
      <div className="container mx-auto px-4 py-6">
        {/* active-filter chips */}
        {(selectedRegion !== 'All' || selectedCountries.length > 0 || searchTerm) && (
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-gray-600">Active filters:</span>

            {selectedRegion !== 'All' && (
              <span className="flex items-center rounded-full bg-blue-100 px-2 py-1 text-blue-800">
                {filterLabel}: {selectedRegion}
                <button onClick={() => setSelectedRegion('All')} className="ml-1">
                  ✕
                </button>
              </span>
            )}

            {selectedCountries.map((c) => (
              <span
                key={c}
                className="flex items-center rounded-full bg-green-100 px-2 py-1 text-green-800"
              >
                Country: {c}
                <button onClick={() => handleCountryChange(c)} className="ml-1">
                  ✕
                </button>
              </span>
            ))}

            {searchTerm && (
              <span className="flex items-center rounded-full bg-purple-100 px-2 py-1 text-purple-800">
                Search: &apos;{searchTerm}&apos;
                <button onClick={() => setSearchTerm('')} className="ml-1">
                  ✕
                </button>
              </span>
            )}

            <button onClick={clearFilters} className="ml-2 text-xs underline">
              Clear all
            </button>
          </div>
        )}

        {/* filter controls */}
        <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
          <RegionFilter
            selectedRegion={selectedRegion}
            handleRegionChange={handleRegionChange}
          />

          <CountryFilter
            selectedCountries={selectedCountries}
            handleCountryChange={handleCountryChange}
            countries={allCountries}
          />
        </div>

        {/* results header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">City Guides</h2>
          <span className="text-sm text-gray-500">
            {loading
              ? 'Loading…'
              : `Showing ${displayed.length} of ${filtered.length}`}
          </span>
        </div>

        {/* states */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-t-2 border-blue-500" />
          </div>
        ) : error ? (
          <div className="rounded-lg bg-white p-6 text-center shadow-md">
            <p className="text-red-600">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg bg-white p-6 text-center shadow-md">
            <p className="text-gray-600">No cities match your criteria.</p>
            <button
              onClick={clearFilters}
              className="mt-3 font-medium text-blue-600 hover:text-blue-800"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <>
            {/* cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {displayed.map((city) => (
                <CityCard key={city.id} city={city} />
              ))}
            </div>

            {/* infinite-scroll sentinel */}
            {hasMore && (
              <div
                ref={observerRef}
                className="flex h-20 items-center justify-center"
              >
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-blue-500" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}