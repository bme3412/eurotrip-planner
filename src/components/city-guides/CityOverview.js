'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getCityDisplayName, getCityNickname, getCityDescription } from '@/utils/cityDataUtils';
import { fetchCityDataUrl, getCityPaths } from '@/lib/city-data';

import {
  buildCalendarData,
  buildMonthInsights,
  computeBestTravelerMonth,
  computeValueMonths,
  computeTripFitRecommendations,
} from './overview/lib/derived';
import { getCityIcon } from './overview/lib/cityIcon';
import { getSeasonalNeighborhoods } from './overview/lib/seasonalNeighborhoods';

import MonthlyCalendar from './overview/MonthlyCalendar';
import BestTimeKpiCards from './overview/BestTimeKpiCards';
import TravelerFilter from './overview/TravelerFilter';
import CompareMonthsPanel from './overview/CompareMonthsPanel';
import TripFitPanel from './overview/TripFitPanel';
import SelectedMonthPanel from './overview/SelectedMonthPanel';
import SeasonalProse from './overview/SeasonalProse';
import SeasonalNeighborhoods from './overview/SeasonalNeighborhoods';
import MobileEventModal from './overview/MobileEventModal';

/**
 * Orchestrator for the City Overview screen.
 *
 * The heavy lifting now lives in:
 *   • overview/lib/derived.js               — pure calendar/insights helpers
 *   • overview/lib/{cityIcon,seasonalNeighborhoods,constants}.js
 *   • overview/MonthlyCalendar.jsx           — 12-month grid + tooltips
 *   • overview/BestTimeKpiCards.jsx          — four KPI cards
 *   • overview/TravelerFilter.jsx            — "Best time for" pills
 *   • overview/CompareMonthsPanel.jsx        — compare-two-months panel
 *   • overview/TripFitPanel.jsx              — style/budget/crowd panel
 *   • overview/SelectedMonthPanel.jsx        — inline selected-month CTA
 *   • overview/SeasonalProse.jsx             — "Season by Season" narrative
 *   • overview/SeasonalNeighborhoods.jsx     — neighborhood-by-season grid
 *   • overview/MobileEventModal.jsx          — small-screen event modal
 */
