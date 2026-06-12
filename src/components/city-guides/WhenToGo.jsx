'use client';

import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import {
  LazyCityOverview,
  LazyMonthlyGuideSection,
} from '@/components/common/LazyComponents';
import { SkeletonOverview, SkeletonTabContent } from '@/components/common/SkeletonLoader';
import { MONTH_NAMES } from './overview/lib/constants';

/**
 * WhenToGo — a single, calendar-first scrolling view.
 *
 * Leads with the interactive 12-month calendar (CityOverview, minus its
 * "Season by Season" essay), then renders the selected month's full detail
 * inline below (MonthlyGuideSection → MonthlyTabbedView): tagline, day
 * calendar, events, and the "Why visit / Things to consider" breakdown.
 *
 * Clicking a month in the 12-month calendar sets `selectedMonth` and scrolls
 * to the detail. This replaces the former Calendar / Month-by-month sub-view
 * toggle and removes the duplicated seasonal storytelling that lived in both.
 */
export default function WhenToGo({
  overview,
  cityName,
  country,
  visitCalendar,
  monthlyData,
  monthlyDataLoading = false,
  monthlyDataError = null,
  hideCalendarIntroHero = false,
  initialSelectedMonth = null,
}) {
  // Default the detail to the current month so the tab opens with something
  // relevant; a deep link / hero CTA can override via initialSelectedMonth.
  const [selectedMonth, setSelectedMonth] = useState(
    initialSelectedMonth || MONTH_NAMES[new Date().getMonth()],
  );
  // Bumped on every calendar-driven open (even of the already-selected month)
  // so the guide header can play its one-shot "you are here" highlight.
  const [focusSignal, setFocusSignal] = useState(0);
  const detailRef = useRef(null);

  useEffect(() => {
    if (initialSelectedMonth) setSelectedMonth(initialSelectedMonth);
  }, [initialSelectedMonth]);

  const handleOpenMonth = useCallback((monthName) => {
    if (!monthName) return;
    setSelectedMonth(monthName);
    setFocusSignal((n) => n + 1);
    // Let the detail re-render for the new month, then bring it into view.
    setTimeout(() => {
      const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
      detailRef.current?.scrollIntoView({
        behavior: prefersReduced ? 'auto' : 'smooth',
        block: 'start',
      });
    }, 60);
  }, []);

  return (
    <div className="space-y-8">
      {/* Calendar-first overview (Season-by-Season essay suppressed here). */}
      <Suspense fallback={<SkeletonOverview />}>
        <LazyCityOverview
          overview={overview}
          cityName={cityName}
          visitCalendar={visitCalendar}
          monthlyData={monthlyData}
          hideIntroHero={hideCalendarIntroHero}
          onOpenMonthlyGuide={handleOpenMonth}
          selectedMonth={selectedMonth}
          showSeasonalProse={false}
        />
      </Suspense>

      {/* Selected-month detail — the consolidated home for everything the old
          "Monthly Guide" sub-view and the "Season by Season" essay used to
          duplicate. */}
      <div ref={detailRef} className="scroll-mt-24">
        {monthlyDataLoading ? (
          <SkeletonTabContent />
        ) : monthlyDataError ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="text-yellow-600 text-4xl mb-4">⚠️</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Monthly Guide Unavailable</h3>
              <p className="text-gray-600">We couldn&apos;t load the monthly guide for {cityName} right now.</p>
            </div>
          </div>
        ) : (
          <Suspense fallback={<SkeletonTabContent />}>
            <LazyMonthlyGuideSection
              monthlyData={monthlyData}
              cityName={cityName}
              city={cityName}
              visitCalendar={visitCalendar}
              countryName={country}
              selectedMonth={selectedMonth}
              onMonthChange={setSelectedMonth}
              focusSignal={focusSignal}
              showFooter={false}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
}
