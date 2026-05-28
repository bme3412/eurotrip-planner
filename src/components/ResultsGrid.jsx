'use client';

import { useMemo, useState, useRef } from 'react';
import { List, BarChart3, GitCompare } from 'lucide-react';
import CityListRow from './discover/CityListRow';
import CityScatterPlot from './discover/CityScatterPlot';
import { normalizeRankedCandidate, rankedCandidateToPlannerParams } from '@/lib/discovery/rankedCandidate';

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

export default function ResultsGrid({ results, sortBy: externalSortBy, setSortBy: externalSetSortBy, dates, onChangeDates, hideHeader = false, onCityClick, onStartPlan }) {
  const [viewMode, setViewMode] = useState('list');
  const [internalSortBy, setInternalSortBy] = useState('score');
  const [selectedCityIds, setSelectedCityIds] = useState(() => new Set());

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
  const ranked = useMemo(() => (
    sorted.map((city, index) => ({
      source: city,
      candidate: normalizeRankedCandidate(city, {
        rank: index + 1,
        startDate: dates?.start,
        endDate: dates?.end,
      }),
    })).filter((item) => item.candidate)
  ), [dates?.end, dates?.start, sorted]);

  const handleCityClick = (cityId) => {
    if (onCityClick) {
      onCityClick(cityId);
    } else {
      window.location.href = `/city-guides/${cityId}`;
    }
  };

  const handleStartPlan = (city, rank) => {
    const candidate = normalizeRankedCandidate(city, {
      rank,
      startDate: dates?.start,
      endDate: dates?.end,
    });
    if (!candidate) return;
    if (onStartPlan) {
      onStartPlan(candidate);
      return;
    }
    window.location.href = `/plan?${rankedCandidateToPlannerParams(candidate).toString()}`;
  };

  const toggleSelected = (candidate) => {
    setSelectedCityIds((prev) => {
      const next = new Set(prev);
      if (next.has(candidate.cityId)) next.delete(candidate.cityId);
      else if (next.size < 5) next.add(candidate.cityId);
      return next;
    });
  };

  const selectedCandidates = ranked
    .map((item) => item.candidate)
    .filter((candidate) => selectedCityIds.has(candidate.cityId));

  const handlePlanSelected = () => {
    if (selectedCandidates.length === 0) return;
    const params = new URLSearchParams();
    params.set('mode', 'conversation');
    params.set('cities', selectedCandidates.map((city) => city.cityId).join(','));
    if (dates?.start) params.set('startDate', dates.start);
    if (dates?.end) params.set('endDate', dates.end);
    const cityNames = selectedCandidates.map((city) => city.name).join(', ');
    const reasons = selectedCandidates
      .map((city) => `${city.name}${city.rank ? ` (#${city.rank})` : ''}${city.reason ? `: ${city.reason}` : ''}`)
      .join('; ');
    params.set('q', `Build a Europe route using these ranked picks: ${cityNames}. Use the selected dates if available and explain the tradeoffs. Ranking context: ${reasons}`);
    window.location.href = `/plan?${params.toString()}`;
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
              onStartPlan={() => handleStartPlan(city, index + 1)}
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

      {/* Compare view */}
      {viewMode === 'compare' && (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <GitCompare className="h-5 w-5 text-gray-500" />
                <h3 className="text-lg font-semibold text-gray-800">Compare ranked picks</h3>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Select up to 5 cities and turn them into a draft route.
              </p>
            </div>
            <button
              type="button"
              disabled={selectedCandidates.length === 0}
              onClick={handlePlanSelected}
              className="rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              Plan selected {selectedCandidates.length > 0 ? `(${selectedCandidates.length})` : ''}
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {ranked.slice(0, 12).map(({ candidate }) => {
              const selected = selectedCityIds.has(candidate.cityId);
              return (
                <button
                  type="button"
                  key={candidate.cityId}
                  onClick={() => toggleSelected(candidate)}
                  className={`rounded-2xl border bg-white p-4 text-left transition-all ${
                    selected ? 'border-gray-900 shadow-sm ring-2 ring-gray-900/10' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
                        Rank {candidate.rank}
                      </p>
                      <h4 className="mt-1 text-base font-bold text-gray-900">
                        {candidate.name}
                        {candidate.country && <span className="font-medium text-gray-400"> · {candidate.country}</span>}
                      </h4>
                    </div>
                    <span className={`mt-1 h-5 w-5 rounded-full border ${selected ? 'border-gray-900 bg-gray-900' : 'border-gray-300'}`} />
                  </div>
                  {candidate.reason && (
                    <p className="mt-3 line-clamp-2 text-sm text-gray-600">{candidate.reason}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                    {candidate.weather?.label && <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">{candidate.weather.label}</span>}
                    {candidate.crowds && <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">{candidate.crowds} crowds</span>}
                    {candidate.score != null && <span className="rounded-full bg-gray-100 px-2 py-1">Score {Math.round(Number(candidate.score))}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
