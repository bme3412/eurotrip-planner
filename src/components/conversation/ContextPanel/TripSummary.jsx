'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Calendar, Clock, ArrowRight } from 'lucide-react';
import { getCountryFlag } from '@/utils/countryFlags';

/**
 * TripSummary - Shows current trip state in the context panel
 */
export default function TripSummary({ trip }) {
  const {
    startCity,
    endCity,
    stops,
    totalDays,
    dates,
    preferences,
  } = trip;

  // Build ordered city list
  const allCities = useMemo(() => {
    const cities = [];
    if (startCity) cities.push({ ...startCity, type: 'start' });
    stops.forEach(s => cities.push({ ...s, type: 'stop' }));
    if (endCity) cities.push({ ...endCity, type: 'end' });
    return cities;
  }, [startCity, stops, endCity]);

  // Calculate if we have a complete trip
  const isComplete = startCity && totalDays && allCities.length > 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
        <h3 className="font-semibold text-slate-800">Your Trip</h3>
      </div>

      <div className="p-4 space-y-4">
        {/* Cities route */}
        {allCities.length > 0 ? (
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {allCities.map((city, index) => (
                <motion.div
                  key={city.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-3"
                >
                  {/* Route line indicator */}
                  <div className="flex flex-col items-center">
                    <div className={`
                      w-3 h-3 rounded-full border-2
                      ${city.type === 'start'
                        ? 'bg-green-500 border-green-500'
                        : city.type === 'end'
                          ? 'bg-red-500 border-red-500'
                          : 'bg-white border-blue-500'
                      }
                    `} />
                    {index < allCities.length - 1 && (
                      <div className="w-0.5 h-6 bg-slate-200 my-1" />
                    )}
                  </div>

                  {/* City info */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-lg">{getCountryFlag(city.country)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 truncate">
                        {city.name}
                      </p>
                      {trip.daysPerCity?.[city.id] && (
                        <p className="text-xs text-slate-500">
                          {trip.daysPerCity[city.id]} days
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Type badge */}
                  <span className={`
                    text-[10px] px-2 py-0.5 rounded-full font-medium
                    ${city.type === 'start'
                      ? 'bg-green-100 text-green-700'
                      : city.type === 'end'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-blue-100 text-blue-700'
                    }
                  `}>
                    {city.type === 'start' ? 'Start' : city.type === 'end' ? 'End' : 'Stop'}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-6 text-slate-400">
            <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No cities selected yet</p>
          </div>
        )}

        {/* Trip details */}
        {(totalDays || dates) && (
          <div className="pt-3 border-t border-slate-100 space-y-2">
            {totalDays && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Clock className="w-4 h-4" />
                <span>{totalDays} days total</span>
              </div>
            )}

            {dates?.start && dates?.end && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Calendar className="w-4 h-4" />
                <span>{dates.start} → {dates.end}</span>
              </div>
            )}

            {dates?.month && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Calendar className="w-4 h-4" />
                <span>Traveling in {dates.month}</span>
              </div>
            )}
          </div>
        )}

        {/* Preferences */}
        {(preferences?.interests?.length > 0 || preferences?.budget) && (
          <div className="pt-3 border-t border-slate-100">
            <p className="text-xs text-slate-500 mb-2">Preferences</p>
            <div className="flex flex-wrap gap-1.5">
              {preferences.interests?.map(interest => (
                <span
                  key={interest}
                  className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded-full"
                >
                  {interest}
                </span>
              ))}
              {preferences.budget && (
                <span className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded-full">
                  {preferences.budget} budget
                </span>
              )}
              {preferences.pace && (
                <span className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded-full">
                  {preferences.pace} pace
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
