'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus } from 'lucide-react';
import { getCountryFlag } from '@/utils/countryFlags';

/**
 * DaysSlider - Allocate days across cities
 */
export default function DaysSlider({
  cities = [],
  totalDays,
  onChange,
}) {
  // Initialize days from suggestions
  const [days, setDays] = useState(() => {
    const initial = {};
    cities.forEach(city => {
      initial[city.id] = city.suggestedDays || 2;
    });
    return initial;
  });

  // Calculate current total
  const currentTotal = useMemo(() => {
    return Object.values(days).reduce((sum, d) => sum + d, 0);
  }, [days]);

  // Check if we're over/under
  const difference = currentTotal - totalDays;

  const adjustDays = (cityId, delta) => {
    setDays(prev => {
      const city = cities.find(c => c.id === cityId);
      const current = prev[cityId] || 0;
      const min = city?.minDays || 1;
      const max = city?.maxDays || 7;
      const newValue = Math.max(min, Math.min(max, current + delta));

      return { ...prev, [cityId]: newValue };
    });
  };

  const handleConfirm = () => {
    onChange(days);
  };

  return (
    <div className="space-y-4">
      {/* Header with total */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-600">Allocate your {totalDays} days:</span>
        <span className={`
          text-sm font-medium px-2.5 py-1 rounded-full
          ${difference === 0
            ? 'bg-green-100 text-green-700'
            : difference > 0
              ? 'bg-red-100 text-red-700'
              : 'bg-yellow-100 text-yellow-700'
          }
        `}>
          {currentTotal} / {totalDays} days
          {difference > 0 && ` (+${difference})`}
          {difference < 0 && ` (${difference})`}
        </span>
      </div>

      {/* City sliders */}
      <div className="space-y-3">
        {cities.map((city, index) => {
          const cityDays = days[city.id] || 0;
          const min = city.minDays || 1;
          const max = city.maxDays || 7;

          return (
            <motion.div
              key={city.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-xl border border-slate-200 p-4"
            >
              <div className="flex items-center justify-between">
                {/* City info */}
                <div className="flex items-center gap-3">
                  <span className="text-xl">{getCountryFlag(city.country || '')}</span>
                  <div>
                    <p className="font-medium text-slate-800">{city.name}</p>
                    {city.note && (
                      <p className="text-xs text-slate-500">{city.note}</p>
                    )}
                  </div>
                </div>

                {/* Day controls */}
                <div className="flex items-center gap-3">
                  <motion.button
                    onClick={() => adjustDays(city.id, -1)}
                    disabled={cityDays <= min}
                    whileHover={cityDays > min ? { scale: 1.1 } : {}}
                    whileTap={cityDays > min ? { scale: 0.9 } : {}}
                    className={`
                      w-8 h-8 rounded-full flex items-center justify-center transition-colors
                      ${cityDays > min
                        ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        : 'bg-slate-50 text-slate-300 cursor-not-allowed'
                      }
                    `}
                  >
                    <Minus className="w-4 h-4" />
                  </motion.button>

                  <div className="w-16 text-center relative">
                    <AnimatePresence mode="popLayout">
                      <motion.span
                        key={cityDays}
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -10, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className="text-2xl font-bold text-slate-800 inline-block"
                      >
                        {cityDays}
                      </motion.span>
                    </AnimatePresence>
                    <span className="text-sm text-slate-500 ml-1">
                      {cityDays === 1 ? 'day' : 'days'}
                    </span>
                  </div>

                  <motion.button
                    onClick={() => adjustDays(city.id, 1)}
                    disabled={cityDays >= max}
                    whileHover={cityDays < max ? { scale: 1.1 } : {}}
                    whileTap={cityDays < max ? { scale: 0.9 } : {}}
                    className={`
                      w-8 h-8 rounded-full flex items-center justify-center transition-colors
                      ${cityDays < max
                        ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        : 'bg-slate-50 text-slate-300 cursor-not-allowed'
                      }
                    `}
                  >
                    <Plus className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>

              {/* Visual bar */}
              <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(cityDays / max) * 100}%` }}
                  transition={{ duration: 0.2 }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Confirm button */}
      <button
        onClick={handleConfirm}
        disabled={difference !== 0}
        className={`
          w-full py-3 font-medium rounded-xl transition-colors
          ${difference === 0
            ? 'bg-blue-500 text-white hover:bg-blue-600'
            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }
        `}
      >
        {difference === 0
          ? 'Confirm allocation'
          : difference > 0
            ? `Remove ${difference} days to continue`
            : `Add ${-difference} more days`
        }
      </button>
    </div>
  );
}
