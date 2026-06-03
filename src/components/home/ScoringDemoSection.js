'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import defaultCityCalendar from '@/generated/defaultCityCalendar.json';
import cityCalendarIndex from '@/generated/cityCalendarIndex.json';
import { getCountryFlag } from '@/utils/countryFlags';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_KEYS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const DAY_HEADERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const SCORE_COLORS = {
  5: { bg: 'bg-emerald-400', dot: 'bg-emerald-700' },
  4: { bg: 'bg-emerald-200', dot: 'bg-emerald-600' },
  3: { bg: 'bg-yellow-200', dot: 'bg-yellow-600' },
  2: { bg: 'bg-orange-300', dot: 'bg-orange-600' },
  1: { bg: 'bg-red-400', dot: 'bg-red-700' },
};

const LEGEND = [
  { label: 'Excellent', color: 'bg-emerald-400' },
  { label: 'Good', color: 'bg-emerald-200' },
  { label: 'Average', color: 'bg-yellow-200' },
  { label: 'Below Avg', color: 'bg-orange-300' },
  { label: 'Avoid', color: 'bg-red-400' },
];

const SCORE_LABEL = { 5: 'Excellent', 4: 'Good', 3: 'Average', 2: 'Below average', 1: 'Avoid' };

// Popular cities shown first when the dropdown opens with no search query.
const POPULAR = ['barcelona', 'paris', 'rome', 'lisbon', 'amsterdam', 'prague', 'vienna', 'london'];

function getDaysInMonth(month0, year) {
  return new Date(year, month0 + 1, 0).getDate();
}

function getFirstDayOfWeek(month0, year) {
  return new Date(year, month0, 1).getDay(); // 0=Sun
}

/** Build a day -> info map for one month. */
function buildDayMap(monthData) {
  const map = {};
  if (!monthData?.ranges) return map;
  for (const r of monthData.ranges) {
    for (const d of r.days) {
      map[d] = {
        score: r.score,
        special: !!r.special,
        event: r.event || null,
        notes: r.notes || null,
        crowdLevel: r.crowdLevel || null,
        weatherHighC: monthData.weatherHighC ?? null,
        weatherLowC: monthData.weatherLowC ?? null,
      };
    }
  }
  return map;
}

