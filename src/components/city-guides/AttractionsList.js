'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import AttractionCard from './attractions/AttractionCard';
import ExperienceDetailModal from './attractions/ExperienceDetailModal';
import CuratedFilters from './attractions/CuratedFilters';
import QuickFilters from './attractions/QuickFilters';
import TimeOfDayNav from './attractions/TimeOfDayNav';
import LoadingSkeleton from './attractions/LoadingSkeleton';
import { useExperienceData } from './attractions/hooks/useExperienceData';
import { useGoogleEnrichment } from './attractions/hooks/useGoogleEnrichment';
import { usePagination } from './attractions/hooks/usePagination';
import { EXPERIENCE_BUCKETS, MONTHS } from './attractions/lib/constants';
import { capitalizeCity } from './attractions/lib/display';
import {
  computeScoringBounds,
  getLensScore,
  getMonthFromDate,
  getSeasonalScore,
  isDateInRange,
  matchesCuratedFilter,
} from './attractions/lib/scoring';

/**
 * AttractionsList — orchestrates the per-city "Things to do" tab.
 *
 * Responsibilities kept here:
 *   • UI state (search, curated filter, date filter, active categories)
 *   • Composition of the data-loading + Google-enrichment hooks
 *   • Filter / sort pipeline that produces `filteredAttractions`
 *
 * Everything else (cards, filter pills, pagination, scoring math, loading
 * skeleton) lives in `./attractions/`.
 */
