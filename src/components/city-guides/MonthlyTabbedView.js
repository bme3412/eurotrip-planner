'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';

// Original calendar palette
const RATING_COLORS = { 5: '#10b981', 4: '#34d399', 3: '#fbbf24', 2: '#fb923c', 1: '#ef4444' };
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function getMonthData(visitCalendar, monthIndex) {
  if (!visitCalendar?.months) return null;
  return visitCalendar.months[MONTHS[monthIndex].toLowerCase()] || null;
}

function buildDays(monthIndex, monthData, eventMap = {}) {
  const year = new Date().getFullYear();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const firstDow = new Date(year, monthIndex, 1).getDay();
  const days = [];
  for (let i = 0; i < firstDow; i++) days.push({ type: 'empty' });
  for (let d = 1; d <= daysInMonth; d++) {
    const range = monthData?.ranges?.find(r => Array.isArray(r.days) && r.days.includes(d));
    const rating = range?.score ?? 3;
    const events = Array.isArray(eventMap[d]) ? eventMap[d] : [];
    days.push({ type: 'day', d, rating, color: RATING_COLORS[rating], events, hasEvent: events.length > 0 });
  }
  return days;
}

// Build map: dayOfMonth -> [events]
function buildEventMapForMonth(monthIndex, monthJson) {
  if (!monthJson || typeof monthJson !== 'object') return {};

  const all = [];
  const fh = Array.isArray(monthJson?.first_half?.events_holidays) ? monthJson.first_half.events_holidays : [];
  const sh = Array.isArray(monthJson?.second_half?.events_holidays) ? monthJson.second_half.events_holidays : [];
  const fh2 = Array.isArray(monthJson?.first_half?.events) ? monthJson.first_half.events : [];
  const sh2 = Array.isArray(monthJson?.second_half?.events) ? monthJson.second_half.events : [];
  const root1 = Array.isArray(monthJson?.events_holidays) ? monthJson.events_holidays : [];
  const root2 = Array.isArray(monthJson?.events) ? monthJson.events : [];
  all.push(...fh, ...sh, ...fh2, ...sh2, ...root1, ...root2);

  const eventMap = {};
  const coerceInt = (n) => {
    const num = Number(n);
    return Number.isFinite(num) && num >= 1 && num <= 31 ? num : null;
  };
  const normalize = (s) => (s || '').toString().trim();

  for (const ev of all) {
    const dateStr = normalize(ev?.date);
    if (!dateStr) continue;
    const unified = dateStr.replace(/[–—−]/g, '-');
    // Range like 7-16 or 07-16
    let matched = unified.match(/\b(\d{1,2})\s*-\s*(\d{1,2})\b/);
    if (matched) {
      const start = coerceInt(matched[1]);
      const end = coerceInt(matched[2]);
      if (start && end && end >= start) {
        for (let d = start; d <= end; d++) {
          eventMap[d] = eventMap[d] || [];
          eventMap[d].push(ev);
        }
        continue;
      }
    }
    // Explicit day like "July 14, 2025" or "Oct 3" or just "14"
    matched = unified.match(/\b(\d{1,2})\b/);
    if (matched) {
      const day = coerceInt(matched[1]);
      if (day) {
        eventMap[day] = eventMap[day] || [];
        eventMap[day].push(ev);
      }
    }
  }
  return eventMap;
}

