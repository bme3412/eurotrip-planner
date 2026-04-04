'use client';

import { motion } from 'framer-motion';
import AnchoredWizard from '@/components/trip-planner/AnchoredWizard';

export default function TripPlannerPage() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-[#faf8f5]">
      {/* Atmospheric background */}
      <div className="absolute inset-0">
        {/* Warm gradient base */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 100% 70% at 50% -10%, #f5f0e8 0%, #faf8f5 50%)',
          }}
        />
        {/* Subtle grain texture */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />
        {/* Accent glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] opacity-30"
          style={{
            background: 'radial-gradient(ellipse at center, #e8d5a3 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-10">
        {/* Header */}
        <header className="text-center mb-6">
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="text-2xl sm:text-3xl font-light text-[#2a2520] leading-tight tracking-tight"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            Plan Your <span className="italic">European Adventure</span>
          </motion.h1>
        </header>

        {/* Wizard */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <AnchoredWizard />
        </motion.div>
      </div>
    </div>
  );
}
