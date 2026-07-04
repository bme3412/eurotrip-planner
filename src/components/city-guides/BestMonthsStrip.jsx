'use client';

import React from 'react';
import { computeBestMonths } from '@/lib/city-guide/bestMonths';
import { bandFor } from './visitBands';

/**
 * BestMonthsStrip — the "short answer" that leads the When to Go tab.
 *
 * Most visitors open this tab with one question: which months? The full
 * 12-month calendar below answers it in detail; this strip answers it in two
 * seconds — the top-band months (from the same visitCalendar day scores the
 * calendar renders) as tappable pills that open that month's detail, plus the
 * one-line editorial why from bestTimeRecommendations.
 */
export default function BestMonthsStrip({ visitCalendar, onOpenMonth }) {
  const bestMonths = computeBestMonths(visitCalendar?.months);
  if (bestMonths.length === 0) return null;

  const overall = visitCalendar?.bestTimeRecommendations?.overall;

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 md:p-6 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600">
        The short answer
      </p>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-slate-900">Best months to go:</span>
        {bestMonths.map(({ key, name, avg }) => {
          const band = bandFor(avg);
          return (
            <button
              key={key}
              type="button"
              onClick={() => onOpenMonth?.(name)}
              title={`${band.label} — open ${name} details`}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 transition-colors hover:border-blue-300 hover:bg-blue-50"
            >
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: band.dot }}
              />
              {name}
            </button>
          );
        })}
      </div>
      {overall?.why && (
        <p className="mt-2.5 text-sm leading-relaxed text-slate-600">
          {Array.isArray(overall.best) && overall.best.length > 0 && (
            <span className="font-medium text-slate-700">{overall.best.join(' and ')} — </span>
          )}
          {overall.why}
        </p>
      )}
    </section>
  );
}
