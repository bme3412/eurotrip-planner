'use client';

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import UnifiedFilter from '@/components/city-guides/UnifiedFilter';
import CityCard from '@/components/city-guides/CityCard';
import { getCitiesData } from '@/components/city-guides/cityData';

const INITIAL_LOAD = 12;
const LOAD_INCREMENT = 8;

export default function CityGuidesPage() {
  /* ───────── state ───────── */
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('All');
  const [selectedCountries, setSelectedCountries] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(false);
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
        if (activeFilterType === 'euro-region') {
          // Refined Euro-region filtering - 9 categories total
          const euroRegionGroups = {
            'Benelux': ['Belgium', 'Netherlands', 'Luxembourg'],
            'Alpine': ['Austria', 'Switzerland'],
            'Mediterranean': ['Italy', 'Spain', 'Portugal', 'Greece'],
            'The Nordics': ['Denmark', 'Sweden', 'Norway', 'Finland'],
            'Central Europe': ['Poland', 'Hungary', 'Czech Republic'],
            'Wine Regions': ['France', 'Italy', 'Spain', 'Portugal'], // Major wine-producing countries
            'Historic Capitals': ['France', 'Germany', 'Austria', 'Italy', 'Spain'], // Major historic capitals
            'Luxury Coastlines': ['France', 'Italy', 'Spain'] // St Tropez, Cote d'Azur, Amalfi Coast, Ibiza
          };
          matchesRegion = euroRegionGroups[selectedRegion]?.includes(city.country) ?? false;
                      } else if (activeFilterType === 'travel-experience') {
                // Travel experience filtering - 9 categories total
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

  const handleSearchChange = (value) => {
    setSearchTerm(value);
  };

  /* ───────── render ───────── */
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Compact Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/90 via-indigo-700/90 to-purple-800/90" />
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: 'url(/images/europe-map-bg.jpg)' }}
        />
        <div className="relative z-10 container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto text-center text-white">
            <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">
              Discover European Cities
            </h1>
            <p className="text-lg md:text-xl mb-6 opacity-90 leading-relaxed">
              Explore insider tips, interactive maps, and local recommendations
              for Europe&apos;s most compelling destinations.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content - Compact Layout */}
      <div className="container mx-auto px-4 py-2">
        {/* Compact Filter */}
        <div className="mb-3">
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

        {/* Compact Results Header */}
        <div className="mb-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                City Guides
              </h2>
              {cities.length > 0 && (
                <p className="text-xs text-gray-600 mt-0.5">
                  {filtered.length === 0 
                    ? 'No cities match your criteria'
                    : `Showing ${displayed.length} of ${filtered.length} cities`
                  }
                </p>
              )}
            </div>
            {cities.length > 0 && filtered.length > 0 && (
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span>Grid</span>
              </div>
            )}
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-red-800 mb-1">Oops! Something went wrong</h3>
            <p className="text-red-600 mb-2 text-sm">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-red-600 text-white px-4 py-1.5 rounded-lg hover:bg-red-700 transition-colors text-sm"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!error && cities.length > 0 && filtered.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
            <div className="flex items-center justify-center mb-3">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No cities found</h3>
            <p className="text-gray-600 mb-3 text-sm">
              Try adjusting your search terms or filters to find more destinations.
            </p>
            <button
              onClick={clearFilters}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
            >
              Clear All Filters
            </button>
          </div>
        )}

        {/* City Grid - Compact spacing */}
        {cities.length > 0 && !error && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {displayed.map((city) => (
                <CityCard key={city.id} city={city} />
              ))}
            </div>

            {/* Infinite Scroll Sentinel */}
            {hasMore && (
              <div
                ref={observerRef}
                className="flex items-center justify-center py-4"
              >
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
          </>
        )}

        {/* Initial Loading State */}
        {cities.length === 0 && !error && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-2"></div>
              <p className="text-gray-600 text-sm">Loading amazing destinations...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}