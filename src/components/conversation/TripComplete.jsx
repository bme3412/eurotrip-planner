'use client';

import { motion } from 'framer-motion';
import { Check, MapPin, Calendar, Sparkles, ArrowRight, RefreshCw, Download } from 'lucide-react';
import { getCountryFlag } from '@/utils/countryFlags';

/**
 * TripComplete - Success screen after trip is finalized
 */
export default function TripComplete({
  trip,
  onStartOver,
  onPlanCity,
}) {
  const { startCity, endCity, stops, totalDays, dates, daysPerCity } = trip;

  // Build ordered route
  const route = [];
  if (startCity) {
    route.push({ ...startCity, type: 'start', days: daysPerCity?.[startCity.id] });
  }
  stops?.forEach(stop => {
    route.push({ ...stop, type: 'stop', days: daysPerCity?.[stop.id] });
  });
  if (endCity && endCity !== startCity) {
    route.push({ ...endCity, type: 'end', days: daysPerCity?.[endCity.id] });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto"
    >
      {/* Success header */}
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.2 }}
          className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
        >
          <Check className="w-8 h-8 text-green-600" />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-2xl font-semibold text-slate-800 mb-2"
        >
          Your Trip is Ready!
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-slate-600"
        >
          {route.length} {route.length === 1 ? 'destination' : 'destinations'} over {totalDays} days
          {dates?.start && dates?.end && (
            <span className="block text-sm mt-1">
              {dates.start} to {dates.end}
            </span>
          )}
        </motion.p>
      </div>

      {/* Route summary card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6"
      >
        <div className="p-4 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <MapPin className="w-4 h-4" />
            Your Route
          </div>
        </div>

        <div className="p-4">
          {route.map((city, index) => (
            <motion.div
              key={city.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + index * 0.1 }}
              className="relative"
            >
              {/* Connector line */}
              {index < route.length - 1 && (
                <div className="absolute left-4 top-10 w-0.5 h-8 bg-slate-200" />
              )}

              {/* City row */}
              <div className="flex items-center gap-4 py-2">
                {/* Number badge */}
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${city.type === 'start'
                    ? 'bg-green-100 text-green-700'
                    : city.type === 'end'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-blue-100 text-blue-700'
                  }
                `}>
                  {index + 1}
                </div>

                {/* City info */}
                <div className="flex-1 flex items-center gap-3">
                  <span className="text-xl">{getCountryFlag(city.country)}</span>
                  <div>
                    <div className="font-medium text-slate-800">{city.name}</div>
                    <div className="text-xs text-slate-500">{city.country}</div>
                  </div>
                </div>

                {/* Days */}
                {city.days && (
                  <div className="text-sm text-slate-600">
                    {city.days} {city.days === 1 ? 'day' : 'days'}
                  </div>
                )}

                {/* Plan this city button */}
                <button
                  onClick={() => onPlanCity?.(city)}
                  className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  Plan
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Next steps */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl border border-violet-200 p-6 mb-6"
      >
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 mb-1">
              Ready to plan the details?
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Click on any city above to create a detailed day-by-day itinerary with activities, restaurants, and more.
            </p>

            {route.length > 0 && (
              <button
                onClick={() => onPlanCity?.(route[0])}
                className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors"
              >
                Start with {route[0].name}
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Action buttons */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="flex items-center justify-center gap-4"
      >
        <button
          onClick={onStartOver}
          className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Start Over
        </button>

        <button
          onClick={() => {
            // TODO: Implement save/export
            console.log('Export trip:', trip);
          }}
          className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </motion.div>
    </motion.div>
  );
}
