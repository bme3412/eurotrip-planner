'use client';

import React from 'react';
import { Sun, Users, CalendarDays, Sparkles, ArrowRight, Clock } from 'lucide-react';

/**
 * RightNowBlock — the opinionated, date-aware synthesis on the Overview
 * landing. Presentational only: it receives the precomputed verdict
 * (`rightNow`), `topPicks`, and a `dayShape` from OverviewStartHere and renders
 * them. Degrades gracefully — renders nothing when there's no verdict, and
 * skips the picks / day-shape sections when their data is absent.
 */

const SCORE_BADGE = {
  Excellent: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  Good: 'bg-green-100 text-green-700 ring-green-200',
  Average: 'bg-amber-100 text-amber-700 ring-amber-200',
  'Below Avg': 'bg-orange-100 text-orange-700 ring-orange-200',
  Avoid: 'bg-red-100 text-red-700 ring-red-200',
};

const SLOTS = [
  { key: 'morning', label: 'Morning' },
  { key: 'afternoon', label: 'Afternoon' },
  { key: 'evening', label: 'Evening' },
];

function Chip({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
      <Icon className="h-3.5 w-3.5 text-blue-600" aria-hidden />
      {children}
    </span>
  );
}

export default function RightNowBlock({
  rightNow,
  topPicks = [],
  dayShape = null,
  displayName = 'this city',
  onExploreExperiences,
  onOpenWhenToGo,
}) {
  if (!rightNow) return null;

  const { periodLabel, scoreLabel, scoreRationale, verdict, weather, crowdLevel, events, considerations } = rightNow;
  const badgeClass = (scoreLabel && SCORE_BADGE[scoreLabel]) || 'bg-slate-100 text-slate-600 ring-slate-200';

  return (
    <section className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-indigo-50/60 shadow-sm">
      <div className="p-5 md:p-7">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600">
              {displayName} right now
            </p>
            <h2 className="mt-1 text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
              {periodLabel}
            </h2>
          </div>
          {scoreLabel && (
            <div className="flex flex-col items-start gap-1 sm:items-end">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1 ${badgeClass}`}>
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                {scoreLabel} time to visit
              </span>
              {scoreRationale && (
                <span className="text-[11px] font-medium text-slate-400">{scoreRationale}</span>
              )}
            </div>
          )}
        </div>

        {/* Verdict */}
        <p className="mt-3 max-w-[68ch] text-[15px] md:text-base leading-7 text-slate-700">
          {verdict}
        </p>

        {/* At-a-glance chips */}
        <div className="mt-4 flex flex-wrap gap-2">
          {weather?.tempLabel && <Chip icon={Sun}>{weather.tempLabel}</Chip>}
          {weather?.sunset && <Chip icon={Clock}>Light to {weather.sunset}</Chip>}
          {crowdLevel && <Chip icon={Users}>{crowdLevel} crowds</Chip>}
        </div>

        {/* Events on now */}
        {events?.length > 0 && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">On while you&apos;re here</p>
            <ul className="mt-1.5 space-y-1">
              {events.slice(0, 2).map((e) => (
                <li key={e.name} className="text-sm text-amber-900">
                  <span className="font-semibold">{e.name}</span>
                  {e.dates ? <span className="text-amber-700"> · {e.dates}</span> : null}
                  {e.tips ? <span className="text-amber-700"> — {e.tips}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Top picks */}
        {topPicks.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Top picks</h3>
              {onExploreExperiences && (
                <button
                  type="button"
                  onClick={onExploreExperiences}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700"
                >
                  See all <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </button>
              )}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {topPicks.slice(0, 4).map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={onExploreExperiences}
                  aria-label={`${p.name} — open in Experiences`}
                  className="group flex flex-col items-start rounded-xl border border-slate-200 bg-white/90 p-3.5 text-left transition-all hover:border-blue-300 hover:shadow-sm"
                >
                  <span className="text-sm font-semibold text-slate-900 group-hover:text-blue-700">{p.name}</span>
                  {p.description && (
                    <span className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{p.description}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Opinionated day shape */}
        {dayShape && (dayShape.morning || dayShape.afternoon || dayShape.evening) && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">If you only have a day</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {SLOTS.map(({ key, label }) => {
                const item = dayShape[key];
                if (!item) return null;
                return (
                  <div key={key} className="rounded-xl border border-slate-200 bg-white/90 p-3.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600">{label}</p>
                    <p className="mt-1 text-sm font-semibold leading-snug text-slate-900">{item.name}</p>
                    {item.arrondissement && (
                      <p className="mt-0.5 text-xs text-slate-400">{item.arrondissement}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footnote considerations + calendar CTA */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-blue-100 pt-4">
          {considerations?.length > 0 ? (
            <p className="max-w-[60ch] text-xs text-slate-500">
              Heads up: {considerations.slice(0, 2).join(' · ')}
            </p>
          ) : <span />}
          {onOpenWhenToGo && (
            <button
              type="button"
              onClick={onOpenWhenToGo}
              className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
            >
              <CalendarDays className="h-4 w-4" aria-hidden />
              See the full calendar
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
