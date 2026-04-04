'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, Clock, Coins, MapPin, ChevronLeft } from 'lucide-react';
import { COUNTRY_FLAGS } from '@/lib/planning/rankDestinations';

/**
 * TripSummaryModal - Shows trip summary before navigating to planner
 */
export default function TripSummaryModal({
  isOpen,
  onClose,
  onContinue,
  startingCity,
  stops,
}) {
  // Calculate totals
  const { totalTime, totalCost, legDetails } = useMemo(() => {
    let totalHours = 0;
    let totalEur = 0;
    const legs = [];

    stops.forEach((stop, index) => {
      const fromCity = index === 0 ? startingCity : stops[index - 1].city;
      const transport = stop.transport || {};

      const hours = transport.durationHours || 0;
      const cost = transport.costEur || 0;

      totalHours += hours;
      totalEur += cost;

      legs.push({
        from: fromCity,
        to: stop.city,
        transport,
        hours,
        cost,
      });
    });

    return {
      totalTime: formatTotalTime(totalHours),
      totalCost: Math.round(totalEur),
      legDetails: legs,
    };
  }, [startingCity, stops]);

  // Format total time
  function formatTotalTime(hours) {
    if (hours === 0) return 'N/A';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }

  if (!isOpen || !startingCity) return null;

  const allCities = [startingCity, ...stops.map(s => s.city)];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg bg-white rounded-2xl shadow-2xl z-50 flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">Your Trip Summary</h2>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {/* Route Chain Visual */}
              <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
                {allCities.map((city, index) => (
                  <div key={city.id} className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 bg-slate-100 rounded-full px-3 py-1.5 text-sm font-medium text-slate-700">
                      <span>{city.flag || COUNTRY_FLAGS[city.country] || '🏳️'}</span>
                      <span>{city.name}</span>
                    </span>
                    {index < allCities.length - 1 && (
                      <ArrowRight className="w-4 h-4 text-slate-300" />
                    )}
                  </div>
                ))}
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-blue-500 mb-1">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="text-lg font-bold text-slate-800">{totalTime}</div>
                  <div className="text-xs text-slate-500">Total Travel</div>
                </div>

                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-emerald-500 mb-1">
                    <Coins className="w-4 h-4" />
                  </div>
                  <div className="text-lg font-bold text-slate-800">~€{totalCost}</div>
                  <div className="text-xs text-slate-500">Est. Cost</div>
                </div>

                <div className="bg-purple-50 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-purple-500 mb-1">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="text-lg font-bold text-slate-800">{allCities.length}</div>
                  <div className="text-xs text-slate-500">Cities</div>
                </div>
              </div>

              {/* Route Details */}
              <div className="bg-slate-50 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-slate-600 mb-3">Route Details</h3>
                <div className="space-y-3">
                  {legDetails.map((leg, index) => (
                    <div
                      key={`${leg.from.id}-${leg.to.id}`}
                      className="flex items-center gap-3 text-sm"
                    >
                      <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-slate-700">{leg.from.name}</span>
                        <span className="text-slate-400 mx-2">→</span>
                        <span className="font-medium text-slate-700">{leg.to.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500 flex-shrink-0">
                        <span>{leg.transport.icon || '🚂'}</span>
                        <span>{leg.transport.durationFormatted || 'N/A'}</span>
                        <span className="text-slate-300">·</span>
                        <span>€{leg.cost}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center gap-3 px-5 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
              <button
                onClick={onClose}
                className="flex-1 py-3 px-4 bg-white border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to Edit
              </button>
              <button
                onClick={onContinue}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
              >
                Continue to Planner
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
