'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';

import CalendarGrid from './components/CalendarGrid.jsx';
import ContentSections from './components/ContentSections.jsx';
import EventsList from './components/EventsList.jsx';
import MonthSelector from './components/MonthSelector.jsx';
import useMonthlyDataFetch from './hooks/useMonthlyDataFetch.js';
import { buildDays } from './lib/builders.js';
import { MONTHS, getMonthData } from './lib/constants.js';
import { buildEventMapForMonth } from './lib/eventMapping.js';
import { generateMonthTagline, getSeasonInfo } from './lib/monthlyMetadata.js';
import { bandFor, crowdLabel } from '../visitBands.js';
import { planMonthHref } from '../overview/lib/derived.js';

/**
 * Orchestrator for the "Monthly" tab of a city guide. Owns:
 *   - selected month index (initialised from `selectedMonth` prop or today)
 *   - merging of prop-supplied `monthlyData` with on-demand `extraMonths`
 *   - per-month event map + day-cell array (memoised)
 *
 * Side-effects (taglines fetch + lazy month-body fetch) live in
 * `useMonthlyDataFetch`.
 */
export default function MonthlyTabbedView({ visitCalendar, monthlyData, cityName, countryName, selectedMonth = null, onMonthChange = null, focusSignal = 0, showFooter = true }) {
  const reduceMotion = useReducedMotion();
  const nowIdx = new Date().getMonth();
  const initialSelectedIdx = selectedMonth
    ? Math.max(0, MONTHS.findIndex((month) => month.toLowerCase() === selectedMonth.toLowerCase()))
    : nowIdx;
  const [selectedIdx, setSelectedIdx] = useState(initialSelectedIdx);

  // Keep selectedIdx in sync if the parent changes its `selectedMonth` prop.
  useEffect(() => {
    if (!selectedMonth) return;
    const nextIdx = MONTHS.findIndex((month) => month.toLowerCase() === selectedMonth.toLowerCase());
    if (nextIdx >= 0) setSelectedIdx(nextIdx);
  }, [selectedMonth]);

  const months = useMemo(
    () =>
      MONTHS.map((_, idx) => {
        const raw = getMonthData(visitCalendar, idx);
        // Graceful KPI fallbacks when visitCalendar is missing
        const synthesized = !raw
          ? {
              tourismLevel: undefined,
              weatherLowC: undefined,
              weatherHighC: undefined,
              ranges: [
                {
                  score: 3,
                  days: Array.from(
                    { length: new Date(new Date().getFullYear(), idx + 1, 0).getDate() },
                    (_, i) => i + 1,
                  ),
                },
              ],
            }
          : raw;
        return {
          idx,
          name: MONTHS[idx],
          data: synthesized,
          synthetic: !raw,
          days: buildDays(idx, synthesized, {}),
        };
      }),
    [visitCalendar],
  );

  const m = months[selectedIdx];
  const monthName = m?.name;

  // Lazy-load taglines + missing month bodies.
  const { taglines, extraMonths } = useMonthlyDataFetch({
    cityName,
    countryName,
    monthName,
    monthlyData,
  });

  // Resolve which container holds the body for the selected month. Order:
  //   1) freshly fetched extraMonths
  //   2) prop-supplied monthlyData
  // and tolerate both PascalCase + lowercase keys at each level.
  const monthContainer = useMemo(() => {
    if (!monthName) return null;
    const lowered = monthName.toLowerCase();
    return (
      extraMonths?.[monthName] ||
      extraMonths?.[lowered] ||
      monthlyData?.[monthName] ||
      monthlyData?.[lowered] ||
      null
    );
  }, [extraMonths, monthlyData, monthName]);

  const monthJson = useMemo(() => {
    if (!monthContainer || !monthName) return {};
    if (Array.isArray(monthContainer)) return {};
    const lowered = monthName.toLowerCase();
    const candidate = monthContainer?.[monthName] || monthContainer?.[lowered] || monthContainer || {};
    if (Array.isArray(candidate)) return {};
    return candidate;
  }, [monthContainer, monthName]);

  const visitList = Array.isArray(monthJson?.reasons_to_visit) ? monthJson.reasons_to_visit : [];
  const considerList = Array.isArray(monthJson?.reasons_to_reconsider) ? monthJson.reasons_to_reconsider : [];
  const firstHalf = monthJson?.first_half || {};
  const secondHalf = monthJson?.second_half || {};
  const events = [
    ...(Array.isArray(firstHalf?.events_holidays) ? firstHalf.events_holidays : []),
    ...(Array.isArray(secondHalf?.events_holidays) ? secondHalf.events_holidays : []),
    ...(Array.isArray(firstHalf?.events) ? firstHalf.events : []),
    ...(Array.isArray(secondHalf?.events) ? secondHalf.events : []),
    ...(Array.isArray(monthJson?.events_holidays) ? monthJson.events_holidays : []),
    ...(Array.isArray(monthJson?.events) ? monthJson.events : []),
  ];

  // Rebuild the selected month's days with event markers.
  const eventMap = useMemo(() => buildEventMapForMonth(m.idx, monthJson), [m.idx, monthJson]);
  const selectedMonthDays = useMemo(() => buildDays(m.idx, m.data, eventMap), [m.idx, m.data, eventMap]);

  const monthTagline = generateMonthTagline({
    taglines,
    monthLabel: monthName,
    visitList,
    monthJson,
    events,
    firstHalf,
    secondHalf,
    cityName,
  });
  const seasonInfo = getSeasonInfo(m?.data?.tourismLevel);

  // Notify the parent (so the 12-month grid ring stays in sync) alongside the
  // local state update.
  const handleSelect = useCallback((idx) => {
    setSelectedIdx(idx);
    onMonthChange?.(MONTHS[idx]);
  }, [onMonthChange]);

  // Month-at-a-glance summary, day-weighted across the month's ranges.
  const summary = useMemo(() => {
    const ranges = Array.isArray(m?.data?.ranges) ? m.data.ranges : [];
    let dayCount = 0;
    let scoreSum = 0;
    ranges.forEach((r) => {
      const n = Array.isArray(r.days) ? r.days.length : 0;
      dayCount += n;
      scoreSum += n * (r.score ?? 3);
    });
    const band = dayCount > 0 && !m?.synthetic ? bandFor(scoreSum / dayCount) : null;
    const low = m?.data?.weatherLowC;
    const high = m?.data?.weatherHighC;
    const weather = typeof low === 'number' && typeof high === 'number'
      ? `${low}–${high}°C`
      : null;
    return {
      band,
      weather,
      crowds: crowdLabel(m?.data?.tourismLevel),
      eventsCount: events.length,
    };
  }, [m, events.length]);

  return (
    <div className="space-y-10">
      <MonthSelector
        months={months}
        selectedIdx={selectedIdx}
        nowIdx={nowIdx}
        seasonInfo={seasonInfo}
        onSelect={handleSelect}
      />

      {/* Keyed by month so switching plays a quick fade/rise; respects
          prefers-reduced-motion (initial=false renders without animating). */}
      <motion.div
        key={m.name}
        initial={reduceMotion ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="space-y-10"
      >
      <header>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-display text-4xl md:text-5xl font-semibold text-gray-900 tracking-tight mb-1.5">
              {m.name} in {cityName ? cityName.charAt(0).toUpperCase() + cityName.slice(1) : 'the City'}
            </h2>
            {/* One-shot underline sweep when a calendar click lands here —
                confirms "this is what you just opened", even when the month
                was already selected. */}
            <div className="h-0.5 w-28 mb-2 overflow-hidden" aria-hidden>
              {focusSignal > 0 && !reduceMotion && (
                <motion.div
                  key={focusSignal}
                  className="h-full rounded-full bg-blue-600"
                  style={{ transformOrigin: 'left' }}
                  initial={{ scaleX: 0, opacity: 1 }}
                  animate={{ scaleX: 1, opacity: 0 }}
                  transition={{
                    scaleX: { duration: 0.45, ease: 'easeOut', delay: 0.35 },
                    opacity: { delay: 1.4, duration: 0.5 },
                  }}
                />
              )}
            </div>
            <p className="text-lg md:text-xl text-gray-700 leading-relaxed max-w-3xl">{monthTagline}</p>
          </div>
          <Link
            href={planMonthHref(cityName, m.name)}
            className="shrink-0 self-start rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            Plan {m.name} →
          </Link>
        </div>

        {(summary.band || summary.weather || summary.crowds || summary.eventsCount > 0) && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {summary.band && (
              <span
                className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
                style={{ backgroundColor: summary.band.bg, color: summary.band.text }}
              >
                {summary.band.label} time to visit
              </span>
            )}
            {summary.weather && (
              <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                {summary.weather}
              </span>
            )}
            {summary.crowds && (
              <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                {summary.crowds}
              </span>
            )}
            {summary.eventsCount > 0 && (
              <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                {summary.eventsCount} {summary.eventsCount === 1 ? 'event' : 'events'}
              </span>
            )}
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8 items-start">
        {/* Left column: Calendar + Events */}
        <div className="space-y-8">
          <CalendarGrid monthName={m.name} monthData={m.data} days={selectedMonthDays} />
          <EventsList events={events} />
        </div>

        {/* Right column: Content sections */}
        <ContentSections monthName={m.name} visitList={visitList} considerList={considerList} />
      </div>
      </motion.div>

      {showFooter && (
        <footer className="border-t border-gray-200 mt-12 pt-8 pb-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-900">Plan smarter. Travel better.</p>
            <div className="flex items-center gap-6 text-sm">
              <Link href="/city-guides" className="text-gray-500 hover:text-gray-900 transition-colors">
                Browse all cities
              </Link>
              <a href="mailto:support@eurotripplanner.com" className="text-gray-500 hover:text-gray-900 transition-colors">
                Get support
              </a>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
