'use client';

import React from 'react';
import { TRAVELER_LABELS } from './lib/constants';
import { formatMonthList } from './lib/derived';

const TONE_CLASSES = {
  emerald: 'bg-emerald-50 border-emerald-100 text-emerald-800',
  blue: 'bg-blue-50 border-blue-100 text-blue-800',
  rose: 'bg-rose-50 border-rose-100 text-rose-800',
  violet: 'bg-violet-50 border-violet-100 text-violet-800',
};

/**
 * The four "Best overall / Best value / Plan around / Best for X" KPI
 * cards above the calendar.
 */
export default function BestTimeKpiCards({
  bestMonthsOverall = [],
  valueMonths = [],
  avoidMonthsOverall = [],
  bestTravelerMonth = null,
  travelerTypeFilter = 'all',
  fallbackBestMonth = null,
}) {
  const cards = [
    {
      label: 'Best overall',
      value: formatMonthList(bestMonthsOverall, fallbackBestMonth || 'April-June'),
      detail: 'Prime weather and classic Paris atmosphere',
      tone: 'emerald',
    },
    {
      label: 'Best value',
      value: formatMonthList(valueMonths, 'November-February'),
      detail: 'Good scores with lighter crowds or softer pricing',
      tone: 'blue',
    },
    {
      label: 'Plan around',
      value: formatMonthList(avoidMonthsOverall, 'August peak closures'),
      detail: 'Higher friction from crowds, closures, or weather',
      tone: 'rose',
    },
    {
      label: `Best for ${TRAVELER_LABELS[travelerTypeFilter]?.toLowerCase() || 'your style'}`,
      value: bestTravelerMonth || formatMonthList(bestMonthsOverall),
      detail: 'Updates when you change traveler type below',
      tone: 'violet',
    },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className={`rounded-xl border p-4 ${TONE_CLASSES[card.tone]}`}>
          <div className="text-xs font-semibold uppercase tracking-wide opacity-75">{card.label}</div>
          <div className="mt-1 text-lg font-bold text-gray-950">{card.value}</div>
          <p className="mt-1 text-sm leading-snug text-gray-600">{card.detail}</p>
        </div>
      ))}
    </div>
  );
}
