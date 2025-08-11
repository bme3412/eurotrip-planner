'use client';

import React, { useMemo, useState } from 'react';

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

export default function MonthlyTabbedView({ visitCalendar, monthlyData }) {
  const nowIdx = new Date().getMonth();
  const [selectedIdx, setSelectedIdx] = useState(nowIdx);
  const [expandedVisit, setExpandedVisit] = useState(false);
  const [expandedConsider, setExpandedConsider] = useState(false);
  const [expandedEvents, setExpandedEvents] = useState(false);

  const months = useMemo(() => MONTHS.map((_, idx) => ({
    idx,
    name: MONTHS[idx],
    data: getMonthData(visitCalendar, idx),
    days: buildDays(idx, getMonthData(visitCalendar, idx))
  })), [visitCalendar]);

  if (!visitCalendar?.months) return null;

  const m = months[selectedIdx];
  const monthJson = monthlyData?.[m.name];
  const visitList = Array.isArray(monthJson?.reasons_to_visit) ? monthJson.reasons_to_visit : [];
  const considerList = Array.isArray(monthJson?.reasons_to_reconsider) ? monthJson.reasons_to_reconsider : [];
  const firstHalf = monthJson?.first_half || {};
  const secondHalf = monthJson?.second_half || {};
  const events = [
    ...(Array.isArray(firstHalf.events_holidays) ? firstHalf.events_holidays : []),
    ...(Array.isArray(secondHalf.events_holidays) ? secondHalf.events_holidays : []),
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
        <header className="flex items-center justify-between px-4 py-2 bg-gray-50/60">
          <div className="text-base font-semibold text-gray-900">{m.name}</div>
          {m.data && (
            <div className="flex items-center gap-3 text-[11px] text-gray-600">
              {typeof m.data.tourismLevel === 'number' && (
                <span className="flex items-center gap-1"><span>👥</span><span>{m.data.tourismLevel}/10</span></span>
              )}
              {typeof m.data.weatherLowC === 'number' && typeof m.data.weatherHighC === 'number' && (
                <span className="flex items-center gap-1"><span>🌡️</span><span>{m.data.weatherLowC}°–{m.data.weatherHighC}°C</span></span>
              )}
            </div>
          )}
        </header>

        <div className="px-4 py-4 grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4 items-start">
          {/* Calendar */}
          <div className="w-full md:w-[280px] shrink-0">
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
          </div>

          {/* Right column content */}
          <div className="text-sm">
            {/* Top: compact KPI row to reduce whitespace */}
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {tempString(firstHalf) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 text-sky-800 ring-1 ring-sky-100 px-2 py-1 text-[11px]">🌡️ Early: {tempString(firstHalf)}</span>
              )}
              {tempString(secondHalf) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 text-sky-800 ring-1 ring-sky-100 px-2 py-1 text-[11px]">🌡️ Late: {tempString(secondHalf)}</span>
              )}
              {precString(firstHalf) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 text-sky-800 ring-1 ring-sky-100 px-2 py-1 text-[11px]">☔ {truncate(precString(firstHalf), 48)}</span>
              )}
              {firstHalf.tourism_level?.crowds && (
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 text-violet-800 ring-1 ring-violet-100 px-2 py-1 text-[11px]">👥 {firstHalf.tourism_level.crowds}</span>
              )}
              {firstHalf.tourism_level?.pricing && (
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 text-violet-800 ring-1 ring-violet-100 px-2 py-1 text-[11px]">💶 {firstHalf.tourism_level.pricing}</span>
              )}
              {firstHalf.tourism_level?.overall_atmosphere && (
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 text-violet-800 ring-1 ring-violet-100 px-2 py-1 text-[11px]">✨ {truncate(firstHalf.tourism_level.overall_atmosphere, 40)}</span>
              )}
            </div>

            {/* Below: Reasons to Visit + Things to Consider */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Reasons to visit */}
              {visitList.length > 0 && (
                <div className="rounded-lg bg-emerald-50/60 ring-1 ring-emerald-100 p-3">
                  <h4 className="text-emerald-800 font-medium mb-2">Reasons to Visit</h4>
                  <ul className="space-y-2">
                    {(expandedVisit ? visitList : visitList.slice(0,3)).map((r, i) => (
                      <li key={`rv-${m.idx}-${i}`} className="flex items-start gap-2">
                        <span className="mt-0.5">✅</span>
                        <div>
                          <div className="font-semibold text-gray-800 text-[13px]">{r.reason}</div>
                          {r.details && <p className="text-gray-600 text-[12px] leading-snug">{r.details}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                  {visitList.length > 3 && (
                    <button className="mt-2 text-indigo-600 hover:text-indigo-700 text-xs font-medium" onClick={() => setExpandedVisit(v => !v)}>
                      {expandedVisit ? 'Show less' : `Show more (${visitList.length - 3})`}
                    </button>
                  )}
                </div>
              )}

              {/* Reasons to consider */}
              {considerList.length > 0 && (
                <div className="rounded-lg bg-amber-50/70 ring-1 ring-amber-100 p-3">
                  <h4 className="text-amber-800 font-medium mb-2">Things to Consider</h4>
                  <ul className="space-y-2">
                    {(expandedConsider ? considerList : considerList.slice(0,3)).map((r, i) => (
                      <li key={`rc-${m.idx}-${i}`} className="flex items-start gap-2">
                        <span className="mt-0.5">⚠️</span>
                        <div>
                          <div className="font-semibold text-gray-800 text-[13px]">{r.reason}</div>
                          {r.details && <p className="text-gray-700 text-[12px] leading-snug">{r.details}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                  {considerList.length > 3 && (
                    <button className="mt-2 text-indigo-600 hover:text-indigo-700 text-xs font-medium" onClick={() => setExpandedConsider(v => !v)}>
                      {expandedConsider ? 'Show less' : `Show more (${considerList.length - 3})`}
                    </button>
                  )}
                </div>
              )}

              {/* Events & Holidays (bottom section) */}
              {events.length > 0 && (
                <div className="md:col-span-2 rounded-lg ring-1 ring-amber-100 bg-amber-50/60 p-4">
                  <h4 className="text-amber-800 font-medium mb-2">Events & Holidays</h4>
                  <ul className="space-y-2">
                    {(expandedEvents ? events : events.slice(0,3)).map((ev, i) => (
                      <li key={`ev-${m.idx}-${i}`} className="text-[12px] text-gray-800">
                        <div className="font-semibold">{ev.name}</div>
                        <div className="text-gray-600">{ev.date}</div>
                        {ev.description && <div className="text-gray-600">{ev.description}</div>}
                      </li>
                    ))}
                  </ul>
                  {events.length > 3 && (
                    <button className="mt-2 text-indigo-600 hover:text-indigo-700 text-xs font-medium" onClick={() => setExpandedEvents(v => !v)}>
                      {expandedEvents ? 'Show less' : `Show more (${events.length - 3})`}
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


