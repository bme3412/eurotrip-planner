'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

/**
 * CandidateRow - A single destination option in the ACTIVE stop card
 *
 * @param {Object} candidate - Destination data from rankDestinations
 * @param {Function} onSelect - Callback when destination is selected
 * @param {number} index - Row index for animation stagger
 */
export default function CandidateRow({ candidate, onSelect, index = 0 }) {
  const {
    city,
    bestTrip,
    fastestFormatted,
    cheapestEur,
    transportIcon,
    transportName,
    frequency,
    isBestTrip,
    isFastest,
    isCheapest,
  } = candidate;

  return (
    <motion.button
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
      onClick={() => onSelect(candidate)}
      className={`
        group w-full text-left px-4 py-3 rounded-xl border-2 transition-all duration-200
        ${isBestTrip
          ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/10'
          : 'bg-white border-slate-100 hover:border-slate-300 hover:shadow-md'
        }
      `}
    >
      <div className="flex items-center gap-3">
        {/* City Info */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-xl flex-shrink-0">{city.flag}</span>
          <div className="min-w-0">
            <div className="font-semibold text-slate-800 truncate">
              {city.name}
            </div>
            <div className="text-xs text-slate-400 truncate">
              {city.country}
            </div>
          </div>
        </div>

        {/* Scores - Desktop */}
        <div className="hidden sm:flex items-center gap-2">
          {/* Best Trip Score */}
          <div
            className={`
              flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold
              ${isBestTrip
                ? 'bg-blue-500 text-white'
                : 'bg-slate-100 text-slate-600'
              }
            `}
            title="Best Trip Score"
          >
            <span>🏆</span>
            <span>{bestTrip}</span>
          </div>

          {/* Fastest */}
          <div
            className={`
              flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold
              ${isFastest
                ? 'bg-amber-500 text-white'
                : 'bg-slate-100 text-slate-600'
              }
            `}
            title="Travel Time"
          >
            <span>⚡</span>
            <span>{fastestFormatted}</span>
          </div>

          {/* Cheapest */}
          <div
            className={`
              flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold
              ${isCheapest
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-100 text-slate-600'
              }
            `}
            title="Estimated Cost"
          >
            <span>💸</span>
            <span>€{cheapestEur}</span>
          </div>
        </div>

        {/* Transport Info */}
        <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 min-w-[120px]">
          <span className="text-base">{transportIcon}</span>
          <span className="font-medium">{transportName}</span>
          <span className="text-slate-400">·</span>
          <span className="text-slate-400 truncate">{frequency}</span>
        </div>

        {/* Select Arrow */}
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 group-hover:bg-blue-500 flex items-center justify-center transition-colors">
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
        </div>
      </div>

      {/* Mobile: Scores row */}
      <div className="sm:hidden flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
        <div
          className={`
            flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold
            ${isBestTrip ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'}
          `}
        >
          <span>🏆</span>
          <span>{bestTrip}</span>
        </div>
        <div
          className={`
            flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold
            ${isFastest ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600'}
          `}
        >
          <span>⚡</span>
          <span>{fastestFormatted}</span>
        </div>
        <div
          className={`
            flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold
            ${isCheapest ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'}
          `}
        >
          <span>💸</span>
          <span>€{cheapestEur}</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-slate-400 ml-auto">
          <span>{transportIcon}</span>
          <span>{frequency}</span>
        </div>
      </div>
    </motion.button>
  );
}
