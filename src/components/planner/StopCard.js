'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, AlertTriangle, RotateCcw, Plus } from 'lucide-react';
import CandidateRow from './CandidateRow';
import { rankDestinations } from '@/lib/planning/rankDestinations';
import { COUNTRY_FLAGS } from '@/lib/planning/rankDestinations';

/**
 * StopCard - Represents a stop in the chain with multiple states
 *
 * States:
 * - 'committed': Compact view showing selected city + transport
 * - 'active': Expanded view showing destination candidates
 * - 'editing': Like active, but with warning about downstream changes
 * - 'frontier': Ghost card placeholder for adding new stop
 *
 * @param {Object} props
 * @param {Object} stop - Stop data (null for frontier)
 * @param {number} index - Stop index in chain
 * @param {string} state - 'committed' | 'active' | 'editing' | 'frontier'
 * @param {Object} fromCity - Previous city (for candidates lookup)
 * @param {string} tripStyle - Current trip style filter
 * @param {string[]} excludeIds - City IDs to exclude from candidates
 * @param {Function} onSelect - Called when a candidate is selected
 * @param {Function} onEdit - Called when Edit is clicked on committed card
 * @param {Function} onKeepOriginal - Called when "Keep original" is clicked in editing mode
 * @param {Function} onAddStop - Called when frontier card is clicked
 * @param {boolean} disabled - Whether the card is disabled (downstream of editing)
 * @param {boolean} isDownstream - Whether this is downstream of an editing stop
 * @param {number} maxStops - Maximum allowed stops
 * @param {number} currentStopCount - Current number of stops
 */
export default function StopCard({
  stop,
  index,
  state,
  fromCity,
  tripStyle = 'everyone',
  excludeIds = [],
  onSelect,
  onEdit,
  onKeepOriginal,
  onAddStop,
  disabled = false,
  isDownstream = false,
  maxStops = 8,
  currentStopCount = 0,
}) {
  const [candidates, setCandidates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load candidates when in active or editing state
  useEffect(() => {
    if ((state === 'active' || state === 'editing') && fromCity) {
      setIsLoading(true);
      rankDestinations(fromCity.id, tripStyle, excludeIds, 8)
        .then(results => {
          setCandidates(results);
          setIsLoading(false);
        })
        .catch(err => {
          console.error('[StopCard] Failed to load candidates:', err);
          setIsLoading(false);
        });
    }
  }, [state, fromCity?.id, tripStyle, excludeIds.join(',')]);

  // FRONTIER state - ghost card for adding new stop
  if (state === 'frontier') {
    const canAdd = currentStopCount < maxStops;

    return (
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        onClick={canAdd ? onAddStop : undefined}
        disabled={!canAdd || disabled}
        className={`
          w-full p-4 rounded-xl border-2 border-dashed transition-all duration-200
          ${canAdd && !disabled
            ? 'border-slate-300 hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer group'
            : 'border-slate-200 bg-slate-50 cursor-not-allowed opacity-50'
          }
        `}
      >
        <div className="flex items-center justify-center gap-2 text-slate-400 group-hover:text-blue-500 transition-colors">
          <Plus className="w-5 h-5" />
          <span className="font-medium">
            {canAdd ? 'Add another stop' : `Maximum ${maxStops} stops reached`}
          </span>
        </div>
      </motion.button>
    );
  }

  // COMMITTED state - compact summary
  if (state === 'committed' && stop) {
    const { city, transport } = stop;

    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: isDownstream ? 0.5 : 1, y: 0 }}
        className={`
          relative rounded-xl border-2 transition-all duration-200
          ${isDownstream
            ? 'border-slate-200 bg-slate-50'
            : 'border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50'
          }
        `}
      >
        {/* Downstream warning overlay */}
        {isDownstream && (
          <div className="absolute inset-0 bg-amber-500/10 rounded-xl flex items-center justify-center z-10">
            <div className="bg-amber-100 border border-amber-300 rounded-lg px-3 py-1.5 text-xs font-medium text-amber-700 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Will be updated
            </div>
          </div>
        )}

        <div className="p-4">
          <div className="flex items-center gap-3">
            {/* Stop number */}
            <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
              {index + 1}
            </div>

            {/* City info */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-xl">{city.flag || COUNTRY_FLAGS[city.country] || '🏳️'}</span>
              <div className="min-w-0">
                <div className="font-semibold text-slate-800 truncate">
                  {city.name}, {city.country}
                </div>
                {transport && (
                  <div className="text-xs text-slate-500 flex items-center gap-1.5">
                    <span>{transport.icon}</span>
                    <span>{transport.durationFormatted}</span>
                    <span className="text-slate-300">·</span>
                    <span>~€{transport.costEur}</span>
                    <span className="text-slate-300">·</span>
                    <span className="truncate">{transport.frequency}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Edit button */}
            {!isDownstream && (
              <button
                onClick={onEdit}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                Edit
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // ACTIVE or EDITING state - expanded with candidates
  if ((state === 'active' || state === 'editing') && fromCity) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border-2 border-blue-200 bg-white shadow-lg shadow-blue-500/10 overflow-hidden"
      >
        {/* Header */}
        <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">
                {index + 1}
              </div>
              <h3 className="font-semibold text-slate-800">
                Where to next from{' '}
                <span className="text-blue-600">{fromCity.name}</span>?
              </h3>
            </div>

            {/* Keep original button in editing mode */}
            {state === 'editing' && onKeepOriginal && (
              <button
                onClick={onKeepOriginal}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 hover:border-slate-300 rounded-lg transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Keep original
              </button>
            )}
          </div>

          {/* Editing warning */}
          {state === 'editing' && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Changing this stop will update the rest of your route</span>
            </div>
          )}
        </div>

        {/* Candidates list */}
        <div className="p-3 space-y-2 max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 text-sm text-slate-500">Finding destinations...</span>
            </div>
          ) : candidates.length > 0 ? (
            <AnimatePresence>
              {candidates.map((candidate, i) => (
                <CandidateRow
                  key={candidate.city.id}
                  candidate={candidate}
                  onSelect={() => onSelect(candidate)}
                  index={i}
                />
              ))}
            </AnimatePresence>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <p>No destinations available from {fromCity.name}</p>
              <p className="text-xs mt-1">Try selecting a different starting city</p>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // Fallback
  return null;
}
