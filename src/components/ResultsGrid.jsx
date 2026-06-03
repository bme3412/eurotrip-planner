'use client';

import { useMemo, useState } from 'react';
import CityListRow from './discover/CityListRow';
import CityDateModal from './discover/CityDateModal';
import ResultsFilterBar from './discover/ResultsFilterBar';
import { normalizeRankedCandidate, rankedCandidateToPlannerParams } from '@/lib/discovery/rankedCandidate';
import { formatDateRange, getNights } from '@/lib/utils/dates';
import { getCityDaylightHours } from '@/lib/daylight';
import { deriveCityVibes, VIBE_DEFS } from '@/lib/discovery/vibes';

const SORT_OPTIONS = [
  { id: 'score', label: 'Best match' },
  { id: 'warmest', label: 'Warmest' },
  { id: 'quietest', label: 'Quietest' },
  { id: 'daylight', label: 'Most daylight' },
];

const MAX_RESULTS = 30;

/** Crowd level → numeric value for sorting. */
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

/** Temperature for sorting — prefer the structured weather field, then highlights. */
function getTemperature(city) {
  if (typeof city.weather?.highC === 'number') return city.weather.highC;
  const weatherHighlight = city.highlights?.find((h) => h.type === 'weather');
  if (weatherHighlight?.name) {
    const match = weatherHighlight.name.match(/(\d+)/);
    if (match) return parseInt(match[1], 10);
  }
  return null;
}

export default function ResultsGrid({
  results,
  sortBy: externalSortBy,
  setSortBy: externalSetSortBy,
  dates,
  onChangeDates,
  onCityClick,
  onStartPlan,
}) {
  const [internalSortBy, setInternalSortBy] = useState('score');
  const sortBy = externalSortBy || internalSortBy;
  const setSortBy = externalSetSortBy || setInternalSortBy;

  const [selectedRegions, setSelectedRegions] = useState([]);
  const [selectedVibes, setSelectedVibes] = useState([]);
  // The city whose date-specific modal is open (with its current rank), or null.
  const [activeCity, setActiveCity] = useState(null);

  // Filter options come from the result set — only offer regions/vibes actually
  // present, so the dropdowns never show a filter that returns nothing.
  const { regionOptions, vibeOptions } = useMemo(() => {
    const regions = new Set();
    const vibes = new Set();
    for (const c of results) {
      if (c.region) regions.add(c.region);
      for (const v of deriveCityVibes(c)) vibes.add(v);
    }
    return {
      regionOptions: [...regions].sort().map((r) => ({ id: r, label: r })),
      vibeOptions: VIBE_DEFS.filter((v) => vibes.has(v.id)).map((v) => ({ id: v.id, label: v.label })),
    };
  }, [results]);

  const filtered = useMemo(() => results.filter((c) => {
    if (selectedRegions.length && !selectedRegions.includes(c.region)) return false;
    if (selectedVibes.length) {
      const cv = deriveCityVibes(c);
      if (!selectedVibes.some((v) => cv.includes(v))) return false;
    }
    return true;
  }), [results, selectedRegions, selectedVibes]);

  const sorted = useMemo(() => {
    const items = [...filtered];
    switch (sortBy) {
      case 'warmest': {
        // Cities without temperature data sort to the MIDDLE (median of known
        // temps), not dead last — unknown ≠ cold.
        const temps = items.map(getTemperature).filter((t) => t != null).sort((a, b) => a - b);
        const median = temps.length ? temps[Math.floor(temps.length / 2)] : 15;
        return items.sort((a, b) => (getTemperature(b) ?? median) - (getTemperature(a) ?? median));
      }
      case 'quietest':
        return items.sort((a, b) => crowdLevelToNumber(a.crowdLevel) - crowdLevelToNumber(b.crowdLevel));
      case 'daylight':
        return items.sort((a, b) =>
          (getCityDaylightHours(b, dates?.start) ?? 0) - (getCityDaylightHours(a, dates?.start) ?? 0)
        );
      case 'score':
      default:
        return items.sort((a, b) =>
          (b.v4?.finalScore ?? b.score ?? 0) - (a.v4?.finalScore ?? a.score ?? 0)
        );
    }
  }, [filtered, sortBy, dates?.start]);

  const visible = sorted.slice(0, MAX_RESULTS);
  const dateRange = formatDateRange(dates?.start, dates?.end);
  const nights = getNights(dates?.start, dates?.end);

  const handleCityClick = (cityId) => {
    // Allow callers to override the default behaviour (e.g. a host page that
    // wants to navigate). Otherwise open the date-specific modal for this city.
    if (onCityClick) { onCityClick(cityId); return; }
    const idx = visible.findIndex((c) => (c.cityId || c.id) === cityId);
    if (idx === -1) return;
    setActiveCity({ city: visible[idx], rank: idx });
  };

  const handleStartPlan = (city, rank) => {
    const candidate = normalizeRankedCandidate(city, { rank, startDate: dates?.start, endDate: dates?.end });
    if (!candidate) return;
    if (onStartPlan) onStartPlan(candidate);
    else window.location.href = `/plan?${rankedCandidateToPlannerParams(candidate).toString()}`;
  };

  const toggle = (setter) => (id) =>
    setter((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const clearFilters = () => { setSelectedRegions([]); setSelectedVibes([]); };

  return (
    <section className="w-full">
      {/* Header */}
      <div className="mb-1 space-y-1">
        {dateRange ? (
          <>
            <h2 className="font-display text-4xl font-semibold leading-tight text-hero-ink">
              {results.length} cities for <span className="text-amber-600">{dateRange}</span>
            </h2>
            <p className="text-hero-ink-muted">
              {nights} nights · ranked by season, crowds &amp; events across Europe
            </p>
          </>
        ) : (
          <h2 className="font-display text-3xl font-semibold text-hero-ink">Your curated picks</h2>
        )}
      </div>

      <ResultsFilterBar
        regionOptions={regionOptions}
        vibeOptions={vibeOptions}
        sortOptions={SORT_OPTIONS}
        selectedRegions={selectedRegions}
        selectedVibes={selectedVibes}
        sortBy={sortBy}
        onToggleRegion={toggle(setSelectedRegions)}
        onToggleVibe={toggle(setSelectedVibes)}
        onSort={setSortBy}
        onClear={clearFilters}
        onChangeDates={onChangeDates}
        shown={visible.length}
        total={results.length}
      />

      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-lg font-semibold text-hero-ink">No cities match these filters</p>
          <p className="mt-1 text-sm text-hero-ink-muted">Try removing a filter to see more options.</p>
          <button
            onClick={clearFilters}
            className="mt-4 rounded-full bg-hero-ink px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="divide-y divide-hero-line border-t border-hero-line">
          {visible.map((city, index) => (
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

      {activeCity && (
        <CityDateModal
          city={activeCity.city}
          rank={activeCity.rank}
          dates={dates}
          onClose={() => setActiveCity(null)}
          onStartPlan={() => {
            handleStartPlan(activeCity.city, activeCity.rank + 1);
            setActiveCity(null);
          }}
        />
      )}
    </section>
  );
}
