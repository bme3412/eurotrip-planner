'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import CityChainBuilder from '@/components/planner/CityChainBuilder';

export default function SpinnerPage() {
  const router = useRouter();

  function handleBuildTrip(cities) {
    // Navigate to the multi-city planner with the selected cities
    const params = new URLSearchParams();
    params.set('cities', cities.join(','));
    router.push(`/planner?${params.toString()}`);
  }

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #f0f4ff 0%, #e8f0fe 50%, #f5f0ff 100%)',
      }}
    >
      {/* Decorative background blobs */}
      <div className="absolute top-20 -left-20 w-80 h-80 bg-blue-200/40 rounded-full blur-3xl animate-pulse pointer-events-none" />
      <div
        className="absolute top-40 -right-20 w-96 h-96 bg-purple-200/40 rounded-full blur-3xl animate-pulse pointer-events-none"
        style={{ animationDelay: '1s' }}
      />
      <div
        className="absolute bottom-20 left-1/4 w-72 h-72 bg-indigo-200/30 rounded-full blur-3xl animate-pulse pointer-events-none"
        style={{ animationDelay: '2s' }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-20">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-900 mb-3 tracking-tight">
            Build Your{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Route
            </span>
          </h1>
          <p className="text-slate-500 text-base md:text-lg max-w-lg mx-auto">
            Pick your starting city. Add stops one by one. See your route come to life.
          </p>

          {/* Trust indicators */}
          <div className="flex flex-wrap justify-center gap-4 md:gap-6 mt-5">
            <span className="inline-flex items-center gap-1.5 text-xs md:text-sm text-slate-400">
              <span className="text-emerald-500">✓</span> 220+ cities
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs md:text-sm text-slate-400">
              <span className="text-emerald-500">✓</span> Real transport times
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs md:text-sm text-slate-400">
              <span className="text-emerald-500">✓</span> Smart routing
            </span>
          </div>
        </motion.div>

        {/* Chain Builder Component */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <CityChainBuilder onBuildTrip={handleBuildTrip} />
        </motion.div>

        {/* Footer tip */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="text-center text-xs text-slate-400 mt-8"
        >
          Tip: Click &ldquo;Edit&rdquo; on any stop to change your route. Up to 8 stops allowed.
        </motion.p>
      </div>
    </div>
  );
}
