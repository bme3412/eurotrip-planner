'use client';

import { useMemo, useState, useRef } from 'react';
import { List, BarChart3, GitCompare, Calendar } from 'lucide-react';
import CityListRow from './discover/CityListRow';
import CityScatterPlot from './discover/CityScatterPlot';
import { normalizeRankedCandidate, rankedCandidateToPlannerParams } from '@/lib/discovery/rankedCandidate';
import { scoreToBand, tierToBand } from '@/lib/scoring/qualitative';
import { formatDateRange, getNights, getLocalMonthIndex } from '@/lib/utils/dates';
import { getDaylightHours } from '@/lib/daylight';

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

  // BUG FIX: rows render id=`city-${cityHref}`, so the lookup must match.
  const scrollToCard = (cityId) => {
    const el = document.getElementById(`city-${cityId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="border-t border-hero-line pt-4 mb-2">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-hero-ink-muted">
          What&apos;s on during {dateRange}
        </p>
      </div>
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {pills.slice(0, 12).map((p, i) => (
          <button
            key={i}
            onClick={() => scrollToCard(p.cityId)}
            className="flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-full bg-white border border-hero-line hover:border-amber-400 hover:bg-amber-50 transition-colors group text-left"
          >
            {p.date && (
              <>
                <span className="text-[11px] font-bold text-amber-600 whitespace-nowrap tabular-nums">{p.date}</span>
                <span className="text-hero-line text-[11px]">·</span>
              </>
            )}
            <span className="text-[11px] font-semibold text-hero-ink whitespace-nowrap">{p.name}</span>
            <span className="text-hero-line text-[11px]">·</span>
            <span className="text-[11px] text-hero-ink-muted whitespace-nowrap">{p.cityName}</span>
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

  const travelMonth = getLocalMonthIndex(dates?.start);

  const sorted = useMemo(() => {
    const items = [...results];

    switch (sortBy) {
      case 'warmest': {
        // Cities without temperature data sort to the MIDDLE (median of known
        // temps), not dead last — we don't know they're cold, just unknown.
        const temps = items.map(getTemperature).filter((t) => t != null).sort((a, b) => a - b);
        const median = temps.length ? temps[Math.floor(temps.length / 2)] : 15;
        return items.sort((a, b) => (getTemperature(b) ?? median) - (getTemperature(a) ?? median));
      }

      case 'quietest':
        return items.sort((a, b) => crowdLevelToNumber(a.crowdLevel) - crowdLevelToNumber(b.crowdLevel));

      case 'daylight':
        // Use the same coarse daylight estimate the rows display, so the sort
        // matches the numbers shown (previously a crude binary northern check).
        return items.sort((a, b) =>
          (getDaylightHours(travelMonth ?? new Date(), b.country) ?? 0) -
          (getDaylightHours(travelMonth ?? new Date(), a.country) ?? 0)
        );

      case 'score':
      case 'popularity':
      case 'value':
      default:
        return items.sort((a, b) =>
          (b.v4?.finalScore ?? b.score ?? 0) - (a.v4?.finalScore ?? a.score ?? 0)
        );
    }
  }, [results, sortBy, travelMonth]);

  const dateRange = formatDateRange(dates?.start, dates?.end);
  const nights = getNights(dates?.start, dates?.end);
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
    <section className="w-full">
      {/* Editorial segmented tabs — left-aligned, hairline underline */}
      <div className="flex items-center gap-6 border-b border-hero-line">
        {VIEW_MODES.map((mode) => {
          const Icon = mode.icon;
          const isActive = viewMode === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => setViewMode(mode.id)}
              className={`flex items-center gap-1.5 -mb-px border-b-2 pb-2.5 pt-1 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-hero-ink text-hero-ink'
                  : 'border-transparent text-hero-ink-muted hover:text-hero-ink'
              }`}
            >
              <Icon className="w-4 h-4" />
              {mode.label}
            </button>
          );
        })}
      </div>

      {/* Header (standalone / non-modal) */}
      {!hideHeader && (
        <div className="pt-6 mb-6">
          <div className="space-y-1 mb-4">
            {dateRange ? (
              <>
                <h2 className="font-display text-4xl font-semibold text-hero-ink leading-tight">
                  {results.length} cities for{' '}
                  <span className="text-amber-600">{dateRange}</span>
                </h2>
                <p className="text-hero-ink-muted">
                  {nights} nights · ranked by season, crowds &amp; events across Europe
                </p>
              </>
            ) : (
              <h2 className="font-display text-3xl font-semibold text-hero-ink">Your curated picks</h2>
            )}
          </div>

          {/* Sort filter pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-hero-ink-muted mr-1">Sort</span>
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.id}
                onClick={() => setSortBy(option.id)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
                  sortBy === option.id
                    ? 'bg-hero-ink text-white'
                    : 'bg-white border border-hero-line text-hero-ink hover:border-hero-ink/40'
                }`}
              >
                {option.label}
              </button>
            ))}

            {onChangeDates && dateRange && (
              <button
                onClick={onChangeDates}
                className="ml-auto text-sm font-medium text-hero-accent hover:text-blue-700 transition-colors"
              >
                ← Change dates
              </button>
            )}
          </div>
        </div>
      )}

      {/* Sort row (modal mode) — aligned to the same column */}
      {hideHeader && (
        <div className="flex flex-wrap items-center gap-2 pt-5 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-hero-ink-muted mr-1">Sort</span>
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={() => setSortBy(option.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                sortBy === option.id
                  ? 'bg-hero-ink text-white'
                  : 'bg-white border border-hero-line text-hero-ink hover:border-hero-ink/40'
              }`}
            >
              {option.label}
            </button>
          ))}
          {onChangeDates && (
            <button
              onClick={onChangeDates}
              className="ml-auto text-sm font-medium text-hero-accent hover:text-blue-700 transition-colors"
            >
              ← Change dates
            </button>
          )}
        </div>
      )}

      {/* Event strip */}
      {dateRange && <EventStrip results={results} dateRange={dateRange} />}

      {/* List view — editorial index, hairline-divided entries */}
      {viewMode === 'list' && (
        <div className="divide-y divide-hero-line border-t border-hero-line">
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
        <div className="pt-6">
          <CityScatterPlot
            cities={sorted.slice(0, 30)}
            onCityClick={handleCityClick}
          />
        </div>
      )}

      {/* Compare view */}
      {viewMode === 'compare' && (
        <div className="mt-6 rounded-2xl border border-hero-line bg-gray-50 p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <GitCompare className="h-5 w-5 text-hero-ink-muted" />
                <h3 className="font-display text-xl font-semibold text-hero-ink">Compare ranked picks</h3>
              </div>
              <p className="mt-1 text-sm text-hero-ink-muted">
                Select up to 5 cities and turn them into a draft route.
              </p>
            </div>
            <button
              type="button"
              disabled={selectedCandidates.length === 0}
              onClick={handlePlanSelected}
              className="rounded-full bg-hero-ink px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
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
                    selected ? 'border-hero-ink shadow-sm ring-2 ring-hero-ink/10' : 'border-hero-line hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-hero-ink-muted">
                        Rank {candidate.rank}
                      </p>
                      <h4 className="mt-1 font-display text-lg font-semibold text-hero-ink">
                        {candidate.name}
                        {candidate.country && <span className="font-sans text-sm font-medium text-hero-ink-muted"> · {candidate.country}</span>}
                      </h4>
                    </div>
                    <span className={`mt-1 h-5 w-5 rounded-full border ${selected ? 'border-hero-ink bg-hero-ink' : 'border-gray-300'}`} />
                  </div>
                  {candidate.reason && (
                    <p className="mt-3 line-clamp-2 text-sm text-hero-ink-muted">{candidate.reason}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-hero-ink-muted">
                    {candidate.weather?.label && <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">{candidate.weather.label}</span>}
                    {candidate.crowds && <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">{candidate.crowds} crowds</span>}
                    {(candidate.tier != null || candidate.score != null) && (() => {
                      const band = candidate.tier ? tierToBand(candidate.tier) : scoreToBand(candidate.score);
                      return <span className={`rounded-full px-2 py-1 ${band.bg} ${band.text}`}>{band.label}</span>;
                    })()}
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
