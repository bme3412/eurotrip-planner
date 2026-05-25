'use client';

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';

const ResultCard = dynamic(() => import('@/components/ResultCard'));

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getMonthDateRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  const pad = (n) => String(n).padStart(2, '0');
  return {
    startDate: `${year}-${pad(month + 1)}-01`,
    endDate: `${year}-${pad(month + 1)}-${pad(end.getDate())}`,
    monthName: MONTH_NAMES[month],
    year,
  };
}

function SkeletonCard() {
  return (
    <div className="card overflow-hidden animate-pulse">
      <div className="h-48 bg-gray-200 rounded-t-2xl" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-full" />
        <div className="h-3 bg-gray-100 rounded w-2/3" />
      </div>
    </div>
  );
}

export default function BestCitiesNow({
  onScrollToDatePicker,
  initialItems = null,
  monthName: monthNameProp,
  monthYear: monthYearProp,
}) {
  const seeded = Array.isArray(initialItems) && initialItems.length > 0;
  const [cities, setCities] = useState(seeded ? initialItems : []);
  const [loading, setLoading] = useState(!seeded);
  const [error, setError] = useState(false);
  const localRange = getMonthDateRange();
  const monthName = monthNameProp || localRange.monthName;
  const year = monthYearProp || localRange.year;
  const { startDate, endDate } = localRange;
  const fetchedRef = useRef(seeded);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    fetch(`/api/suggestions?startDate=${startDate}&endDate=${endDate}&limit=6&v=4&flat=true`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setCities(data.items ?? []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [startDate, endDate]);

  if (error && cities.length === 0) return null;

  return (
    <section className="px-6 py-20 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest mb-2">
              <span className="w-8 h-px bg-blue-600"></span>
              Live Rankings
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Best European Cities in {monthName} {year}
            </h2>
            <p className="text-gray-500 text-lg max-w-2xl font-medium">
              Ranked by our scoring engine — weather, crowds, seasonal events, and value right now.
            </p>
          </div>
          {!loading && cities.length > 0 && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-full">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              <span className="text-xs font-bold text-blue-600">Live data</span>
            </div>
          )}
        </div>

        {/* Grid */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
            : cities.map((item, idx) => (
                <ResultCard key={item.id ?? idx} item={item} index={idx} />
              ))}
        </div>

        {/* CTA */}
        {!loading && (
          <div className="mt-12 text-center">
            <p className="text-gray-500 text-base mb-4">
              These are the top cities for <strong>{monthName}</strong> overall. Enter your exact dates for a personalized ranking.
            </p>
            <button
              onClick={onScrollToDatePicker}
              className="group inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-full hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-0.5"
            >
              Enter your dates for your personalized ranking
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
