'use client';

import { useMemo, useState, useRef } from 'react';
import { List, BarChart3, GitCompare } from 'lucide-react';
import CityListRow from './discover/CityListRow';
import CityScatterPlot from './discover/CityScatterPlot';

/**
 * Sort options
 */
const SORT_OPTIONS = [
  { id: 'score', label: 'Best match' },
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

function formatDateRange(dates) {
  if (!dates?.start || !dates?.end) return null;
  const fmt = (d) =>
    new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(dates.start)} – ${fmt(dates.end)}`;
}

function getNights(dates) {
  if (!dates?.start || !dates?.end) return null;
  const diff = new Date(dates.end) - new Date(dates.start);
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function CalendarIcon({ className = 'w-3.5 h-3.5' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

/**
 * Event strip showing what's happening during the trip
 */
function EventStrip({ results, dateRange }) {
  const scrollRef = useRef(null);

  const seen = new Set();
  const pills = [];
  for (const r of results) {
    for (const h of (r.highlights || [])) {
      if (h.type !== 'event') continue;
      const key = `${h.name}-${r.cityId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      pills.push({ ...h, cityName: r.cityName || r.title, cityId: r.cityId });
    }
  }

  pills.sort((a, b) => (a.sortKey ?? 999) - (b.sortKey ?? 999));

  if (pills.length === 0) return null;

  const scrollToCard = (cityId) => {
    const el = document.getElementById(cityId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
      <p className="text-xs font-bold text-amber-700 mb-2.5 uppercase tracking-wide">
        During {dateRange} across Europe
      </p>
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {pills.slice(0, 12).map((p, i) => (
          <button
            key={i}
            onClick={() => scrollToCard(p.cityId)}
            className="flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-full bg-white border border-amber-200 hover:border-amber-400 hover:bg-amber-100 transition-colors group text-left"
          >
            <CalendarIcon className="w-3 h-3 text-amber-500 shrink-0" />
            <span className="text-[11px] font-bold text-amber-700 whitespace-nowrap">{p.date}</span>
            <span className="text-amber-300 text-[11px]">·</span>
            <span className="text-[11px] font-semibold text-gray-700 whitespace-nowrap group-hover:text-gray-900">{p.name}</span>
            <span className="text-gray-300 text-[11px]">·</span>
            <span className="text-[11px] text-gray-500 whitespace-nowrap">{p.cityName}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Crowd level to numeric value for sorting
 */
function crowdLevelToNumber(level) {
  const map = {
    'Very Low': 1, 'very low': 1,
    'Low': 2, 'low': 2,
    'Moderate': 3, 'moderate': 3,
    'High': 4, 'high': 4,
    'Very High': 5, 'very high': 5,
    'Extreme': 6, 'extreme': 6,
  };
  return map[level] || 3;
}

/**
 * Get temperature from city data
 */
function getTemperature(city) {
  const weatherHighlight = city.highlights?.find(h => h.type === 'weather');
  if (weatherHighlight?.name) {
    const match = weatherHighlight.name.match(/(\d+)/);
    if (match) return parseInt(match[1], 10);
  }
  return null;
}

export default function ResultsGrid({ results, sortBy: externalSortBy, setSortBy: externalSetSortBy, dates, onChangeDates, hideHeader = false, onCityClick }) {
  const [viewMode, setViewMode] = useState('list');
  const [internalSortBy, setInternalSortBy] = useState('score');

  // Use external sort state if provided, otherwise use internal
  const sortBy = externalSortBy || internalSortBy;
  const setSortBy = externalSetSortBy || setInternalSortBy;

  const sorted = useMemo(() => {
    const items = [...results];

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

      case 'score':
      case 'popularity':
      case 'value':
      default:
        return items.sort((a, b) => {
          const scoreA = a.v4?.finalScore ?? (a.score || 0) * 20;
          const scoreB = b.v4?.finalScore ?? (b.score || 0) * 20;
          return scoreB - scoreA;
        });
    }
  }, [results, sortBy]);

  const dateRange = formatDateRange(dates);
  const nights = getNights(dates);

  const handleCityClick = (cityId) => {
    if (onCityClick) {
      onCityClick(cityId);
    } else {
      window.location.href = `/city-guides/${cityId}`;
    }
  };

  return (
    <section className="mx-auto max-w-5xl">
      {/* View mode toggle */}
      <div className="flex justify-center mb-6">
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

      {/* Header */}
      {!hideHeader && (
        <div className="mb-6">
          <div className="space-y-1 mb-4">
            {dateRange ? (
              <>
                <h2 className="text-3xl font-bold text-gray-900">
                  {results.length} cities for{' '}
                  <span className="text-amber-600">{dateRange}</span>
                </h2>
                <p className="text-gray-500">
                  {nights} nights · ranked by weather, crowds & events across Europe
                </p>
              </>
            ) : (
              <h2 className="text-2xl font-bold text-gray-900">Your curated picks</h2>
            )}
          </div>

          {/* Sort filter pills */}
          <div className="flex flex-wrap items-center gap-2">
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

            {onChangeDates && dateRange && (
              <button
                onClick={onChangeDates}
                className="ml-auto text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
              >
                ← Change dates
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modal header (when hideHeader) */}
      {hideHeader && (
        <div className="flex items-center justify-between mb-4">
          {onChangeDates && (
            <button
              onClick={onChangeDates}
              className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
            >
              ← Change dates
            </button>
          )}
          <div className="flex flex-wrap gap-2 ml-auto">
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.id}
                onClick={() => setSortBy(option.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  sortBy === option.id
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Event strip */}
      {dateRange && <EventStrip results={results} dateRange={dateRange} />}

      {/* List view */}
      {viewMode === 'list' && (
        <div className="space-y-3">
          {sorted.slice(0, 30).map((city, index) => (
            <CityListRow
              key={city.id || city.cityId || index}
              city={city}
              rank={index}
              onClick={handleCityClick}
              startDate={dates?.start}
            />
          ))}
        </div>
      )}

      {/* Plot view - Scatter plot */}
      {viewMode === 'plot' && (
        <CityScatterPlot
          cities={sorted.slice(0, 30)}
          onCityClick={handleCityClick}
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
    </section>
  );
}
