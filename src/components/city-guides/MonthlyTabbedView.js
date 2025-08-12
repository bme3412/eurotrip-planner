'use client';

import React, { useEffect, useMemo, useState } from 'react';

const RATING_COLORS = { 5: '#10b981', 4: '#34d399', 3: '#fbbf24', 2: '#fb923c', 1: '#ef4444' };
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function getMonthData(visitCalendar, monthIndex) {
  if (!visitCalendar?.months) return null;
  return visitCalendar.months[MONTHS[monthIndex].toLowerCase()] || null;
}

function buildDays(monthIndex, monthData) {
  const year = new Date().getFullYear();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const firstDow = new Date(year, monthIndex, 1).getDay();
  const days = [];
  for (let i = 0; i < firstDow; i++) days.push({ type: 'empty' });
  for (let d = 1; d <= daysInMonth; d++) {
    const range = monthData?.ranges?.find(r => Array.isArray(r.days) && r.days.includes(d));
    const rating = range?.score ?? 3;
    days.push({ type: 'day', d, rating, color: RATING_COLORS[rating] });
  }
  return days;
}

export default function MonthlyTabbedView({ visitCalendar, monthlyData, cityName, countryName }) {
  const nowIdx = new Date().getMonth();
  const [selectedIdx, setSelectedIdx] = useState(nowIdx);
  const [expandedVisit, setExpandedVisit] = useState(false);
  const [expandedConsider, setExpandedConsider] = useState(false);
  const [expandedEvents, setExpandedEvents] = useState(false);
  const [taglines, setTaglines] = useState(null);

  // Load monthly taglines JSON if available
  useEffect(() => {
    let isMounted = true;
    async function loadTaglines() {
      if (!cityName || !countryName) return;
      const citySlug = cityName.toLowerCase();
      try {
        const res = await fetch(`/data/${countryName}/${citySlug}/monthly/monthly-taglines.json`, { cache: 'force-cache' });
        if (res.ok) {
          const json = await res.json();
          if (isMounted) setTaglines(json);
        }
      } catch (_) {
        // silently ignore
      }
    }
    loadTaglines();
    return () => { isMounted = false; };
  }, [cityName, countryName]);

  const months = useMemo(() => MONTHS.map((_, idx) => {
    const raw = getMonthData(visitCalendar, idx);
    // Graceful KPI fallbacks when visitCalendar is missing
    const synthesized = !raw ? {
      tourismLevel: undefined,
      weatherLowC: undefined,
      weatherHighC: undefined,
      ranges: [{ score: 3, days: Array.from({ length: new Date(new Date().getFullYear(), idx + 1, 0).getDate() }, (_, i) => i + 1) }]
    } : raw;
    return {
      idx,
      name: MONTHS[idx],
      data: synthesized,
      days: buildDays(idx, synthesized)
    };
  }), [visitCalendar]);

  const m = months[selectedIdx];
  // Support both 'August' and 'august' keys
  const monthJson = monthlyData?.[m.name] || monthlyData?.[m.name?.toLowerCase()];
  const visitList = Array.isArray(monthJson?.reasons_to_visit) ? monthJson.reasons_to_visit : [];
  const considerList = Array.isArray(monthJson?.reasons_to_reconsider) ? monthJson.reasons_to_reconsider : [];
  const firstHalf = monthJson?.first_half || {};
  const secondHalf = monthJson?.second_half || {};
  const events = [
    ...(Array.isArray(firstHalf?.events_holidays) ? firstHalf.events_holidays : []),
    ...(Array.isArray(secondHalf?.events_holidays) ? secondHalf.events_holidays : []),
  ];

  const tempString = (p) => {
    const t = p?.weather?.average_temperature;
    if (!t) return null;
    const high = t.high_celsius ?? t.highC ?? t.high;
    const low = t.low_celsius ?? t.lowC ?? t.low;
    if (!high && !low) return null;
    return `${low ?? ''}${low ? ' – ' : ''}${high ?? ''}`;
  };
  const precString = (p) => p?.weather?.precipitation || null;
  const tipString = (p) => p?.weather?.general_tips || null;
  const truncate = (s, n = 80) => (s && s.length > n ? `${s.slice(0, n)}…` : s);

  const showMoreVisitCount = Math.max(visitList.length - 3, 0);
  const showMoreConsiderCount = Math.max(considerList.length - 3, 0);
  const showMoreEventsCount = Math.max(events.length - 3, 0);

  // Generate a brief, positive tagline for the month header
  const generateMonthTagline = () => {
    // Prefer authored taglines if present
    const monthLabel = m?.name;
    if (taglines && monthLabel && Array.isArray(taglines[monthLabel]) && taglines[monthLabel].length > 0) {
      // Rotate deterministically by day to get a bit of variety without randomness
      const idx = new Date().getDate() % taglines[monthLabel].length;
      return taglines[monthLabel][idx];
    }

    const topReasons = visitList.map(r => r?.reason).filter(Boolean);
    const attractions = Array.isArray(monthJson?.unique_experiences)
      ? monthJson.unique_experiences.map(e => e?.activity).filter(Boolean)
      : [];

    // Build a richer, action-oriented line (~8–16 words)
    if (topReasons.length > 0) {
      const reason = topReasons[0];
      const extra = (events.length > 0)
        ? 'plus vibrant local events'
        : (attractions.length > 0)
          ? `and ${attractions[0].toLowerCase()}`
          : null;
      if (extra) return `${reason} — ${extra} across ${cityName || 'the city'}`;
      return `${reason} — a perfect time to explore ${cityName || 'the city'}`;
    }

    if (events.length > 0 || attractions.length > 0) {
      const lead = events.length > 0 ? 'Festivals and neighborhood happenings' : 'Signature experiences and must‑see sights';
      const tail = attractions.length > 0 ? `like ${attractions.slice(0, 2).join(' and ').toLowerCase()}` : 'to fill your days';
      return `${lead} ${tail}`;
    }

    const early = tempString(firstHalf);
    const late = tempString(secondHalf);
    if (early || late) {
      const range = early && late ? `${early} • ${late}` : (early || late);
      return `Easy sightseeing days (${range}) and plenty of time for cafes, galleries, and evening strolls`;
    }

    return `A welcoming month to uncover ${cityName || 'the city'} — from iconic landmarks to local gems`;
  };
  const monthTagline = generateMonthTagline();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Guide</h3>

      {/* Month tabs */}
      <div className="mb-4 overflow-x-auto">
        <nav className="flex gap-2 min-w-max">
          {months.map((mm) => (
            <button
              key={mm.idx}
              onClick={() => { setSelectedIdx(mm.idx); setExpandedVisit(false); setExpandedConsider(false); setExpandedEvents(false); }}
              className={`px-3 py-1.5 rounded-full text-sm ring-1 transition ${
                selectedIdx === mm.idx ? 'bg-indigo-600 text-white ring-indigo-600' : 'bg-white text-gray-700 ring-gray-200 hover:bg-gray-50'
              }`}
            >
              {mm.name.slice(0,3)}
            </button>
          ))}
        </nav>
      </div>

      {/* Selected month content */}
      <section className="rounded-lg ring-1 ring-gray-100 overflow-hidden bg-white">
        {/* Compact month header (single visible tagline) */}
        <header className="px-4 py-3 bg-gray-50/60 border-b border-gray-100">
          <div className="text-lg md:text-xl font-semibold text-gray-900">{m.name}</div>
          <div className="mt-1 text-base md:text-lg text-gray-800 leading-snug">{monthTagline}</div>
        </header>

        <div className="px-4 py-4 grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 items-start">
          {/* Left: Calendar card with header + legend like the screenshot */}
          <div className="w-full md:w-[280px] shrink-0">
            <div className="flex items-center justify-between mb-1">
              <div className="text-[13px] font-semibold text-gray-900">{m.name}</div>
              {m.data && (
                <div className="text-[10px] text-gray-600 flex items-center gap-2">
                  {typeof m.data.tourismLevel === 'number' && (<span>{m.data.tourismLevel}/10</span>)}
                  {typeof m.data.weatherLowC === 'number' && typeof m.data.weatherHighC === 'number' && (<span>{m.data.weatherLowC}°–{m.data.weatherHighC}°C</span>)}
                </div>
              )}
            </div>
            <div className="grid grid-cols-7 text-center text-[10px] font-medium text-gray-500">
              {['S','M','T','W','T','F','S'].map((d, i) => <div key={`${d}-${i}`} className="py-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-px bg-white">
              {m.days.map((day, i) => day.type === 'empty' ? (
                <div key={`e-${i}`} className="aspect-square" />
              ) : (
                <div key={`d-${m.idx}-${day.d}`} className="aspect-square flex items-center justify-center rounded" style={{ backgroundColor: day.color }}>
                  <span className="text-white text-[9px] font-semibold drop-shadow">{day.d}</span>
                </div>
              ))}
            </div>
            {/* Legend bullets beneath the calendar */}
            <div className="mt-3 space-y-1 text-[12px]">
              {tempString(firstHalf) && (
                <div className="flex items-center text-gray-700">
                  <span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
                  <span>Early: {tempString(firstHalf)}</span>
                </div>
              )}
              {tempString(secondHalf) && (
                <div className="flex items-center text-gray-700">
                  <span className="w-2 h-2 rounded-full bg-orange-500 mr-2"></span>
                  <span>Late: {tempString(secondHalf)}</span>
                </div>
              )}
              {(precString(firstHalf) || tipString(firstHalf)) && (
                <div className="flex items-start text-gray-600">
                  <span className="w-2 h-2 rounded-full bg-gray-700 mr-2 mt-1"></span>
                  <span className="leading-snug">{truncate(precString(firstHalf) || tipString(firstHalf), 88)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Reasons columns and events below */}
          <div className="text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Reasons to Visit */}
              {visitList.length > 0 && (
                <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                  <h4 className="text-green-800 font-semibold mb-2 flex items-center">
                    <span className="mr-2">✅</span>
                    Reasons to Visit
                  </h4>
                  <ul className="space-y-2">
                    {(expandedVisit ? visitList : visitList.slice(0,3)).map((r, i) => (
                      <li key={`rv-${m.idx}-${i}`} className="flex items-start gap-2">
                        <span className="text-green-600 mt-0.5">•</span>
                        <div>
                          <div className="font-medium text-gray-900 text-[13px]">{r.reason}</div>
                          {r.details && <p className="text-gray-700 text-[12px] leading-snug">{r.details}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                  {showMoreVisitCount > 0 && (
                    <button className="mt-2 text-indigo-600 hover:text-indigo-700 text-xs font-medium" onClick={() => setExpandedVisit(v => !v)}>
                      {expandedVisit ? 'Show less' : `Show more (${showMoreVisitCount})`}
                    </button>
                  )}
                </div>
              )}

              {/* Things to Consider */}
              {considerList.length > 0 && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                  <h4 className="text-amber-800 font-semibold mb-2 flex items-center">
                    <span className="mr-2">⚠️</span>
                    Things to Consider
                  </h4>
                  <ul className="space-y-2">
                    {(expandedConsider ? considerList : considerList.slice(0,3)).map((r, i) => (
                      <li key={`rc-${m.idx}-${i}`} className="flex items-start gap-2">
                        <span className="text-amber-600 mt-0.5">•</span>
                        <div>
                          <div className="font-medium text-gray-900 text-[13px]">{r.reason}</div>
                          {r.details && <p className="text-gray-700 text-[12px] leading-snug">{r.details}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                  {showMoreConsiderCount > 0 && (
                    <button className="mt-2 text-indigo-600 hover:text-indigo-700 text-xs font-medium" onClick={() => setExpandedConsider(v => !v)}>
                      {expandedConsider ? 'Show less' : `Show more (${showMoreConsiderCount})`}
                    </button>
                  )}
                </div>
              )}

              {/* Events & Holidays */}
              {events.length > 0 && (
                <div className="md:col-span-2 rounded-lg bg-white border border-gray-100 p-4">
                  <h4 className="text-gray-900 font-semibold mb-2">Events & Holidays</h4>
                  <ul className="space-y-3">
                    {(expandedEvents ? events : events.slice(0,3)).map((ev, i) => {
                      const accents = ['border-blue-500','border-green-500','border-purple-500'];
                      const accent = accents[i % accents.length];
                      return (
                        <li key={`ev-${m.idx}-${i}`} className={`pl-4 border-l-4 ${accent}`}>
                          <div className="text-[13px] font-semibold text-gray-900">{ev.name}</div>
                          {ev.date && <div className="text-[12px] text-gray-600">{ev.date}</div>}
                          {ev.description && <div className="text-[12px] text-gray-700">{ev.description}</div>}
                        </li>
                      );
                    })}
                  </ul>
                  {showMoreEventsCount > 0 && (
                    <button className="mt-2 text-indigo-600 hover:text-indigo-700 text-xs font-medium" onClick={() => setExpandedEvents(v => !v)}>
                      {expandedEvents ? 'Show less' : `Show more (${showMoreEventsCount})`}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}


