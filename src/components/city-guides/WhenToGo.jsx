'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { CalendarDays, CalendarRange } from 'lucide-react';
import {
  LazyCityOverview,
  LazyMonthlyGuideSection,
} from '@/components/common/LazyComponents';
import { SkeletonOverview, SkeletonTabContent } from '@/components/common/SkeletonLoader';

/**
 * WhenToGo — merges the two former timing tabs ("Best Time to Go" calendar and
 * "Monthly Guide") into one tab with a sub-view toggle. The two underlying
 * components are unchanged and co-located here, so this is a low-risk
 * composition rather than a rewrite.
 *
 * Clicking a month in the calendar (via CityOverview's SelectedMonthPanel)
 * flips the sub-view to "Month by month" with that month selected — the same
 * UX as the old cross-tab jump, minus the tab hop.
 */
const VIEWS = [
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'months', label: 'Month by month', icon: CalendarRange },
];

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
  initialView = 'calendar',
}) {
  const [view, setView] = useState(initialSelectedMonth ? 'months' : initialView);
  const [selectedMonth, setSelectedMonth] = useState(initialSelectedMonth);

  // If the parent passes a month later (e.g. a deep link / hero CTA), honour it.
  useEffect(() => {
    if (initialSelectedMonth) {
      setSelectedMonth(initialSelectedMonth);
      setView('months');
    }
  }, [initialSelectedMonth]);

  const handleOpenMonth = useCallback((monthName) => {
    setSelectedMonth(monthName || null);
    setView('months');
  }, []);

  return (
    <div className="space-y-5">
      {/* Sub-view toggle */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-full border border-gray-200 bg-white p-1 shadow-sm">
          {VIEWS.map(({ id, label, icon: Icon }) => {
            const active = view === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setView(id)}
                aria-pressed={active}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                  active ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {view === 'calendar' ? (
        <Suspense fallback={<SkeletonOverview />}>
          <LazyCityOverview
            overview={overview}
            cityName={cityName}
            visitCalendar={visitCalendar}
            monthlyData={monthlyData}
            hideIntroHero={hideCalendarIntroHero}
            onOpenMonthlyGuide={handleOpenMonth}
          />
        </Suspense>
      ) : monthlyDataLoading ? (
        <SkeletonTabContent />
      ) : monthlyDataError ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="text-yellow-600 text-4xl mb-4">⚠️</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Monthly Guide Unavailable</h3>
            <p className="text-gray-600 mb-4">We couldn&apos;t load the monthly guide for {cityName} right now.</p>
            <button
              type="button"
              onClick={() => setView('calendar')}
              className="text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              Back to the calendar
            </button>
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
          />
        </Suspense>
      )}
    </div>
  );
}
