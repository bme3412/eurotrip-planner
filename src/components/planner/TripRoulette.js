'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dice5, ArrowRight, RotateCcw, Sparkles } from 'lucide-react';
import RouletteCard from './RouletteCard';
import RouteConnector from './RouteConnector';
import { calculateEaseScores, getTopCities, getRandomCities } from '@/lib/planning/easeScoreCalculator';

export default function TripRoulette({ anchorCity = 'barcelona', onBuildTrip }) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [cities, setCities] = useState([]);
  const [lockedCities, setLockedCities] = useState([]);
  const [hasSpun, setHasSpun] = useState(false);
  const [spinCount, setSpinCount] = useState(0);
  const [allScores, setAllScores] = useState([]);

  const anchorData = {
    id: anchorCity,
    name: anchorCity.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    country: '',
  };

  const loadScores = useCallback(async () => {
    try {
      const scores = await calculateEaseScores(anchorCity);
      setAllScores(scores);
      return scores;
    } catch (error) {
      console.error('[TripRoulette] Failed to load scores:', error);
      return [];
    }
  }, [anchorCity]);

  useEffect(() => {
    setHasSpun(false);
    setSpinCount(0);
    setCities([]);
    setLockedCities([]);
    setAllScores([]);

    loadScores().then(scores => {
      if (scores.length > 0) {
        const top = getTopCities(scores, 3, []);
        setCities(top);
        setHasSpun(true);
        setSpinCount(1);
      }
    });
  }, [anchorCity, loadScores]);

  async function handleSpin() {
    setIsSpinning(true);
    setSpinCount(prev => prev + 1);

    let scores = allScores;
    if (scores.length === 0) {
      scores = await loadScores();
    }

    const minDuration = hasSpun ? 1000 : 1800;

    await new Promise(resolve => setTimeout(resolve, minDuration));

    const lockedIds = lockedCities;
    const newCities = hasSpun
      ? getRandomCities(scores, 3 - lockedIds.length, lockedIds)
      : getTopCities(scores, 3, lockedIds);

    const locked = cities.filter(c => lockedIds.includes(c.id));
    setCities([...locked, ...newCities].slice(0, 3));

    setIsSpinning(false);
    setHasSpun(true);
  }

  function toggleCityLock(cityId) {
    setLockedCities(prev =>
      prev.includes(cityId)
        ? prev.filter(id => id !== cityId)
        : [...prev, cityId]
    );
  }

  function handleBuildTrip() {
    const selected = cities.filter(c => lockedCities.includes(c.id));
    const tripCities = selected.length > 0 ? selected : cities;
    if (onBuildTrip) {
      onBuildTrip([anchorCity, ...tripCities.map(c => c.id)]);
    } else {
      console.log('[TripRoulette] Build trip:', [anchorCity, ...tripCities.map(c => c.id)]);
    }
  }

  return (
    <div className="w-full">
      {/* Spin status */}
      <AnimatePresence>
        {isSpinning && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-center mb-6"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20">
              <Sparkles className="h-3.5 w-3.5 text-blue-400 animate-pulse" />
              <span className="text-xs font-semibold text-blue-300">
                Finding routes from {anchorData.name}...
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Route Timeline */}
      <div className="mb-10">
        {cities.length > 0 ? (
          <>
            {/* Desktop: horizontal timeline */}
            <div className="hidden md:flex items-start justify-center overflow-x-auto pb-4 scrollbar-hide">
              <div className="flex items-start">
                {/* Anchor node */}
                <RouletteCard
                  city={anchorData}
                  isAnchor
                  delay={0}
                  isSpinning={false}
                />

                {/* City nodes with connectors */}
                {cities.map((city, index) => {
                  const baseDelay = 0.2 + index * 0.3;
                  const isLocked = lockedCities.includes(city.id);

                  return (
                    <div key={`${city.id}-${spinCount}`} className="flex items-start">
                      <RouteConnector
                        type={city.transportType || 'train'}
                        time={city.transportTime}
                        delay={baseDelay}
                        isSpinning={isSpinning}
                      />
                      <RouletteCard
                        city={city}
                        isLocked={isLocked}
                        onToggleLock={() => toggleCityLock(city.id)}
                        delay={baseDelay + 0.15}
                        isSpinning={isSpinning && !isLocked}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mobile: vertical timeline */}
            <div className="md:hidden flex flex-col items-center">
              {/* Anchor node */}
              <RouletteCard
                city={anchorData}
                isAnchor
                delay={0}
                isSpinning={false}
              />

              {/* City nodes with vertical connectors */}
              {cities.map((city, index) => {
                const baseDelay = 0.2 + index * 0.3;
                const isLocked = lockedCities.includes(city.id);

                return (
                  <div key={`${city.id}-${spinCount}`} className="flex flex-col items-center w-full">
                    <RouteConnector
                      type={city.transportType || 'train'}
                      time={city.transportTime}
                      delay={baseDelay}
                      isSpinning={isSpinning}
                    />
                    <RouletteCard
                      city={city}
                      isLocked={isLocked}
                      onToggleLock={() => toggleCityLock(city.id)}
                      delay={baseDelay + 0.15}
                      isSpinning={isSpinning && !isLocked}
                    />
                  </div>
                );
              })}
            </div>
          </>
        ) : !isSpinning ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="text-slate-600 text-sm">
              Select a starting city above, then spin to discover routes
            </div>
          </motion.div>
        ) : null}
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <motion.button
          onClick={handleSpin}
          disabled={isSpinning}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="group px-7 py-3 bg-blue-600 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-600/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:bg-blue-500 hover:shadow-blue-500/30"
        >
          {isSpinning ? (
            <span className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 animate-spin" />
              Discovering...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Dice5 className="h-4 w-4" />
              {hasSpun ? 'Spin Again' : 'Discover Routes'}
            </span>
          )}
        </motion.button>

        <AnimatePresence>
          {hasSpun && cities.length > 0 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={handleBuildTrip}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="px-7 py-3 bg-white/[0.07] text-white font-semibold text-sm rounded-xl border border-white/10 hover:bg-white/10 transition-all"
            >
              <span className="flex items-center gap-2">
                Build This Trip
                <ArrowRight className="h-4 w-4" />
              </span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Helper text */}
      <AnimatePresence>
        {hasSpun && spinCount >= 1 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="text-center text-xs text-slate-600 mt-6"
          >
            Lock your favorites with the lock icon, then spin again for variety
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
