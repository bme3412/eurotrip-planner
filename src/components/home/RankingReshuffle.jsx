'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { scoreToBand } from '@/lib/scoring/qualitative';

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Illustrative dataset — a fixed pool of well-known cities scored 0-100 for
 * each month, reflecting typical weather / crowds / value patterns. The point
 * isn't precision; it's to dramatize the core thesis: change the month and the
 * ranking reshuffles. (The live engine does this for all 220 cities and your
 * exact dates.)
 */
const CITIES = [
  { id: 'barcelona',  name: 'Barcelona',  flag: '🇪🇸', scores: [68, 70, 78, 88, 90, 84, 72, 68, 90, 89, 74, 70] },
  { id: 'rome',       name: 'Rome',       flag: '🇮🇹', scores: [66, 68, 76, 88, 86, 78, 66, 60, 84, 88, 72, 74] },
  { id: 'lisbon',     name: 'Lisbon',     flag: '🇵🇹', scores: [70, 72, 80, 86, 90, 86, 82, 80, 88, 86, 76, 72] },
  { id: 'amsterdam',  name: 'Amsterdam',  flag: '🇳🇱', scores: [58, 60, 68, 80, 86, 88, 84, 84, 82, 72, 60, 64] },
  { id: 'prague',     name: 'Prague',     flag: '🇨🇿', scores: [60, 62, 70, 82, 88, 86, 80, 80, 86, 80, 64, 70] },
  { id: 'vienna',     name: 'Vienna',     flag: '🇦🇹', scores: [62, 62, 70, 82, 88, 86, 80, 80, 86, 82, 64, 76] },
  { id: 'athens',     name: 'Athens',     flag: '🇬🇷', scores: [64, 66, 76, 88, 90, 80, 68, 62, 84, 88, 74, 68] },
  { id: 'venice',     name: 'Venice',     flag: '🇮🇹', scores: [60, 66, 74, 84, 86, 74, 62, 56, 82, 84, 66, 68] },
  { id: 'copenhagen', name: 'Copenhagen', flag: '🇩🇰', scores: [54, 56, 64, 74, 84, 90, 88, 86, 78, 68, 56, 64] },
];

export default function RankingReshuffle({ onScrollToDatePicker }) {
  const currentMonth = new Date().getMonth();
  const [month, setMonth] = useState(currentMonth);

  const ranked = [...CITIES]
    .map((c) => ({ ...c, score: c.scores[month] }))
    .sort((a, b) => b.score - a.score);

  const top = ranked[0];
  const bottom = ranked[ranked.length - 1];

  return (
    <section className="px-6 py-20 bg-white">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest mb-3">
            <span className="w-8 h-px bg-blue-600"></span>
            Why Timing Wins
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 leading-tight">
            The best city depends on <span className="text-blue-600">when</span> you go.
          </h2>
          <p className="text-gray-500 text-lg font-medium">
            Same nine cities. Tap a month and watch the ranking reshuffle — that&apos;s exactly
            what the engine does across all 220 for your exact dates.
          </p>
        </div>

        {/* Month chips */}
        <div className="flex flex-wrap gap-1.5 mb-8">
          {MONTHS_SHORT.map((m, i) => {
            const isActive = i === month;
            const isNow = i === currentMonth;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMonth(i)}
                className={`relative px-3 py-1.5 rounded-full text-sm font-bold transition-all ${
                  isActive
                    ? 'bg-gray-900 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {m}
                {isNow && (
                  <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${isActive ? 'bg-blue-400' : 'bg-blue-500'}`} />
                )}
              </button>
            );
          })}
        </div>

        {/* Ranked, reshuffling list */}
        <motion.ol className="flex flex-col gap-2">
          {ranked.map((c, idx) => (
            <motion.li
              key={c.id}
              layout
              transition={{ type: 'spring', stiffness: 500, damping: 42 }}
              className="flex items-center gap-3 sm:gap-4 rounded-2xl border border-gray-100 bg-gray-50/60 px-3 sm:px-4 py-2.5"
            >
              <span className="w-6 text-center text-sm font-extrabold text-gray-400 tabular-nums shrink-0">
                {idx + 1}
              </span>
              <span className="text-lg shrink-0" aria-hidden>{c.flag}</span>
              <span className="w-24 sm:w-28 font-bold text-gray-900 shrink-0 truncate">{c.name}</span>

              {/* Relative fit bar (length only — no number shown) */}
              <div className="flex-1 h-2.5 rounded-full bg-gray-200 overflow-hidden min-w-0">
                <motion.div
                  className={`h-full rounded-full ${scoreToBand(c.score).barClass}`}
                  animate={{ width: `${c.score}%` }}
                  transition={{ type: 'spring', stiffness: 200, damping: 30 }}
                />
              </div>

              {/* Qualitative band pill */}
              <span
                className={`w-24 sm:w-28 text-center text-[11px] sm:text-xs font-bold rounded-full px-2 py-1 shrink-0 ${scoreToBand(c.score).bg} ${scoreToBand(c.score).text}`}
              >
                {scoreToBand(c.score).label}
              </span>
            </motion.li>
          ))}
        </motion.ol>

        {/* Dynamic narrative caption */}
        <p className="mt-6 text-center text-gray-500 text-sm">
          In <strong className="text-gray-700">{MONTHS_FULL[month]}</strong>,{' '}
          <strong className="text-gray-700">{top.name}</strong> is a{' '}
          <strong className="text-gray-700">{scoreToBand(top.score).label}</strong> — while{' '}
          <strong className="text-gray-700">{bottom.name}</strong> slips to{' '}
          <strong className="text-gray-700">{scoreToBand(bottom.score).label}</strong>.
        </p>

        {/* CTA */}
        <div className="mt-8 text-center">
          <button
            onClick={onScrollToDatePicker}
            className="group inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-full hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-0.5"
          >
            Rank all 220 for my dates
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
