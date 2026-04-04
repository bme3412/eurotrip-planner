'use client';

import React, { useMemo, useState } from 'react';

const RATING_COLORS = {
  5: '#10b981',
  4: '#34d399',
  3: '#fbbf24',
  2: '#fb923c',
  1: '#ef4444'
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function getMonthData(visitCalendar, monthIndex) {
  if (!visitCalendar?.months) return null;
  const monthKey = MONTHS[monthIndex].toLowerCase();
  return visitCalendar.months[monthKey] || null;
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

export default function StackedYearView({ visitCalendar, monthlyData }) {
  const currentMonthIndex = new Date().getMonth();
  const [collapsed, setCollapsed] = useState(() => {
    const initial = new Set();
    for (let i = 0; i < 12; i++) if (i !== currentMonthIndex) initial.add(i);
    return initial;
  });
  const [expandedVisit, setExpandedVisit] = useState({});
  const [expandedConsider, setExpandedConsider] = useState({});
  const [expandedEvents, setExpandedEvents] = useState({});

  const months = useMemo(() => {
    return MONTHS.map((_, idx) => {
      const monthData = getMonthData(visitCalendar, idx);
      return {
        idx,
        name: MONTHS[idx],
        data: monthData,
        days: buildDays(idx, monthData)
      };
    });
  }, [visitCalendar]);

  if (!visitCalendar?.months) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Guide</h3>
      <div className="space-y-8">
        {months.map((m) => {
          const isCollapsed = collapsed.has(m.idx);
          const monthJson = monthlyData?.[m.name];
          const visitList = Array.isArray(monthJson?.reasons_to_visit)
            ? monthJson.reasons_to_visit
            : [];
          const considerList = Array.isArray(monthJson?.reasons_to_reconsider)
            ? monthJson.reasons_to_reconsider
            : [];

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

          const showAllVisit = !!expandedVisit[m.idx];
          const showAllConsider = !!expandedConsider[m.idx];
          const showAllEvents = !!expandedEvents[m.idx];

          const toggleSection = () => {
            setCollapsed(prev => {
              const next = new Set(prev);
              if (next.has(m.idx)) next.delete(m.idx); else next.add(m.idx);
              return next;
            });
          };

          return (
            <section key={m.idx} className="rounded-lg ring-1 ring-gray-100 overflow-hidden bg-white">
              <header className="flex items-center justify-between px-4 py-2 bg-gray-50/60 cursor-pointer select-none" onClick={toggleSection}>
                <div className="flex items-center gap-2">
                  <svg className={`h-4 w-4 text-gray-500 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                  </svg>
                  <div className="text-base font-semibold text-gray-900">{m.name}</div>
                </div>
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

              {!isCollapsed && (
                <div className="px-4 py-4 grid grid-cols-1 md:grid-cols-[300px_1fr] gap-5 items-start">
              {/* Calendar (left) */}
              <div className="w-full md:w-[300px] shrink-0">
                <div className="grid grid-cols-7 text-center text-[10px] font-medium text-gray-500">
                  {['S','M','T','W','T','F','S'].map((d, i) => <div key={`${d}-${i}`} className="py-1">{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-px bg-white">
                  {m.days.map((day, i) => day.type === 'empty' ? (
                    <div key={`e-${i}`} className="aspect-square" />
                  ) : (
                    <div key={`d-${m.idx}-${day.d}`} className="aspect-square flex items-center justify-center rounded" style={{ backgroundColor: day.color }}>
                      <span className="text-white text-[10px] font-semibold drop-shadow">{day.d}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reasons (right) */}
              <div className="text-sm">
                {monthlyData && monthlyData[m.name] && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Reasons to visit */}
                    {visitList.length > 0 && (
                      <div className="rounded-lg bg-emerald-50/60 ring-1 ring-emerald-100 p-4">
                        <h4 className="text-emerald-800 font-medium mb-2">Reasons to Visit</h4>
                        <ul className="space-y-2">
                          {(showAllVisit ? visitList : visitList.slice(0,3)).map((r, i) => (
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
                          <button
                            className="mt-2 text-indigo-600 hover:text-indigo-700 text-xs font-medium"
                            onClick={() => setExpandedVisit(prev => ({ ...prev, [m.idx]: !showAllVisit }))}
                          >
                            {showAllVisit ? 'Show less' : `Show more (${visitList.length - 3})`}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Reasons to reconsider */}
                    {considerList.length > 0 && (
                      <div className="rounded-lg bg-amber-50/70 ring-1 ring-amber-100 p-4">
                        <h4 className="text-amber-800 font-medium mb-2">Things to Consider</h4>
                        <ul className="space-y-2">
                          {(showAllConsider ? considerList : considerList.slice(0,3)).map((r, i) => (
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
                          <button
                            className="mt-2 text-indigo-600 hover:text-indigo-700 text-xs font-medium"
                            onClick={() => setExpandedConsider(prev => ({ ...prev, [m.idx]: !showAllConsider }))}
                          >
                            {showAllConsider ? 'Show less' : `Show more (${considerList.length - 3})`}
                          </button>
                        )}
                      </div>
                    )}
                    {/* Weather + Tourism + Events */}
                    <div className="md:col-span-2 grid grid-cols-1 lg:grid-cols-3 gap-4">
                      {/* Weather card */}
                      {(tempString(firstHalf) || tempString(secondHalf) || precString(firstHalf) || tipString(firstHalf)) && (
                        <div className="rounded-lg ring-1 ring-sky-100 bg-sky-50/60 p-4">
                          <h4 className="text-sky-800 font-medium mb-2">Weather</h4>
                          <ul className="text-[12px] text-gray-700 space-y-1.5">
                            {tempString(firstHalf) && <li><span className="font-semibold">Early month:</span> {tempString(firstHalf)}</li>}
                            {tempString(secondHalf) && <li><span className="font-semibold">Late month:</span> {tempString(secondHalf)}</li>}
                            {precString(firstHalf) && <li>{precString(firstHalf)}</li>}
                            {tipString(firstHalf) && <li className="text-gray-600">{tipString(firstHalf)}</li>}
                          </ul>
                        </div>
                      )}

                      {/* Tourism card */}
                      {(firstHalf.tourism_level || secondHalf.tourism_level) && (
                        <div className="rounded-lg ring-1 ring-violet-100 bg-violet-50/60 p-4">
                          <h4 className="text-violet-800 font-medium mb-2">Tourism Level</h4>
                          <ul className="text-[12px] text-gray-700 space-y-1.5">
                            {firstHalf.tourism_level?.crowds && (
                              <li><span className="font-semibold">Crowds:</span> {firstHalf.tourism_level.crowds}</li>
                            )}
                            {firstHalf.tourism_level?.pricing && (
                              <li><span className="font-semibold">Pricing:</span> {firstHalf.tourism_level.pricing}</li>
                            )}
                            {firstHalf.tourism_level?.overall_atmosphere && (
                              <li><span className="font-semibold">Atmosphere:</span> {firstHalf.tourism_level.overall_atmosphere}</li>
                            )}
                          </ul>
                        </div>
                      )}

                      {/* Events & Holidays */}
                      {events.length > 0 && (
                        <div className="rounded-lg ring-1 ring-amber-100 bg-amber-50/60 p-4">
                          <h4 className="text-amber-800 font-medium mb-2">Events & Holidays</h4>
                          <ul className="space-y-2">
                            {(showAllEvents ? events : events.slice(0,3)).map((ev, i) => (
                              <li key={`ev-${m.idx}-${i}`} className="text-[12px] text-gray-800">
                                <div className="font-semibold">{ev.name}</div>
                                <div className="text-gray-600">{ev.date}</div>
                                {ev.description && <div className="text-gray-600">{ev.description}</div>}
                              </li>
                            ))}
                          </ul>
                          {events.length > 3 && (
                            <button
                              className="mt-2 text-indigo-600 hover:text-indigo-700 text-xs font-medium"
                              onClick={() => setExpandedEvents(prev => ({ ...prev, [m.idx]: !showAllEvents }))}
                            >
                              {showAllEvents ? 'Show less' : `Show more (${events.length - 3})`}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
                </div>
              )}
          </section>
          );
        })}
      </div>
    </div>
  );
}


