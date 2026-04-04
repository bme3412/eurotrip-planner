'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, List, BarChart3, GitCompare } from 'lucide-react';
import CityListRow from './CityListRow';
import CityScatterPlot from './CityScatterPlot';
import { TierSection } from '../common/TierBadge';

/**
 * Sort options for city results
 */
const SORT_OPTIONS = [
  { id: 'best', label: 'Best match' },
  { id: 'warmest', label: 'Warmest' },
  { id: 'quietest', label: 'Quietest' },
  { id: 'daylight', label: 'Most daylight' },
];

/**
 * View mode tabs
 */
const VIEW_MODES = [
  { id: 'list', label: 'List', icon: List },
  { id: 'plot', label: 'Plot', icon: BarChart3 },
  { id: 'compare', label: 'Compare', icon: GitCompare },
];

/**
 * Format date range for display
 */
function formatDateRange(startDate, endDate) {
  if (!startDate || !endDate) return '';

  const start = new Date(startDate);
  const end = new Date(endDate);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const startMonth = monthNames[start.getMonth()];
  const endMonth = monthNames[end.getMonth()];
  const startDay = start.getDate();
  const endDay = end.getDate();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}–${endDay}`;
  }
  return `${startMonth} ${startDay} – ${endMonth} ${endDay}`;
}

/**
 * Calculate trip duration in nights
 */
function getTripNights(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.max(0, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
}

/**
 * Crowd level to numeric value for sorting
 */
function crowdLevelToNumber(level) {
  const map = {
    'Very Low': 1,
    'Low': 2,
    'Moderate': 3,
    'High': 4,
    'Very High': 5,
    'Extreme': 6,
  };
  return map[level] || 3;
}

/**
 * Get temperature from city data
 */
function getTemperature(city) {
  // Try V4 breakdown
  if (city.v4?.factors?.timing?.details?.weatherHighC) {
    return city.v4.factors.timing.details.weatherHighC;
  }
  // Try highlights
  const weatherHighlight = city.highlights?.find(h => h.type === 'weather');
  if (weatherHighlight?.name) {
    const match = weatherHighlight.name.match(/(\d+)/);
    if (match) return parseInt(match[1], 10);
  }
  return null;
}

export default function DiscoverResults({ results, onCityClick, startDate, endDate }) {
  const [viewMode, setViewMode] = useState('list');
  const [sortBy, setSortBy] = useState('best');

  // Handle both tiered and flat list formats
  const { isTiered, tiers, flatItems } = useMemo(() => {
    // New tiered format: results.tiers
    if (results?.tiers) {
      return {
        isTiered: true,
        tiers: results.tiers,
        flatItems: Object.values(results.tiers).flatMap(tier => tier.cities || []),
      };
    }
    // Legacy flat format: results.items
    if (results?.items) {
      return {
        isTiered: false,
        tiers: null,
        flatItems: results.items,
      };
    }
    return { isTiered: false, tiers: null, flatItems: [] };
  }, [results]);

  // Sort items based on selected sort option (for non-tier views or custom sorting)
  const sortedItems = useMemo(() => {
    if (!flatItems.length) return [];

    const items = [...flatItems];

    switch (sortBy) {
      case 'warmest':
        return items.sort((a, b) => {
          const tempA = getTemperature(a) ?? -100;
          const tempB = getTemperature(b) ?? -100;
          return tempB - tempA;
        });

      case 'quietest':
        return items.sort((a, b) => {
          const crowdA = crowdLevelToNumber(a.crowdLevel);
          const crowdB = crowdLevelToNumber(b.crowdLevel);
          return crowdA - crowdB;
        });

      case 'daylight':
        return items.sort((a, b) => {
          const northernCountries = ['Norway', 'Sweden', 'Finland', 'Iceland', 'Estonia', 'Latvia', 'Lithuania', 'Denmark', 'UK', 'Ireland'];
          const scoreA = northernCountries.includes(a.country) ? 1 : 0;
          const scoreB = northernCountries.includes(b.country) ? 1 : 0;
          return scoreB - scoreA;
        });

      case 'best':
      default:
        // For "best", maintain tier grouping
        return items;
    }
  }, [flatItems, sortBy]);

  if (flatItems.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
          <MapPin className="h-8 w-8 text-gray-400" />
        </div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">No Destinations Found</h2>
        <p className="text-gray-500">
          Try selecting different dates or expanding your search criteria.
        </p>
      </div>
    );
  }

  const tripNights = getTripNights(startDate, endDate);
  const dateRange = formatDateRange(startDate, endDate);

  return (
    <div className="space-y-6">
      {/* View mode toggle */}
      <div className="flex justify-center">
        <div className="inline-flex bg-gray-100 rounded-full p-1">
          {VIEW_MODES.map((mode) => {
            const Icon = mode.icon;
            const isActive = viewMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => setViewMode(mode.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-gray-800 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                {mode.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Header with count and date range */}
      <div className="space-y-1">
        <h2 className="text-3xl font-bold text-gray-900">
          {flatItems.length} cities for{' '}
          <span className="text-amber-600">{dateRange}</span>
        </h2>
        <p className="text-gray-500">
          {tripNights} nights · ranked by weather, crowds & events across Europe
        </p>
      </div>

      {/* Sort filters */}
      <div className="flex flex-wrap gap-2">
        {SORT_OPTIONS.map((option) => (
          <button
            key={option.id}
            onClick={() => setSortBy(option.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              sortBy === option.id
                ? 'bg-gray-800 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Results list */}
      {viewMode === 'list' && (
        <div className="space-y-6">
          {/* Tiered view when using "best" sort and tiers are available */}
          {isTiered && sortBy === 'best' ? (
            <AnimatePresence mode="popLayout">
              {Object.entries(tiers).map(([tierKey, tier]) => {
                if (!tier.cities || tier.cities.length === 0) return null;
                const tierNumber = parseInt(tierKey.slice(-1), 10);

                return (
                  <motion.div
                    key={tierKey}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-3"
                  >
                    {/* Tier header */}
                    <TierSection
                      tier={tierNumber}
                      label={tier.label}
                      sublabel={tier.sublabel}
                      paragraph={tier.paragraph}
                      cityCount={tier.cities.length}
                    />

                    {/* Cities in this tier */}
                    <div className="space-y-3 pl-2">
                      {tier.cities.map((city, index) => (
                        <motion.div
                          key={city.id || city.cityId}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03, duration: 0.2 }}
                        >
                          <CityListRow
                            city={city}
                            rank={index}
                            onClick={onCityClick}
                            startDate={startDate}
                          />
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          ) : (
            /* Flat list for other sort options */
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {sortedItems.map((city, index) => (
                  <motion.div
                    key={city.id || city.cityId}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.03, duration: 0.2 }}
                  >
                    <CityListRow
                      city={city}
                      rank={index}
                      onClick={onCityClick}
                      startDate={startDate}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* Plot view - Scatter plot */}
      {viewMode === 'plot' && (
        <CityScatterPlot
          cities={sortedItems.slice(0, 30)}
          onCityClick={onCityClick}
        />
      )}

      {/* Compare view placeholder */}
      {viewMode === 'compare' && (
        <div className="bg-gray-50 rounded-2xl p-12 text-center">
          <GitCompare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Compare View Coming Soon</h3>
          <p className="text-gray-500">Side-by-side comparison of your top picks</p>
        </div>
      )}
    </div>
  );
}
