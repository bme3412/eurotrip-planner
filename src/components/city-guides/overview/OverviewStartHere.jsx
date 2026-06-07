'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { getCityDisplayName, getCityNickname } from '@/utils/cityDataUtils';
import { fetchCityDataUrl } from '@/lib/city-data';
import { ArrowRight } from 'lucide-react';

import RightNowBlock from './RightNowBlock';
import { buildRightNow, flattenTopExperiences, buildDayShape } from './lib/rightNow';

/**
 * OverviewStartHere — the city guide's default landing view.
 *
 * Orients a first-time visitor before the analytical calendar does: a tight
 * "why this city" synthesis, an opinionated date-aware "right now" block, the
 * editorial reasons to visit, and the know-before-you-go basics.
 *
 * All prose / highlights / practical info come from the `overview` object the
 * server shell already ships (no fetch). The only lazy fetch is the scored
 * experiences payload, used to power the top picks + day shape; it degrades
 * gracefully (those sections simply don't render until it lands). The current
 * date is read after mount so the verdict never causes a hydration mismatch.
 */
export default function OverviewStartHere({
  overview = {},
  cityName,
  visitCalendar,
  experiencesUrl,
  onOpenTab,
}) {
  const displayName = getCityDisplayName({ overview }, cityName);
  const nickname = getCityNickname({ overview });
  // The page hero already shows brief_description, so the Start-here card leads
  // with the why-visit synthesis instead — distinct copy, no repetition.
  const lead = overview?.why_visit?.intro || overview?.brief_description || '';
  const highlights = overview?.why_visit?.highlights || [];
  const info = overview?.practical_info || {};

  // "At a glance" facts — only fields that exist, kept short.
  const idealStay = info.visit_duration || '2–3 days';
  const bestTime = overview?.best_time_to_visit?.overall || '';
  const population = formatPopulation(overview?.population);

  // Client-only "today" so the date-aware verdict can't mismatch SSR.
  const [today, setToday] = useState(null);
  useEffect(() => { setToday(new Date()); }, []);

  // Lazy-load the scored experiences for top picks + day shape.
  const [experiencesJson, setExperiencesJson] = useState(null);
  useEffect(() => {
    if (!experiencesUrl) return;
    let cancelled = false;
    fetchCityDataUrl(experiencesUrl, { cache: 'force-cache' })
      .then((json) => { if (!cancelled) setExperiencesJson(json); })
      .catch(() => { /* optional — picks just won't render */ });
    return () => { cancelled = true; };
  }, [experiencesUrl]);

  const rightNow = useMemo(
    () => (today ? buildRightNow({ visitCalendar, cityDisplayName: displayName, today }) : null),
    [visitCalendar, displayName, today],
  );
  const topPicks = useMemo(() => flattenTopExperiences(experiencesJson, 4), [experiencesJson]);
  const dayShape = useMemo(() => buildDayShape(experiencesJson), [experiencesJson]);

  const openTab = (id) => () => onOpenTab?.(id);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Lede: intro synthesis (left) + at-a-glance facts (right) */}
      <div className="grid gap-6 lg:grid-cols-5">
        <section className="lg:col-span-3 rounded-2xl border border-gray-100 bg-white p-6 md:p-8 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600">
            Start here
          </p>
          <h2 className="mt-1 text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
            {displayName}{nickname ? <span className="text-slate-400 font-semibold"> — {nickname}</span> : null}
          </h2>
          {lead && (
            <p className="mt-3 text-[15.5px] md:text-base leading-7 text-slate-700">
              {lead}
            </p>
          )}
        </section>

        {(bestTime || info.language || info.currency || population) && (
          <aside className="lg:col-span-2 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600">
              At a glance
            </p>
            <dl className="mt-3 divide-y divide-gray-100">
              <GlanceRow label="Ideal stay" value={idealStay} />
              <GlanceRow label="Best time" value={bestTime} />
              <GlanceRow label="Language" value={info.language} />
              <GlanceRow label="Currency" value={info.currency} />
              <GlanceRow label="Population" value={population} />
            </dl>
          </aside>
        )}
      </div>

      {/* Date-aware "right now" synthesis */}
      <RightNowBlock
        rightNow={rightNow}
        topPicks={topPicks}
        dayShape={dayShape}
        displayName={displayName}
        onExploreExperiences={openTab('attractions')}
        onOpenWhenToGo={openTab('when')}
      />

      {/* Why visit */}
      {highlights.length > 0 && (
        <section>
          <h3 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
            Why visit {displayName}
          </h3>
          <p className="mt-1.5 max-w-[68ch] text-sm md:text-[15px] leading-6 text-slate-500">
            The places and experiences that make {displayName} worth the trip.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {highlights.map((h) => (
              <div key={h.title} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                <h4 className="text-base font-semibold text-slate-900">{h.title}</h4>
                <p className="mt-1.5 line-clamp-3 text-sm leading-6 text-slate-600">{h.content}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Know before you go */}
      {(info.language || info.currency || info.timezone || info.emergency_number) && (
        <section className="rounded-2xl border border-gray-100 bg-white p-6 md:p-7 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xl font-bold tracking-tight text-slate-900">Know before you go</h3>
            <button
              type="button"
              onClick={openTab('gettingin')}
              className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              Getting in &amp; around <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {info.language && <Fact label="Language" value={info.language} />}
            {info.currency && <Fact label="Currency" value={info.currency} />}
            {info.timezone && <Fact label="Time zone" value={info.timezone} />}
            {info.emergency_number && <Fact label="Emergency" value={info.emergency_number} />}
          </dl>
        </section>
      )}
    </div>
  );
}

function Fact({ label, value }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

// Population may be a number, a string, or an object like {city, metro, unit}.
// Always return a renderable string (never an object — React would throw).
function formatPopulation(p) {
  if (typeof p === 'number') return p.toLocaleString();
  if (typeof p === 'string') return p;
  if (p && typeof p === 'object') {
    const v = p.city ?? p.metro ?? p.value ?? p.total;
    if (v != null) return `${typeof v === 'number' ? v.toLocaleString() : v}${p.unit ? ` ${p.unit}` : ''}`;
  }
  return '';
}

// One label/value row in the "At a glance" panel; renders nothing without a value.
function GlanceRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="py-2.5 first:pt-0 last:pb-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold leading-snug text-slate-900">{value}</dd>
    </div>
  );
}
