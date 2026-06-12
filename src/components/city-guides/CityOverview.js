'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getCityDisplayName, getCityNickname, getCityDescription } from '@/utils/cityDataUtils';
import { fetchCityDataUrl } from '@/lib/city-data';
import { legacyCountryFolder } from '@/lib/city-data/resolver';

import { buildCalendarData } from './overview/lib/derived';
import { getCityIcon } from './overview/lib/cityIcon';

import MonthlyCalendar from './overview/MonthlyCalendar';
import TravelerFilter from './overview/TravelerFilter';
import SeasonalProse from './overview/SeasonalProse';
import MobileEventModal from './overview/MobileEventModal';

/**
 * Orchestrator for the City Overview screen.
 *
 * The heavy lifting now lives in:
 *   • overview/lib/derived.js               — pure calendar/insights helpers
 *   • overview/lib/{cityIcon,seasonalNeighborhoods,constants}.js
 *   • overview/MonthlyCalendar.jsx           — 12-month grid + tooltips
 *   • overview/TravelerFilter.jsx            — "Best time for" pills
 *   • overview/SeasonalProse.jsx             — "Season by Season" narrative
 *   • overview/MobileEventModal.jsx          — small-screen event modal
 *
 * Month selection is one click: clicking a month card calls
 * `onOpenMonthlyGuide(monthName)` directly; `selectedMonth` draws the ring
 * that links the grid to the guide rendered below it.
 */
const CityOverview = ({
  overview,
  cityName,
  visitCalendar,
  monthlyData,
  hideIntroHero = false,
  onOpenMonthlyGuide,
  selectedMonth = null,
  showSeasonalProse = true,
}) => {
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [overviewParagraph, setOverviewParagraph] = useState(null);
  const [travelerTypeFilter, setTravelerTypeFilter] = useState('all');

  const cityPaths = useMemo(
    () => {
      const folder = legacyCountryFolder(overview?.country);
      const slug = (cityName || '').trim().toLowerCase();
      return { monthlyTaglines: `/data/${folder}/${slug}/monthly/monthly-taglines.json` };
    },
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

  const enhancedDescription = overview?.brief_description
    || description
    || `${cityName} is a beautiful city waiting to be discovered. With its rich history, vibrant culture, and welcoming atmosphere, it offers visitors an unforgettable experience.`;

  const calendarData = useMemo(
    () => buildCalendarData(visitCalendar, travelerTypeFilter),
    [visitCalendar, travelerTypeFilter],
  );

  const handleOpenMonthlyGuide = useCallback((monthName) => {
    onOpenMonthlyGuide?.(monthName);
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
          <div className="p-5 md:p-6">
            {/* Header — eyebrow + title as a single, tight unit */}
            <header className="mb-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600 mb-1.5">
                Interactive date calendar
              </p>
              <h2 className="font-display text-3xl md:text-4xl font-semibold text-gray-900 tracking-tight">
                Best Time to Visit {displayName}
              </h2>
            </header>

            {/* Prose — readable body copy with a comfortable line length */}
            {overviewParagraph && (
              <p className="text-base md:text-[17px] text-slate-700 leading-[1.75] max-w-[65ch] mb-6">
                {overviewParagraph}
              </p>
            )}

            {visitCalendar?.travelerTypes && (
              <div className="mb-4">
                <TravelerFilter
                  active={travelerTypeFilter}
                  onChange={setTravelerTypeFilter}
                />
              </div>
            )}

            <MonthlyCalendar
              calendarData={calendarData}
              activeTooltip={activeTooltip}
              onTooltipChange={setActiveTooltip}
              onSelectMonth={onOpenMonthlyGuide ? handleOpenMonthlyGuide : null}
              selectedMonth={selectedMonth}
              onOpenMonthGuide={onOpenMonthlyGuide ? handleOpenMonthlyGuide : null}
            />
          </div>
        </div>
      )}

      {/* Season-by-season narrative. Hidden in the unified When-to-Go view,
          where the per-month detail below the calendar carries this content. */}
      {showSeasonalProse && visitCalendar && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
          <SeasonalProse cityName={cityName} country={overview?.country} />
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
