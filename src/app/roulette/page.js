'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import TripRoulette from '@/components/planner/TripRoulette';
import AnchorSelector from '@/components/planner/AnchorSelector';

export default function RoulettePage() {
  const router = useRouter();
  const [anchorCity, setAnchorCity] = useState('barcelona');

  function handleBuildTrip(cities) {
    const params = new URLSearchParams();
    params.set('cities', cities.join(','));
    router.push(`/plan?mode=wizard&${params.toString()}`);
  }

  return (
    <div
      className="min-h-screen"
      style={{
        background: 'radial-gradient(160% 200% at 0% 0%, #0b1120 0%, #020617 45%, #020617 100%)',
        color: '#e5e7eb',
      }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-24 pb-16">
        {/* Header */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-400/80 mb-4">
              Route Discovery
            </span>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-white mb-3 leading-tight">
              Trip Roulette
            </h1>
            <p className="text-slate-400 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
              Pick your starting city, spin to discover the best connected
              destinations, and build your multi-city route.
            </p>
          </motion.div>
        </div>

        {/* Anchor selector */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="mb-12"
        >
          <AnchorSelector value={anchorCity} onChange={setAnchorCity} />
        </motion.div>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-10">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-600">
            Your Route
          </span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        {/* Route timeline */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <TripRoulette anchorCity={anchorCity} onBuildTrip={handleBuildTrip} />
        </motion.div>
      </div>
    </div>
  );
}
