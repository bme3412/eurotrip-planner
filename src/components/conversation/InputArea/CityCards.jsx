'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Train, Plane } from 'lucide-react';
import { getCountryFlag } from '@/utils/countryFlags';

/**
 * CityCards - Grid of city suggestion cards
 */
export default function CityCards({
  cities = [],
  allowMultiple = true,
  fromCity,
  onSelect,
}) {
  const [selected, setSelected] = useState(new Set());

  const toggleCity = (cityId) => {
    if (allowMultiple) {
      const newSelected = new Set(selected);
      if (newSelected.has(cityId)) {
        newSelected.delete(cityId);
      } else {
        newSelected.add(cityId);
      }
      setSelected(newSelected);
    } else {
      // Single select - immediately send
      const city = cities.find(c => c.id === cityId);
      if (city) {
        onSelect(city, 'stop');
      }
    }
  };

  const handleConfirm = () => {
    const selectedCities = cities.filter(c => selected.has(c.id));
    selectedCities.forEach(city => {
      onSelect(city, 'stop');
    });
  };

  const handleSkip = () => {
    onSelect(null, 'skip');
  };

  // Get transport icon
  const getTransportIcon = (mode) => {
    if (mode === 'flight') return Plane;
    return Train;
  };

  // Format travel time
  const formatTravelTime = (minutes) => {
    if (!minutes) return null;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="space-y-4">
      {/* City grid */}
      <div className="grid grid-cols-2 gap-3">
        {cities.map((city, index) => {
          const isSelected = selected.has(city.id);
          const TransportIcon = getTransportIcon(city.transportMode);
          const travelTime = formatTravelTime(city.travelMinutes);

          return (
            <motion.button
              key={city.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 25,
                delay: index * 0.08,
              }}
              onClick={() => toggleCity(city.id)}
              className={`
                relative p-4 rounded-xl border-2 text-left transition-all
                ${isSelected
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm'
                }
              `}
            >
              {/* Selection indicator */}
              <AnimatePresence>
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 180 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                    className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-md"
                  >
                    <Check className="w-4 h-4 text-white" />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Score badge */}
              {city.score && (
                <div className="absolute top-2 right-2">
                  <div className={`
                    px-2 py-0.5 rounded-full text-xs font-semibold
                    ${city.score >= 80
                      ? 'bg-green-100 text-green-700'
                      : city.score >= 60
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-slate-100 text-slate-600'
                    }
                  `}>
                    {city.score}
                  </div>
                </div>
              )}

              {/* City info */}
              <div className="flex items-start gap-3">
                <span className="text-2xl">{getCountryFlag(city.country)}</span>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-slate-800 truncate">
                    {city.name}
                  </h4>
                  <p className="text-sm text-slate-500">{city.country}</p>

                  {/* Travel time */}
                  {travelTime && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
                      <TransportIcon className="w-3.5 h-3.5" />
                      <span>{travelTime}</span>
                    </div>
                  )}

                  {/* Highlight reason */}
                  {city.highlight && (
                    <p className="text-xs text-slate-600 mt-2 line-clamp-2">
                      {city.highlight}
                    </p>
                  )}

                  {/* Match reasons as chips */}
                  {city.matchReasons && city.matchReasons.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {city.matchReasons.slice(0, 2).map((reason, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 text-[10px] bg-slate-100 text-slate-600 rounded-full"
                        >
                          {reason}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {allowMultiple ? (
          <>
            <button
              onClick={handleConfirm}
              disabled={selected.size === 0}
              className={`
                flex-1 py-3 font-medium rounded-xl transition-colors
                ${selected.size > 0
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }
              `}
            >
              {selected.size > 0
                ? `Add ${selected.size} ${selected.size === 1 ? 'city' : 'cities'}`
                : 'Select cities'}
            </button>
            <button
              onClick={handleSkip}
              className="px-6 py-3 border-2 border-slate-200 text-slate-600 font-medium rounded-xl hover:border-slate-300 transition-colors"
            >
              Skip
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