export default function MonthlyTabbedView({ visitCalendar, monthlyData, cityName, countryName }) {
  const nowIdx = new Date().getMonth();
  const [selectedIdx, setSelectedIdx] = useState(nowIdx);
  const [expandedVisit, setExpandedVisit] = useState(false);
  const [expandedConsider, setExpandedConsider] = useState(false);
  const [expandedEvents, setExpandedEvents] = useState(false);
  const [taglines, setTaglines] = useState(null);
  const [extraMonths, setExtraMonths] = useState({});
  const fetchedMonthsRef = useRef(new Set());
  const inflightMonthsRef = useRef(new Set());
  const getTooltipPositionClasses = (colIndex) => {
    if (colIndex <= 1) return { box: 'left-0 translate-x-0 ml-2', arrow: 'left-3' };
    if (colIndex >= 5) return { box: 'right-0 translate-x-0 mr-2', arrow: 'right-3' };
    return { box: 'left-1/2 -translate-x-1/2', arrow: 'left-1/2 -translate-x-1/2' };
  };

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
    // We'll compute event map later per selected month; for now keep empty
    return {
      idx,
      name: MONTHS[idx],
      data: synthesized,
      days: buildDays(idx, synthesized, {})
    };
  }), [visitCalendar]);

  const m = months[selectedIdx];
  // Support multiple shapes:
  // 1) monthlyData["July"] = { ... }
  // 2) monthlyData["July"] = { "July": { ... } }
  // 3) lowercase keys
  // Prefer freshly fetched full month data over partial index entries
  const monthName = m?.name;
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
    const lowered = monthName.toLowerCase();
    return monthContainer?.[monthName] || monthContainer?.[lowered] || monthContainer || {};
  }, [monthContainer, monthName]);
  const visitList = Array.isArray(monthJson?.reasons_to_visit) ? monthJson.reasons_to_visit : [];
  const considerList = Array.isArray(monthJson?.reasons_to_reconsider) ? monthJson.reasons_to_reconsider : [];
  const firstHalf = monthJson?.first_half || {};
  const secondHalf = monthJson?.second_half || {};
  // Merge events from multiple possible keys to handle month-to-month schema drift
  const events = [
    ...(Array.isArray(firstHalf?.events_holidays) ? firstHalf.events_holidays : []),
    ...(Array.isArray(secondHalf?.events_holidays) ? secondHalf.events_holidays : []),
    ...(Array.isArray(firstHalf?.events) ? firstHalf.events : []),
    ...(Array.isArray(secondHalf?.events) ? secondHalf.events : []),
    ...(Array.isArray(monthJson?.events_holidays) ? monthJson.events_holidays : []),
    ...(Array.isArray(monthJson?.events) ? monthJson.events : []),
  ];

  // If we fetched a full month, also surface reasons/consider lists even if index JSON had empty arrays
  const hasFetchedMonth = !!(extraMonths?.[m.name] || extraMonths?.[m.name?.toLowerCase()]);
  const effectiveVisitList = hasFetchedMonth ? visitList : visitList;
  const effectiveConsiderList = hasFetchedMonth ? considerList : considerList;

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

  // Rebuild the selected month's days to include event markers
  const eventMap = useMemo(() => buildEventMapForMonth(m.idx, monthJson), [m.idx, monthJson]);
  const selectedMonthDays = useMemo(() => buildDays(m.idx, m.data, eventMap), [m.idx, m.data, eventMap]);

  // Fallback: if the currently selected month is missing in monthlyData,
  // fetch just that month JSON and cache it locally so the panel renders.
  useEffect(() => {
    const monthKey = m?.name;
    if (!monthKey || !cityName || !countryName) return;
    const candidateContainer = monthlyData?.[monthKey] || monthlyData?.[monthKey.toLowerCase()] || extraMonths?.[monthKey] || extraMonths?.[monthKey.toLowerCase()];
    const candidateJson = candidateContainer?.[monthKey] || candidateContainer?.[monthKey.toLowerCase()] || candidateContainer;

    const isCompleteMonth = (() => {
      if (!candidateJson || typeof candidateJson !== 'object' || Array.isArray(candidateJson)) return false;
      const fh = candidateJson.first_half || {};
      const sh = candidateJson.second_half || {};
      const hasReasons = Array.isArray(candidateJson.reasons_to_visit) || Array.isArray(candidateJson.reasons_to_reconsider);
      const hasEvents = Array.isArray(fh.events_holidays) || Array.isArray(sh.events_holidays) || Array.isArray(fh.events) || Array.isArray(sh.events);
      const hasWeather = !!(fh.weather || sh.weather);
      return hasReasons || hasEvents || hasWeather;
    })();
    const shouldFetch = !candidateJson || !isCompleteMonth;
    if (!shouldFetch) return;

    let cancelled = false;
    const citySlug = String(cityName).toLowerCase();
    const cityCap = String(cityName).charAt(0).toUpperCase() + String(cityName).slice(1);
    const countrySlug = String(countryName).toLowerCase();
    const countryCap = String(countryName).charAt(0).toUpperCase() + String(countryName).slice(1);
    const cacheKey = `${countrySlug}|${citySlug}|${monthKey.toLowerCase()}`;

    if (fetchedMonthsRef.current.has(cacheKey) || inflightMonthsRef.current.has(cacheKey)) return;
    inflightMonthsRef.current.add(cacheKey);
    const candidates = [
      `/data/${countryName}/${citySlug}/monthly/${monthKey.toLowerCase()}.json`,
      `/data/${countryName}/${cityCap}/monthly/${monthKey.toLowerCase()}.json`,
      `/data/${countryCap}/${citySlug}/monthly/${monthKey.toLowerCase()}.json`,
      `/data/${countryCap}/${cityCap}/monthly/${monthKey.toLowerCase()}.json`,
      `/data/${countrySlug}/${citySlug}/monthly/${monthKey.toLowerCase()}.json`,
      `/data/${countrySlug}/${cityCap}/monthly/${monthKey.toLowerCase()}.json`
    ];
    (async () => {
      try {
        for (const url of candidates) {
          const res = await fetch(url, { cache: 'force-cache' });
          if (!res.ok) continue;
          const json = await res.json();
          const extractedKey = Object.keys(json)[0];
          const payload = extractedKey ? json[extractedKey] : json;
          if (!cancelled && payload && typeof payload === 'object') {
            setExtraMonths(prev => ({ ...prev, [extractedKey || monthKey]: payload }));
            fetchedMonthsRef.current.add(cacheKey);
            break;
          }
        }
      } catch (_) {
        // ignore
      } finally {
        inflightMonthsRef.current.delete(cacheKey);
      }
    })();

    return () => { cancelled = true; };
  }, [m?.name, cityName, countryName, monthlyData, extraMonths]);

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

  // Season chip based on tourism level (rough heuristic)
  const seasonInfo = (() => {
    const lvl = typeof m?.data?.tourismLevel === 'number' ? m.data.tourismLevel : null;
    if (lvl == null) return null;
    if (lvl >= 8) return { label: 'Peak Season', cls: 'bg-zinc-900 text-white' };
    if (lvl >= 5) return { label: 'Shoulder Season', cls: 'bg-zinc-100 text-zinc-800 ring-1 ring-zinc-200' };
    return { label: 'Low Season', cls: 'bg-zinc-100 text-zinc-800 ring-1 ring-zinc-200' };
  })();

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
                selectedIdx === mm.idx ? 'bg-zinc-900 text-white ring-zinc-900' : 'bg-white text-gray-700 ring-gray-200 hover:bg-gray-50'
              }`}
            >
              {mm.name.slice(0,3)}
            </button>
          ))}
        </nav>
      </div>

      {/* Selected month content */}
      <section className="rounded-lg ring-1 ring-gray-100 overflow-visible bg-white">
        {/* Compact month header (single visible tagline) */}
        <header className="px-4 py-3 bg-gray-50/60 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="text-lg md:text-xl font-semibold text-gray-900">{m.name}</div>
            {seasonInfo && (
              <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${seasonInfo.cls}`}>{seasonInfo.label}</span>
            )}
          </div>
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
              {selectedMonthDays.map((day, i) => day.type === 'empty' ? (
                <div key={`e-${i}`} className="aspect-square" />
              ) : (
                <div
                  key={`d-${m.idx}-${day.d}`}
                  className="group aspect-square flex items-center justify-center rounded relative"
                  style={{ backgroundColor: day.color }}
                >
                  <span className="text-white text-[9px] font-semibold drop-shadow">{day.d}</span>
                  {day.hasEvent && (
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500 ring-1 ring-white"></span>
                  )}
                  {day.hasEvent && (
                    <>
                      {(() => { const pos = getTooltipPositionClasses(i % 7); return (
                        <div className={`pointer-events-none absolute bottom-full ${pos.box} mb-2 w-64 rounded-lg bg-white text-gray-900 text-[12px] leading-snug px-3 py-2.5 shadow-xl ring-1 ring-gray-200 opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-normal break-words border-l-4`}
                          style={{ borderLeftColor: day.color }}>
                          <div className="font-semibold mb-1.5 text-[12.5px]">{m.name} {day.d}</div>
                        <ul className="space-y-1.5">
                          {day.events.slice(0,3).map((ev, j) => (
                              <li key={`evtip-${m.idx}-${day.d}-${j}`} className="flex items-start gap-2">
                                <span className="mt-1 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: day.color }}></span>
                                <div className="flex-1">
                                  <div className="font-medium text-[12px] leading-tight">{ev.name || ev.event || 'Event'}</div>
                                  <div className="text-[11px] text-gray-500">{ev.date || ''}</div>
                                </div>
                            </li>
                          ))}
                        </ul>
                        {day.events.length > 3 && (
                            <div className="text-[11px] text-gray-500 mt-1">+{day.events.length - 3} more</div>
                        )}
                        </div>
                      ); })()}
                      {(() => { const pos = getTooltipPositionClasses(i % 7); return (
                        <span className={`pointer-events-none absolute -bottom-1 ${pos.arrow} w-2 h-2 bg-white rotate-45 opacity-0 group-hover:opacity-100 z-50 ring-1 ring-gray-200`}></span>
                      ); })()}
                    </>
                  )}
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
                <div className="rounded-lg bg-white border border-gray-100 p-4">
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
                <div className="rounded-lg bg-white border border-gray-100 p-4">
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

