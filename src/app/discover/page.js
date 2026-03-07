'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Sparkles, Users, TrendingUp } from 'lucide-react';
import DiscoverResults from '@/components/discover/DiscoverResults';

const TRAVELER_TYPES = [
  { id: 'all', label: 'Everyone', icon: Users },
  { id: 'couples', label: 'Couples', icon: null },
  { id: 'families', label: 'Families', icon: null },
  { id: 'solo', label: 'Solo', icon: null },
  { id: 'budget', label: 'Budget', icon: null },
  { id: 'luxury', label: 'Luxury', icon: null },
];

export default function DiscoverPage() {
  const router = useRouter();

  // Date state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [travelerType, setTravelerType] = useState('all');

  // Results state
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Calculate trip duration
  const tripDuration = startDate && endDate
    ? Math.max(1, Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)))
    : 0;

  // Fetch suggestions
  const handleSearch = useCallback(async () => {
    if (!startDate || !endDate) return;

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
        limit: '30',
        v: '4',
      });

      if (travelerType && travelerType !== 'all') {
        params.append('travelerType', travelerType);
      }

      const response = await fetch(`/api/suggestions?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      console.error('Search error:', err);
      setError('Unable to load suggestions. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, travelerType]);

  // Handle city click
  const handleCityClick = (cityId) => {
    router.push(`/city-guides/${cityId}`);
  };

  const isSearchDisabled = !startDate || !endDate || loading;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/50 via-white to-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Discover</h1>
                <p className="text-sm text-gray-500">Find the best destinations for your dates</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Search Panel */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-8">
          <div className="grid md:grid-cols-[1fr,1fr,auto,auto] gap-4 items-end">
            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline h-4 w-4 mr-1.5 text-gray-400" />
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900
                         focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline h-4 w-4 mr-1.5 text-gray-400" />
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900
                         focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Traveler Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Users className="inline h-4 w-4 mr-1.5 text-gray-400" />
                Traveler Type
              </label>
              <select
                value={travelerType}
                onChange={(e) => setTravelerType(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900
                         focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all
                         appearance-none cursor-pointer"
              >
                {TRAVELER_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Button */}
            <button
              onClick={handleSearch}
              disabled={isSearchDisabled}
              className="px-8 py-3 rounded-xl font-semibold transition-all
                       bg-gradient-to-r from-amber-500 to-orange-500 text-white
                       hover:from-amber-600 hover:to-orange-600
                       disabled:opacity-50 disabled:cursor-not-allowed
                       focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Searching...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Find Best Cities
                </span>
              )}
            </button>
          </div>

          {/* Trip duration indicator */}
          {tripDuration > 0 && (
            <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
              <Calendar className="h-4 w-4" />
              <span>
                Trip Duration: <span className="font-semibold text-gray-900">{tripDuration} days</span>
              </span>
            </div>
          )}
        </div>

        {/* Results Section */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {!hasSearched && !loading && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <Calendar className="h-8 w-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Select Your Travel Dates</h2>
            <p className="text-gray-500 max-w-md mx-auto">
              Enter your travel dates to discover the best European destinations ranked by weather, events, and crowd levels.
            </p>
          </div>
        )}

        {loading && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 mb-4">
              <div className="h-8 w-8 border-3 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Finding the Best Destinations...</h2>
            <p className="text-gray-500">Analyzing weather, events, and crowd data for your dates</p>
          </div>
        )}

        {results && !loading && (
          <DiscoverResults
            results={results}
            onCityClick={handleCityClick}
            startDate={startDate}
            endDate={endDate}
          />
        )}
      </main>
    </div>
  );
}