function MonthCalendar({ monthIdx, year, dayMap, currentMonthIdx, onHoverDay, activeKey }) {
  const isCurrent = monthIdx === currentMonthIdx;
  const daysInMonth = getDaysInMonth(monthIdx, year);
  const firstDow = getFirstDayOfWeek(monthIdx, year);
  const cells = [];

  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className={`rounded-xl p-3 border ${isCurrent ? 'border-blue-400 ring-2 ring-blue-400/40 bg-blue-50/50' : 'border-gray-200 bg-gray-50'}`}>
      <div className={`text-center text-xs font-bold mb-2 ${isCurrent ? 'text-blue-600' : 'text-gray-700'}`}>
        {MONTH_NAMES[monthIdx]}
        {isCurrent && <span className="ml-1.5 px-1.5 py-0.5 bg-blue-500 text-white rounded text-[9px] uppercase tracking-wider">Now</span>}
      </div>
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-px mb-0.5">
        {DAY_HEADERS.map((h, i) => (
          <div key={i} className="text-center text-[8px] text-gray-500 font-medium pb-0.5">{h}</div>
        ))}
      </div>
      {/* Day cells */}
      <div className="grid grid-cols-7 gap-px">
        {cells.map((day, i) => {
          if (!day) return <div key={`blank-${i}`} />;
          const info = dayMap[day];
          const scoreKey = info?.score ?? 0;
          const colors = SCORE_COLORS[scoreKey] || { bg: 'bg-gray-100', dot: '' };
          const key = `${monthIdx}-${day}`;
          const isActive = key === activeKey;
          const payload = { monthIdx, day, ...(info || { score: 0 }) };
          return (
            <button
              key={day}
              type="button"
              onMouseEnter={() => onHoverDay(payload)}
              onFocus={() => onHoverDay(payload)}
              onClick={() => onHoverDay(payload)}
              className={`relative aspect-square flex items-center justify-center rounded-sm text-[8px] font-medium ${colors.bg} text-gray-900 transition-transform hover:scale-125 hover:z-10 focus:outline-none focus:scale-125 ${isActive ? 'ring-2 ring-gray-900 scale-125 z-10' : ''}`}
            >
              {day}
              {info?.special && (
                <span className={`absolute bottom-0 right-0 w-1 h-1 rounded-full ${colors.dot}`} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Highlighted, inline city name that opens a searchable dropdown. */
function CityNameDropdown({ activeSlug, activeName, onPick }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      const bySlug = new Map(cityCalendarIndex.map((c) => [c.slug, c]));
      return POPULAR.map((s) => bySlug.get(s)).filter(Boolean);
    }
    return cityCalendarIndex
      .filter((c) => c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query]);

  useEffect(() => { setHighlight(0); }, [results]);

  // Focus the search box and close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onDocClick = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const choose = (city) => {
    onPick(city.slug);
    setQuery('');
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight((i) => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (results[highlight]) choose(results[highlight]); }
    else if (e.key === 'Escape') { setOpen(false); }
  };

  return (
    <span ref={wrapRef} className="relative inline-block align-baseline">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 font-bold text-blue-600 underline decoration-2 decoration-blue-300 underline-offset-4 hover:decoration-blue-500 focus:outline-none focus:decoration-blue-500"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {activeName}
        <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 z-50 w-72 max-w-[80vw] rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden">
          <div className="relative border-b border-gray-100">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search 220 cities…"
              className="w-full pl-9 pr-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none"
            />
          </div>
          {!query.trim() && (
            <div className="px-3 pt-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Popular</div>
          )}
          <ul className="max-h-64 overflow-y-auto py-1">
            {results.map((city, index) => (
              <li key={city.slug}>
                <button
                  type="button"
                  onClick={() => choose(city)}
                  onMouseEnter={() => setHighlight(index)}
                  className={`w-full px-3 py-2 flex items-center gap-3 text-left transition-colors ${index === highlight ? 'bg-blue-50' : 'hover:bg-gray-50'} ${city.slug === activeSlug ? 'font-semibold text-blue-700' : 'text-gray-800'}`}
                >
                  <span className="text-lg">{getCountryFlag(city.country)}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm truncate">{city.name}</span>
                    <span className="block text-xs text-gray-500">{city.country}</span>
                  </span>
                  {city.slug === activeSlug && (
                    <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              </li>
            ))}
            {results.length === 0 && (
              <li className="px-3 py-3 text-sm text-gray-400">No cities found</li>
            )}
          </ul>
        </div>
      )}
    </span>
  );
}

export default function ScoringDemoSection({ onScrollToDatePicker }) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIdx = now.getMonth();

  const [calendar, setCalendar] = useState(defaultCityCalendar);
  const [loading, setLoading] = useState(false);
  const [hovered, setHovered] = useState(null);
  const fetchRef = useRef(null);

  const activeSlug = calendar?.slug;

  const loadCity = useCallback((slug) => {
    if (!slug || slug === activeSlug) return;
    if (fetchRef.current) fetchRef.current.abort();
    const controller = new AbortController();
    fetchRef.current = controller;
    setLoading(true);
    fetch(`/calendars/${slug}.json`, { signal: controller.signal })
      .then((r) => { if (!r.ok) throw new Error('not found'); return r.json(); })
      .then((data) => { setCalendar(data); setHovered(null); })
      .catch((err) => { if (err.name !== 'AbortError') console.warn('calendar load failed', slug, err); })
      .finally(() => { if (fetchRef.current === controller) setLoading(false); });
  }, [activeSlug]);

  const dayMaps = useMemo(
    () => MONTH_KEYS.map((k) => buildDayMap(calendar?.months?.[k])),
    [calendar]
  );

  const onHoverDay = useCallback((payload) => setHovered(payload), []);
  const activeKey = hovered ? `${hovered.monthIdx}-${hovered.day}` : null;
  const hoveredColors = hovered ? SCORE_COLORS[hovered.score] : null;

  return (
    <section className="px-6 py-20 bg-white text-gray-900 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="max-w-2xl mb-8">
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest mb-3">
            <span className="w-8 h-px bg-blue-500"></span>
            The Right Time Changes Everything
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 leading-tight text-gray-900">
            Same city. Completely different trip.
          </h2>
          <div className="text-gray-600 text-lg leading-relaxed">
            Here&apos;s{' '}
            <CityNameDropdown activeSlug={activeSlug} activeName={calendar?.name} onPick={loadCity} />
            &apos;s visit score, day by day, across the full year. Tap the city name to compare any of our 220 cities.
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-6 text-xs text-gray-600">
          {LEGEND.map((l) => (
            <div key={l.label} className="flex items-center gap-1.5">
              <span className={`w-3 h-3 rounded-sm ${l.color}`} />
              {l.label}
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <span className="relative w-3 h-3 rounded-sm bg-emerald-400">
              <span className="absolute bottom-0 right-0 w-1 h-1 rounded-full bg-emerald-700" />
            </span>
            • = Special Event
          </div>
        </div>

        {/* City label + interactive day readout (detail panel) */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-6 min-h-[2.5rem]">
          <span className="text-base">{getCountryFlag(calendar?.country)}</span>
          <span className="font-bold text-gray-900">{calendar?.name}, {calendar?.country}</span>
          {loading && <span className="text-xs text-blue-500 animate-pulse">loading…</span>}
          {hovered ? (
            <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-full bg-gray-50 border border-gray-200 pl-2 pr-3 py-1 text-sm">
              <span className={`w-3 h-3 rounded-sm ${hoveredColors?.bg || 'bg-gray-300'}`} />
              <span className="font-semibold text-gray-900">{MONTH_NAMES[hovered.monthIdx]} {hovered.day}</span>
              <span className="text-gray-400">·</span>
              <span className="text-gray-600">{SCORE_LABEL[hovered.score] || '—'}</span>
              {hovered.crowdLevel && (
                <>
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-600">{hovered.crowdLevel} crowds</span>
                </>
              )}
              {(hovered.weatherHighC != null) && (
                <>
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-600">{hovered.weatherHighC}° / {hovered.weatherLowC}°C</span>
                </>
              )}
              {hovered.event && (
                <>
                  <span className="text-gray-400">·</span>
                  <span className="text-amber-600 font-medium">{hovered.event}</span>
                </>
              )}
            </span>
          ) : (
            <span className="text-gray-500 text-sm">— {currentYear} visit calendar · hover or tap any day for details</span>
          )}
        </div>

        {/* Notes line for the active day (graceful when absent) */}
        {hovered?.notes && (
          <p className="text-sm text-gray-500 leading-relaxed max-w-2xl mb-6 -mt-2">{hovered.notes}</p>
        )}

        {/* 12-month calendar grid */}
        <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-10 transition-opacity ${loading ? 'opacity-50' : 'opacity-100'}`}>
          {MONTH_KEYS.map((key, idx) => (
            <MonthCalendar
              key={key}
              monthIdx={idx}
              year={currentYear}
              dayMap={dayMaps[idx]}
              currentMonthIdx={currentMonthIdx}
              onHoverDay={onHoverDay}
              activeKey={activeKey}
            />
          ))}
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <button
            onClick={onScrollToDatePicker}
            className="group px-8 py-4 bg-blue-600 text-white font-bold rounded-full hover:bg-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center gap-2"
          >
            See how your dates score across all 220 cities
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
          <span className="text-gray-500 text-sm">Every city has a calendar like this. Enter your dates to see your ranking.</span>
        </div>
      </div>
    </section>
  );
}
