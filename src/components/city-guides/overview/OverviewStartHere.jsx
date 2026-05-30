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
  const brief = overview?.brief_description || '';
  const sectionTitles = Array.isArray(overview?.sections)
    ? overview.sections.map((s) => s?.title).filter(Boolean)
    : [];
  const highlights = overview?.why_visit?.highlights || [];
  const info = overview?.practical_info || {};

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
      {/* Intro synthesis */}
      <section className="rounded-2xl border border-gray-100 bg-white p-6 md:p-8 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600">
          Start here
        </p>
        <h2 className="mt-1 text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
          {displayName}{nickname ? <span className="text-slate-400 font-semibold"> — {nickname}</span> : null}
        </h2>
        {brief && (
          <p className="mt-3 max-w-[70ch] text-[15.5px] md:text-base leading-7 text-slate-700">
            {brief}
          </p>
        )}
        {sectionTitles.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {sectionTitles.map((t) => (
              <span key={t} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {t}
              </span>
            ))}
          </div>
        )}
      </section>

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
          {overview?.why_visit?.intro && (
            <p className="mt-1.5 max-w-[68ch] text-sm md:text-[15px] leading-6 text-slate-600">
              {overview.why_visit.intro}
            </p>
          )}
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {highlights.map((h) => (
              <div key={h.title} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                <h4 className="text-base font-semibold text-slate-900">{h.title}</h4>
                <p className="mt-1.5 text-sm leading-6 text-slate-600">{h.content}</p>
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
