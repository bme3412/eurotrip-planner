'use client';

import React from 'react';
import { getCityDisplayName, getCityNickname } from '@/utils/cityDataUtils';

import GettingAroundBlock from './GettingAroundBlock';

/**
 * OverviewStartHere — the city guide's default landing view.
 *
 * Orients a first-time visitor with a single "start here" card: a why-visit
 * synthesis, a compact at-a-glance facts strip, and the editorial reasons to
 * go (from `why_visit.highlights`, which nothing else surfaces). Below it sit
 * the airport-to-city "getting in & around" essentials and the interactive
 * map. All content comes from the `overview` object the server shell ships;
 * the getting-in block lazy-loads its prose.
 */
export default function OverviewStartHere({ overview = {}, cityName, mapSlot = null }) {
  const displayName = getCityDisplayName({ overview }, cityName);
  const nickname = getCityNickname({ overview });
  // Lead with the richest authored copy — the multi-sentence brief_description —
  // and fall back to the shorter why-visit intro when a city lacks one.
  const lead = overview?.brief_description || overview?.why_visit?.intro || '';
  const info = overview?.practical_info || {};

  // At-a-glance facts — only the trip-planning essentials, only if present.
  const facts = [
    ['Best time', overview?.best_time_to_visit?.overall || ''],
    ['Language', info.language],
    ['Currency', info.currency],
  ].filter(([, value]) => value);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Start here — unified intro + facts + reasons to go */}
      <section className="rounded-2xl border border-gray-100 bg-white p-6 md:p-8 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600">
          Start here
        </p>
        <h2 className="mt-1 text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
          {displayName}
          {nickname ? <span className="text-slate-400 font-semibold"> — {nickname}</span> : null}
        </h2>

        {lead && (
          <p className="mt-3 text-[15.5px] md:text-base leading-7 text-slate-700">
            {lead}
          </p>
        )}

        {facts.length > 0 && (
          <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-3 border-y border-gray-100 py-4">
            {facts.map(([label, value]) => (
              <div key={label}>
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {label}
                </dt>
                <dd className="mt-0.5 text-sm font-semibold leading-snug text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
        )}

      </section>

      {/* Getting in & around — airport-to-city + getting-around essentials */}
      <GettingAroundBlock cityName={cityName} displayName={displayName} />

      {/* Interactive map — explore attractions & neighborhoods in place */}
      {mapSlot}
    </div>
  );
}