const AttractionsList = ({ attractions, categories, cityName, monthlyData, experiencesUrl = null, limit = Infinity, isFavorite: providedIsFavorite, toggle: providedToggle }) => {
  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilterType, setDateFilterType] = useState('none');
  const [selectedDate] = useState('');
  const [startDate] = useState('');
  const [endDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [quickFilters, setQuickFilters] = useState({ indoorOnly: false, outdoorOnly: false, freeOnly: false, shortVisitsOnly: false, budgetOnly: false });
  const [sortOption] = useState('score-desc');
  const [activeCategories, setActiveCategories] = useState([]);
  const [curatedFilter, setCuratedFilter] = useState('all');
  const [rankingLens] = useState('overall');
  const [toastMessage, setToastMessage] = useState(null);
  const [detailExperience, setDetailExperience] = useState(null);

  // Favorites come from the instance lifted to CityPageClient (single source of
  // truth shared with the shortlist bar). Memoized no-op fallbacks keep this
  // usable — and identity-stable — if it's ever rendered without the props.
  const isFavorite = useMemo(() => providedIsFavorite || (() => false), [providedIsFavorite]);
  const toggleFavoriteHook = useMemo(
    () => providedToggle || (async () => ({ action: 'noop', id: null })),
    [providedToggle],
  );

  // Data
  const { experiences, isLoading } = useExperienceData({ experiencesUrl, cityName, limit });
  const { applyGoogleData, googleLoading, enrichedTick } = useGoogleEnrichment(cityName);

  const displayCityName = capitalizeCity(cityName);

  const showToast = useCallback((message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  const toggleFavorite = useCallback(async (item) => {
    const { action, id } = await toggleFavoriteHook(item);
    if (action === 'added') showToast(`Saved "${id}" to favorites`);
    else if (action === 'removed') showToast(`Removed "${id}" from favorites`);
  }, [toggleFavoriteHook, showToast]);

  // Choose experiences from JSON when present, fall back to the prop, then
  // merge Google Places data on top.
  const dataSource = useMemo(() => {
    const base = Array.isArray(experiences) && experiences.length > 0 ? experiences : attractions;
    return applyGoogleData(base) ?? base;
    // enrichedTick triggers re-compute when Google data lands
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [experiences, attractions, applyGoogleData, enrichedTick]);

  const activeCategorySet = useMemo(() => new Set(activeCategories), [activeCategories]);

  // Time-of-day jump nav: buckets present in this city's experiences payload
  // (attraction-site fallbacks carry no `category`, so this stays empty and
  // the nav hides). Counts are pre-filter totals — stable while browsing.
  const timeOfDayBuckets = useMemo(() => {
    if (!Array.isArray(dataSource)) return [];
    const counts = new Map();
    for (const item of dataSource) {
      const key = typeof item?.category === 'string' ? item.category.trim().toLowerCase() : '';
      if (key) counts.set(key, (counts.get(key) || 0) + 1);
    }
    return EXPERIENCE_BUCKETS
      .filter((b) => counts.has(b.key))
      .map((b) => ({ ...b, count: counts.get(b.key) }));
  }, [dataSource]);

  const activeBucket = activeCategories.length === 1 ? activeCategories[0] : null;
  const resultsRef = useRef(null);

  const handleBucketSelect = useCallback((key) => {
    setActiveCategories(key == null ? [] : [key]);
    // Deep in the list, the re-filtered results start above the viewport —
    // bring their top back into view so the switch is visible.
    const rect = resultsRef.current?.getBoundingClientRect();
    if (rect && rect.top < 0) {
      const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
      resultsRef.current.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' });
    }
  }, []);

  // Indoor / outdoor are mutually exclusive (the filter pipeline excludes the
  // opposite), so turning one on clears the other.
  const toggleQuickFilter = useCallback((key) => {
    setQuickFilters((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (key === 'indoorOnly' && next.indoorOnly) next.outdoorOnly = false;
      if (key === 'outdoorOnly' && next.outdoorOnly) next.indoorOnly = false;
      return next;
    });
  }, []);

  const toggleCategory = useCallback((value) => {
    setActiveCategories((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value],
    );
  }, []);

  const getEffectiveMonth = useCallback(() => {
    if (dateFilterType === 'exact' && selectedDate) return getMonthFromDate(selectedDate);
    if (dateFilterType === 'range' && startDate && endDate) return getMonthFromDate(startDate);
    if (dateFilterType === 'month') return selectedMonth;
    return 'all';
  }, [dateFilterType, selectedDate, startDate, endDate, selectedMonth]);

  const scoringBounds = useMemo(() => computeScoringBounds(dataSource), [dataSource]);

  const filteredAttractions = useMemo(() => {
    const effectiveMonth = getEffectiveMonth();
    if (!Array.isArray(dataSource)) return [];

    return dataSource
      .filter((attraction) => {
        if (curatedFilter !== 'all' && !matchesCuratedFilter(attraction, curatedFilter)) return false;

        const normalizedCategory = typeof attraction.category === 'string' ? attraction.category.trim().toLowerCase() : '';
        if (activeCategorySet.size > 0 && !activeCategorySet.has(normalizedCategory)) return false;

        if (searchTerm
          && !attraction.name?.toLowerCase().includes(searchTerm.toLowerCase())
          && !attraction.description?.toLowerCase().includes(searchTerm.toLowerCase())) {
          return false;
        }

        if (quickFilters.indoorOnly && attraction.indoor === false) return false;
        if (quickFilters.outdoorOnly && attraction.indoor === true) return false;
        if (quickFilters.freeOnly && String(attraction.price_range || '').toLowerCase().includes('free') === false) return false;
        if (quickFilters.budgetOnly && !['budget', 'free'].some((token) => String(attraction.price_range || '').toLowerCase().includes(token))) return false;
        if (quickFilters.shortVisitsOnly && !(Number(attraction?.ratings?.suggested_duration_hours) > 0 && Number(attraction?.ratings?.suggested_duration_hours) <= 1.5)) return false;

        if (dateFilterType === 'exact' && selectedDate) {
          if (attraction.available_dates && !attraction.available_dates.includes(selectedDate)) return false;
        } else if (dateFilterType === 'range' && startDate && endDate) {
          if (attraction.available_dates && !attraction.available_dates.some((date) => isDateInRange(date, startDate, endDate))) return false;
        } else if (dateFilterType === 'month' && selectedMonth !== 'all') {
          if (attraction.available_dates && !attraction.available_dates.some((date) => getMonthFromDate(date) === selectedMonth)) return false;
        }

        return true;
      })
      .map((attraction) => {
        const seasonalScore = getSeasonalScore(attraction, effectiveMonth, monthlyData);
        const lensScore = getLensScore(attraction, { rankingLens, scoringBounds, dateFilterType, seasonalScore });
        return { ...attraction, seasonalScore, lensScore };
      })
      .sort((a, b) => {
        const lensDiffDesc = (b.lensScore || 0) - (a.lensScore || 0);
        const lensDiffAsc = -lensDiffDesc;
        const seasonalDiffDesc = (b.seasonalScore || 0) - (a.seasonalScore || 0);
        const seasonalDiffAsc = -seasonalDiffDesc;
        const compDiffDesc = (b.compositeScore || 0) - (a.compositeScore || 0);
        const compDiffAsc = -compDiffDesc;
        const nameDiffAsc = String(a.name || '').localeCompare(String(b.name || ''));
        const nameDiffDesc = -nameDiffAsc;
        const categoryDiffAsc = String(a.category || '').localeCompare(String(b.category || ''));
        const categoryDiffDesc = -categoryDiffAsc;
        const culturalDiffDesc = (b.ratings?.cultural_significance || 0) - (a.ratings?.cultural_significance || 0);
        const culturalDiffAsc = -culturalDiffDesc;

        switch (sortOption) {
          case 'score-asc':
            if (lensDiffAsc !== 0) return lensDiffAsc;
            if (seasonalDiffAsc !== 0) return seasonalDiffAsc;
            if (compDiffAsc !== 0) return compDiffAsc;
            if (nameDiffAsc !== 0) return nameDiffAsc;
            return culturalDiffAsc;
          case 'name-asc':
            if (nameDiffAsc !== 0) return nameDiffAsc;
            if (categoryDiffAsc !== 0) return categoryDiffAsc;
            return lensDiffDesc;
          case 'name-desc':
            if (nameDiffDesc !== 0) return nameDiffDesc;
            if (categoryDiffDesc !== 0) return categoryDiffDesc;
            return lensDiffDesc;
          case 'category-asc':
            if (categoryDiffAsc !== 0) return categoryDiffAsc;
            if (nameDiffAsc !== 0) return nameDiffAsc;
            return lensDiffDesc;
          case 'category-desc':
            if (categoryDiffDesc !== 0) return categoryDiffDesc;
            if (nameDiffDesc !== 0) return nameDiffDesc;
            return lensDiffDesc;
          case 'score-desc':
          default:
            if (lensDiffDesc !== 0) return lensDiffDesc;
            if (seasonalDiffDesc !== 0) return seasonalDiffDesc;
            if (compDiffDesc !== 0) return compDiffDesc;
            if (nameDiffAsc !== 0) return nameDiffAsc;
            return culturalDiffDesc;
        }
      });
  }, [dataSource, searchTerm, quickFilters, dateFilterType, selectedDate, startDate, endDate, selectedMonth, getEffectiveMonth, activeCategorySet, sortOption, curatedFilter, monthlyData, rankingLens, scoringBounds]);

  // Spotlight picks: editorially flagged items (data `spotlight: 1..n`) win,
  // in their flagged order; score order fills any remaining slots. Flagged
  // items still respect the active filters since they're drawn from
  // `filteredAttractions`.
  const highlightAttractions = useMemo(() => {
    const flagged = filteredAttractions
      .filter((a) => typeof a.spotlight === 'number')
      .sort((a, b) => a.spotlight - b.spotlight)
      .slice(0, 4);
    if (flagged.length >= 4) return flagged;
    const flaggedSet = new Set(flagged);
    return [...flagged, ...filteredAttractions.filter((a) => !flaggedSet.has(a))].slice(0, 4);
  }, [filteredAttractions]);
  const remainingAttractions = useMemo(() => {
    const highlightSet = new Set(highlightAttractions);
    return filteredAttractions.filter((a) => !highlightSet.has(a));
  }, [filteredAttractions, highlightAttractions]);

  const hasActiveQuickFilters = useMemo(
    () => Object.values(quickFilters).some(Boolean)
      || searchTerm.trim() !== ''
      || dateFilterType !== 'none'
      || activeCategories.length > 0
      || curatedFilter !== 'all',
    [quickFilters, searchTerm, dateFilterType, activeCategories, curatedFilter],
  );

  const { visibleCount, containerRef } = usePagination({ total: remainingAttractions.length });

  const getDateFilterDisplay = () => {
    switch (dateFilterType) {
      case 'exact':
        return selectedDate ? `📅 ${new Date(selectedDate).toLocaleDateString()}` : '📅 Select Date';
      case 'range':
        return (startDate && endDate) ? `📅 ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}` : '📅 Select Date Range';
      case 'month': {
        const month = MONTHS.find((m) => m.value === selectedMonth);
        return month ? `${month.icon} ${month.label}` : '📅 Select Month';
      }
      default:
        return '📅 No Date Filter';
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Discover {displayCityName}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {filteredAttractions.length} experiences to explore
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasActiveQuickFilters && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setQuickFilters({ indoorOnly: false, outdoorOnly: false, freeOnly: false, shortVisitsOnly: false, budgetOnly: false });
                setDateFilterType('none');
                setSelectedMonth('all');
                setActiveCategories([]);
                setCuratedFilter('all');
              }}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Curated Collection Filters */}
      <CuratedFilters active={curatedFilter} onSelect={setCuratedFilter} />

      {/* Quick toggles + category chips (multi-select) */}
      <QuickFilters
        quickFilters={quickFilters}
        onToggleQuickFilter={toggleQuickFilter}
        categories={categories}
        activeCategories={activeCategories}
        onToggleCategory={toggleCategory}
      />

      {/* Sticky time-of-day jump nav — follows the reader down the list */}
      <TimeOfDayNav
        buckets={timeOfDayBuckets}
        totalCount={dataSource?.length || 0}
        active={activeBucket}
        onSelect={handleBucketSelect}
      />

      <div ref={resultsRef} className="scroll-mt-32 space-y-6">
      {/* Loading State */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : highlightAttractions.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">Spotlight picks</h2>
          <div className="space-y-4">
            {highlightAttractions.map((attraction, index) => (
              <AttractionCard
                key={attraction.id || `highlight-${index}`}
                attraction={attraction}
                indexForPriority={index}
                isFavorite={isFavorite}
                onToggleFavorite={toggleFavorite}
                onOpenDetail={setDetailExperience}
                cityName={displayCityName}
              />
            ))}
          </div>
        </section>
      )}

      {filteredAttractions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 px-6 py-12 text-center">
          <div className="text-4xl">🧭</div>
          <h3 className="mt-3 text-lg font-semibold text-slate-900">No experiences match right now</h3>
          <p className="mt-2 text-sm text-slate-600">
            Try clearing a filter or widening your search — we&apos;ll surface fresh ideas instantly.
          </p>
        </div>
      ) : (
        <section ref={containerRef} className="space-y-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <h2 className="text-xl font-semibold text-slate-900">All curated experiences</h2>
            <div className="flex flex-wrap gap-2 text-xs text-slate-500 md:text-sm">
              {googleLoading && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-600 animate-pulse">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                  Loading live ratings &amp; photos...
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                {filteredAttractions.length} total
              </span>
              {dateFilterType !== 'none' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-700">
                  Focused on {getDateFilterDisplay()}
                </span>
              )}
            </div>
          </div>

          {remainingAttractions.length > 0 ? (
            <div className="space-y-4">
              {remainingAttractions.slice(0, visibleCount).map((attraction, index) => (
                <AttractionCard
                  key={attraction.id || `experience-${highlightAttractions.length + index}`}
                  attraction={attraction}
                  indexForPriority={highlightAttractions.length + index}
                  isFavorite={isFavorite}
                  onToggleFavorite={toggleFavorite}
                  onOpenDetail={setDetailExperience}
                  cityName={displayCityName}
                />
              ))}
            </div>
          ) : (
            highlightAttractions.length > 0 && (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-6 py-6 text-sm text-gray-600">
                You&apos;ve already seen every standout for this lens in the spotlight section above.
              </div>
            )
          )}
        </section>
      )}
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-gray-900 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3">
            <Check className="h-5 w-5 text-emerald-400" />
            <span className="text-sm font-medium">{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Full experience detail */}
      <ExperienceDetailModal
        experience={detailExperience}
        onClose={() => setDetailExperience(null)}
        isFavorite={isFavorite}
        onToggleFavorite={toggleFavorite}
        cityName={displayCityName}
      />
    </div>
  );
};

export default AttractionsList;
