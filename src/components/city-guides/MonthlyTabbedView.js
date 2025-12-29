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
  
  // Month name to index mapping
  const monthNameToIndex = {
    'jan': 0, 'january': 0,
    'feb': 1, 'february': 1,
    'mar': 2, 'march': 2,
    'apr': 3, 'april': 3,
    'may': 4,
    'jun': 5, 'june': 5,
    'jul': 6, 'july': 6,
    'aug': 7, 'august': 7,
    'sep': 8, 'sept': 8, 'september': 8,
    'oct': 9, 'october': 9,
    'nov': 10, 'november': 10,
    'dec': 11, 'december': 11
  };
  
  const daysInMonth = new Date(new Date().getFullYear(), monthIndex + 1, 0).getDate();

  for (const ev of all) {
    const dateStr = normalize(ev?.date);
    if (!dateStr) continue;
    const unified = dateStr.replace(/[–—−]/g, '-').toLowerCase();
    
    // Handle "Throughout month" or "All month" etc.
    if (/throughout|all\s*month|entire\s*month/i.test(dateStr)) {
      for (let d = 1; d <= daysInMonth; d++) {
        eventMap[d] = eventMap[d] || [];
        eventMap[d].push(ev);
      }
      continue;
    }
    
    // Handle vague cross-month dates like "Late May to early June"
    const vagueMonthMatch = unified.match(/(late|early|mid)?\s*([a-z]+)\s*(to|-)\s*(late|early|mid)?\s*([a-z]+)/);
    if (vagueMonthMatch) {
      const startQualifier = vagueMonthMatch[1] || '';
      const startMonthName = vagueMonthMatch[2];
      const endQualifier = vagueMonthMatch[4] || '';
      const endMonthName = vagueMonthMatch[5];
      const startMonthIdx = monthNameToIndex[startMonthName];
      const endMonthIdx = monthNameToIndex[endMonthName];
      
      if (startMonthIdx !== undefined && endMonthIdx !== undefined) {
        if (monthIndex === startMonthIdx) {
          // Current month is the start month
          const startDay = startQualifier === 'late' ? 20 : startQualifier === 'mid' ? 10 : 1;
          for (let d = startDay; d <= daysInMonth; d++) {
            eventMap[d] = eventMap[d] || [];
            eventMap[d].push(ev);
          }
          continue;
        } else if (monthIndex === endMonthIdx) {
          // Current month is the end month
          const endDay = endQualifier === 'early' ? 10 : endQualifier === 'mid' ? 20 : daysInMonth;
          for (let d = 1; d <= endDay; d++) {
            eventMap[d] = eventMap[d] || [];
            eventMap[d].push(ev);
          }
          continue;
        } else if (monthIndex > startMonthIdx && monthIndex < endMonthIdx) {
          // Current month is in between - mark all days
          for (let d = 1; d <= daysInMonth; d++) {
            eventMap[d] = eventMap[d] || [];
            eventMap[d].push(ev);
          }
          continue;
        }
        // Event doesn't apply to this month
        continue;
      }
    }
    
    // Handle cross-month ranges like "May 26 - June 8" or "May 26-June 8"
    // Pattern: MonthName Day - MonthName Day
    const crossMonthMatch = unified.match(/([a-z]+)\s*(\d{1,2})\s*-\s*([a-z]+)\s*(\d{1,2})/);
    if (crossMonthMatch) {
      const startMonthName = crossMonthMatch[1];
      const startDay = coerceInt(crossMonthMatch[2]);
      const endMonthName = crossMonthMatch[3];
      const endDay = coerceInt(crossMonthMatch[4]);
      const startMonthIdx = monthNameToIndex[startMonthName];
      const endMonthIdx = monthNameToIndex[endMonthName];
      
      if (startMonthIdx !== undefined && endMonthIdx !== undefined && startDay && endDay) {
        // Determine which days apply to the current month
        if (monthIndex === startMonthIdx) {
          // Current month is the start month - mark from startDay to end of month
          for (let d = startDay; d <= daysInMonth; d++) {
            eventMap[d] = eventMap[d] || [];
            eventMap[d].push(ev);
          }
          continue;
        } else if (monthIndex === endMonthIdx) {
          // Current month is the end month - mark from 1 to endDay
          for (let d = 1; d <= endDay; d++) {
            eventMap[d] = eventMap[d] || [];
            eventMap[d].push(ev);
          }
          continue;
        } else if (monthIndex > startMonthIdx && monthIndex < endMonthIdx) {
          // Current month is in between - mark all days
          for (let d = 1; d <= daysInMonth; d++) {
            eventMap[d] = eventMap[d] || [];
            eventMap[d].push(ev);
          }
          continue;
        }
        // Event doesn't apply to this month
        continue;
      }
    }
    
    // Handle single-month date with month name: "June 21" or "July 14, 2025"
    const singleDateWithMonth = unified.match(/([a-z]+)\s*(\d{1,2})/);
    if (singleDateWithMonth) {
      const eventMonthIdx = monthNameToIndex[singleDateWithMonth[1]];
      if (eventMonthIdx !== undefined && eventMonthIdx !== monthIndex) {
        // This event is for a different month, skip
        continue;
      }
    }
    
    // Range like 7-16 or 07-16 (same month)
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
    // If monthContainer is an array (taglines from index.json), return empty object - we need the full month data
    if (Array.isArray(monthContainer)) return {};
    const lowered = monthName.toLowerCase();
    const candidate = monthContainer?.[monthName] || monthContainer?.[lowered] || monthContainer || {};
    // If candidate is an array, return empty object
    if (Array.isArray(candidate)) return {};
    return candidate;
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

    return () => { 
      cancelled = true; 
      // Allow re-fetch if effect re-runs before async completes
      inflightMonthsRef.current.delete(cacheKey);
    };
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
    <div className="space-y-10">
      {/* Month selector row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Monthly Guide</h3>
          {seasonInfo && (
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${seasonInfo.cls}`}>
              {seasonInfo.label}
            </span>
          )}
        </div>
        
        {/* Month tabs - clean pill style */}
        <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          <nav className="flex gap-1 min-w-max">
            {months.map((mm) => {
              const isSelected = selectedIdx === mm.idx;
              const isCurrentMonth = mm.idx === nowIdx;
              return (
                <button
                  key={mm.idx}
                  onClick={() => setSelectedIdx(mm.idx)}
                  className={`relative px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                    isSelected 
                      ? 'bg-gray-900 text-white' 
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {mm.name.slice(0, 3)}
                  {isCurrentMonth && !isSelected && (
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Month header with tagline */}
      <header>
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight mb-3">
          {m.name} in {cityName ? cityName.charAt(0).toUpperCase() + cityName.slice(1) : 'the City'}
        </h2>
        <p className="text-lg md:text-xl text-gray-700 leading-relaxed max-w-3xl">{monthTagline}</p>
      </header>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8 items-start">
        
        {/* Left column: Calendar + Events */}
        <div className="space-y-8">
          {/* Calendar */}
          <div className="bg-gray-50 rounded-xl p-5">
            {/* Calendar header */}
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-bold text-gray-900">{m.name}</h4>
              {typeof m.data?.tourismLevel === 'number' && (
                <span className="text-sm text-gray-500">
                  Crowds {m.data.tourismLevel}/10
                </span>
              )}
            </div>
            
            {/* Weather */}
            {(typeof m.data?.weatherLowC === 'number' || typeof m.data?.weatherHighC === 'number') && (
              <p className="text-sm text-gray-600 mb-4">
                🌡️ {m.data.weatherLowC !== undefined && `${m.data.weatherLowC}°`}
                {m.data.weatherLowC !== undefined && m.data.weatherHighC !== undefined && ' – '}
                {m.data.weatherHighC !== undefined && `${m.data.weatherHighC}°C`}
              </p>
            )}
            
            {/* Day headers */}
            <div className="grid grid-cols-7 text-center text-xs font-medium text-gray-500 mb-1">
              {['S','M','T','W','T','F','S'].map((d, i) => (
                <div key={`${d}-${i}`} className="py-1">{d}</div>
              ))}
            </div>
            
            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-0.5">
              {selectedMonthDays.map((day, i) => {
                // Determine tooltip position based on column to prevent edge clipping
                const col = i % 7;
                const tooltipAlign = col <= 1 ? 'left-0' : col >= 5 ? 'right-0' : 'left-1/2 -translate-x-1/2';
                
                return day.type === 'empty' ? (
                  <div key={`e-${i}`} className="aspect-square" />
                ) : (
                  <div
                    key={`d-${m.idx}-${day.d}`}
                    className="group aspect-square flex items-center justify-center rounded relative cursor-default transition-transform hover:scale-110 hover:z-10"
                    style={{ backgroundColor: day.color }}
                  >
                    <span className="text-white text-xs font-semibold drop-shadow-sm">{day.d}</span>
                    {day.hasEvent && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-white shadow-sm flex items-center justify-center">
                        <span className="w-1 h-1 rounded-full bg-red-500"></span>
                      </span>
                    )}
                    {/* Enhanced popup with full event details - matching Best Time to Go style */}
                    {day.hasEvent && (
                      <div className={`pointer-events-none absolute bottom-full ${tooltipAlign} mb-2 w-72 rounded-xl bg-white text-gray-900 shadow-xl ring-1 ring-gray-200 opacity-0 group-hover:opacity-100 transition-opacity z-50 overflow-hidden`}>
                        {/* Events list */}
                        <div className="px-4 py-3 space-y-4 max-h-56 overflow-y-auto">
                          {day.events.slice(0, 3).map((ev, j) => (
                            <div key={`evtip-${j}`}>
                              <div className="flex items-start gap-2 mb-1">
                                <span className="text-sm">🎉</span>
                                <div className="font-semibold text-gray-900 text-[13px] leading-tight">{ev.name || ev.event || 'Event'}</div>
                              </div>
                              {ev.date && (
                                <div className="text-xs text-gray-500 ml-6 mb-1">{ev.date}</div>
                              )}
                              {ev.description && (
                                <p className="text-xs text-gray-600 ml-6 leading-relaxed line-clamp-3">{ev.description}</p>
                              )}
                              {/* Event meta chips - matching Best Time to Go */}
                              {(ev.location || ev.crowdLevel || ev.price || ev.time) && (
                                <div className="flex flex-wrap gap-1.5 mt-2 ml-6">
                                  {ev.time && (
                                    <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded">
                                      🕐 {ev.time}
                                    </span>
                                  )}
                                  {ev.location && (
                                    <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 bg-green-50 text-green-700 rounded">
                                      📍 {ev.location}
                                    </span>
                                  )}
                                  {ev.crowdLevel && (
                                    <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded">
                                      👥 {ev.crowdLevel}
                                    </span>
                                  )}
                                  {ev.price && (
                                    <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded">
                                      💰 {ev.price}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        {day.events.length > 3 && (
                          <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 text-center">
                            +{day.events.length - 3} more event{day.events.length - 3 > 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Legend */}
            <div className="mt-4 pt-3 border-t border-gray-200 flex flex-wrap gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500"></span>Great</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-400"></span>Good</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-orange-500"></span>Fair</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-500"></span>Busy</span>
            </div>
          </div>

          {/* Events & Holidays - below calendar */}
          {events.length > 0 && (
            <section>
              <h4 className="text-lg font-bold text-gray-900 mb-4 tracking-tight">Events & Holidays</h4>
              <div className="space-y-4">
                {events.map((ev, idx) => (
                  <div key={`event-${idx}`} className="border-l-2 border-gray-300 pl-4">
                    <h5 className="font-semibold text-gray-900 text-[15px]">{ev.name || ev.event || 'Event'}</h5>
                    {ev.date && <p className="text-sm text-gray-500">{ev.date}</p>}
                    {ev.description && <p className="text-sm text-gray-700 mt-1 leading-relaxed">{ev.description}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right column: Content sections (StartHere style) */}
        <div className="space-y-8">
          
          {/* Why Visit This Month */}
          {visitList.length > 0 ? (
            <section>
              <h3 className="text-xl font-bold text-gray-900 mb-4 tracking-tight">Why Visit in {m.name}</h3>
              <div className="prose prose-lg max-w-none">
                {visitList.map((item, idx) => (
                  <p key={`visit-${idx}`} className="text-gray-700 leading-relaxed mb-4 last:mb-0 text-[17px]">
                    <strong className="text-gray-900">{item?.reason}</strong>
                    {item?.details && ` — ${item.details}`}
                  </p>
                ))}
              </div>
            </section>
          ) : (
            <section>
              <h3 className="text-xl font-bold text-gray-900 mb-4 tracking-tight">Why Visit in {m.name}</h3>
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>
            </section>
          )}

          {/* Things to Keep in Mind */}
          {considerList.length > 0 ? (
            <section className="border-t border-gray-200 pt-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4 tracking-tight">Things to Keep in Mind</h3>
              <div className="prose prose-lg max-w-none">
                {considerList.map((item, idx) => (
                  <p key={`consider-${idx}`} className="text-gray-700 leading-relaxed mb-4 last:mb-0 text-[17px]">
                    <strong className="text-gray-900">{item?.reason}</strong>
                    {item?.details && ` — ${item.details}`}
                  </p>
                ))}
              </div>
            </section>
          ) : (
            <section className="border-t border-gray-200 pt-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4 tracking-tight">Things to Keep in Mind</h3>
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
              </div>
            </section>
          )}

        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-12 pt-8 pb-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-900">Plan smarter. Travel better.</p>
          <div className="flex items-center gap-6 text-sm">
            <a href="/city-guides" className="text-gray-500 hover:text-gray-900 transition-colors">
              Browse all cities
            </a>
            <a href="mailto:support@eurotripplanner.com" className="text-gray-500 hover:text-gray-900 transition-colors">
              Get support
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