const CityOverview = ({
  overview,
  cityName,
  visitCalendar,
  monthlyData,
  hideIntroHero = false,
  onOpenMonthlyGuide,
}) => {
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [overviewParagraph, setOverviewParagraph] = useState(null);
  const [selectedCalendarMonth, setSelectedCalendarMonth] = useState(null);
  const [travelerTypeFilter, setTravelerTypeFilter] = useState('all');
  const [compareMonths, setCompareMonths] = useState(['April', 'September']);
  const [tripFit, setTripFit] = useState({
    traveler: 'couples',
    budget: 'mid',
    crowd: 'balanced',
  });

  const cityPaths = useMemo(
    () => getCityPaths(overview?.country, cityName),
    [overview?.country, cityName],
  );

  // Close tooltip when the user clicks outside any calendar day cell.
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeTooltip && !event.target.closest('.day-cell')) {
        setActiveTooltip(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeTooltip]);

  // Pull the SSR overview paragraph, with a network fallback for old
  // pages that didn't ship it inline.
  useEffect(() => {
    const taglines = monthlyData?.['monthly-taglines'] || monthlyData?.taglines;
    if (taglines?.overview_paragraph) {
      setOverviewParagraph(taglines.overview_paragraph);
      return;
    }
    const load = async () => {
      try {
        const json = await fetchCityDataUrl(cityPaths.monthlyTaglines, { cache: 'force-cache' });
        if (json && typeof json.overview_paragraph === 'string') {
          setOverviewParagraph(json.overview_paragraph);
        }
      } catch (_) {
        // swallow — overview paragraph is optional
      }
    };
    load();
  }, [cityPaths.monthlyTaglines, monthlyData]);

  const displayName = getCityDisplayName({ overview }, cityName);
  const nickname = getCityNickname({ overview });
  const description = getCityDescription({ overview }, cityName);

  const cityIcon = useMemo(() => getCityIcon(cityName), [cityName]);
  const seasonalNeighborhoods = useMemo(() => getSeasonalNeighborhoods(cityName), [cityName]);

  const bestMonthsOverall = visitCalendar?.bestTimeRecommendations?.overall?.best || [];
  const avoidMonthsOverall = visitCalendar?.bestTimeRecommendations?.overall?.avoid || [];

  const enhancedDescription = overview?.brief_description
    || description
    || `${cityName} is a beautiful city waiting to be discovered. With its rich history, vibrant culture, and welcoming atmosphere, it offers visitors an unforgettable experience.`;

  const calendarData = useMemo(
    () => buildCalendarData(visitCalendar, travelerTypeFilter),
    [visitCalendar, travelerTypeFilter],
  );

  const monthInsights = useMemo(
    () => buildMonthInsights(calendarData, visitCalendar),
    [calendarData, visitCalendar],
  );

  const bestTravelerMonth = useMemo(
    () => computeBestTravelerMonth(visitCalendar, travelerTypeFilter),
    [visitCalendar, travelerTypeFilter],
  );

  const valueMonths = useMemo(() => computeValueMonths(monthInsights), [monthInsights]);

  const tripFitRecommendations = useMemo(
    () => computeTripFitRecommendations(monthInsights, tripFit),
    [monthInsights, tripFit],
  );

  const comparisonInsights = useMemo(
    () => compareMonths
      .map((monthName) => monthInsights.find((month) => month.monthName === monthName))
      .filter(Boolean),
    [compareMonths, monthInsights],
  );

  const selectedInsight = useMemo(
    () => (selectedCalendarMonth
      ? monthInsights.find((month) => month.monthName === selectedCalendarMonth) || null
      : null),
    [selectedCalendarMonth, monthInsights],
  );

  const updateCompareMonth = useCallback((index, monthName) => {
    setCompareMonths((current) => {
      const next = [...current];
      next[index] = monthName;
      return next;
    });
  }, []);

  const handleOpenMonthlyGuide = useCallback((monthName) => {
    if (!onOpenMonthlyGuide) return;
    onOpenMonthlyGuide(monthName);
    setSelectedCalendarMonth(null);
  }, [onOpenMonthlyGuide]);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Optional intro hero (hidden when a page-level hero is present) */}
      {!hideIntroHero && (
        <div className="relative bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
          <div className="relative p-6 md:p-8">
            <div className="flex items-center mb-3">
              <span className="text-3xl mr-3">{cityIcon}</span>
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900">
                  {displayName}
                </h1>
                {nickname && (
                  <p className="text-base md:text-lg text-gray-600">{nickname}</p>
                )}
              </div>
            </div>
            <p className="text-[15.5px] md:text-[16.5px] leading-7 text-slate-700">
              {enhancedDescription}
            </p>
          </div>
        </div>
      )}

      {/* Best Time to Visit */}
      {(overviewParagraph || visitCalendar) && (
        <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-500" />
          <div className="p-4 md:p-5 space-y-3">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
                  Interactive date calendar
                </p>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
                  Best Time to Visit {displayName}
                </h2>
              </div>
              {visitCalendar?.bestTimeRecommendations?.overall && (
                <span className="text-sm px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full font-medium hidden sm:inline-flex items-center gap-1.5">
                  <span>✨</span> Best overall: {visitCalendar.bestTimeRecommendations.overall.best?.[0] || 'April-June'}
                </span>
              )}
            </div>

            {(bestMonthsOverall.length > 0 || avoidMonthsOverall.length > 0) && (
              <div className="flex flex-wrap gap-2 text-sm">
                {bestMonthsOverall.slice(0, 3).map((m) => (
                  <span key={`best-${m}`} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                    🌿 Best: {m}
                  </span>
                ))}
                {avoidMonthsOverall.slice(0, 2).map((m) => (
                  <span key={`avoid-${m}`} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-100">
                    ⚠️ Skip: {m}
                  </span>
                ))}
              </div>
            )}

            {overviewParagraph && (
              <p className="text-xl md:text-2xl text-gray-800 leading-relaxed font-medium max-w-4xl">
                {overviewParagraph}
              </p>
            )}

            <BestTimeKpiCards
              bestMonthsOverall={bestMonthsOverall}
              valueMonths={valueMonths}
              avoidMonthsOverall={avoidMonthsOverall}
              bestTravelerMonth={bestTravelerMonth}
              travelerTypeFilter={travelerTypeFilter}
              fallbackBestMonth={monthInsights[0]?.monthName || 'April-June'}
            />

            {visitCalendar?.travelerTypes && (
              <TravelerFilter
                active={travelerTypeFilter}
                onChange={setTravelerTypeFilter}
              />
            )}

            {monthInsights.length > 0 && (
              <div className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
                <CompareMonthsPanel
                  compareMonths={compareMonths}
                  comparisonInsights={comparisonInsights}
                  onUpdateCompareMonth={updateCompareMonth}
                />
                <TripFitPanel
                  tripFit={tripFit}
                  tripFitRecommendations={tripFitRecommendations}
                  onUpdateTripFit={setTripFit}
                  onSelectMonth={setSelectedCalendarMonth}
                />
              </div>
            )}

            <SelectedMonthPanel
              cityName={cityName}
              selectedCalendarMonth={selectedCalendarMonth}
              selectedInsight={selectedInsight}
              onOpenMonthlyGuide={onOpenMonthlyGuide ? handleOpenMonthlyGuide : null}
              onClear={() => setSelectedCalendarMonth(null)}
            />

            <MonthlyCalendar
              calendarData={calendarData}
              activeTooltip={activeTooltip}
              onTooltipChange={setActiveTooltip}
              onSelectMonth={setSelectedCalendarMonth}
              onSelectDay={(monthName) => setSelectedCalendarMonth(monthName)}
            />
          </div>
        </div>
      )}

      {/* Season-by-season narrative + neighborhood recommendations */}
      {visitCalendar && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
          <SeasonalProse cityName={cityName} />
          <SeasonalNeighborhoods
            cityName={cityName}
            seasonalNeighborhoods={seasonalNeighborhoods}
          />
        </div>
      )}

      <MobileEventModal
        activeTooltip={activeTooltip}
        onClose={() => setActiveTooltip(null)}
      />
    </div>
  );
};

export default CityOverview;
