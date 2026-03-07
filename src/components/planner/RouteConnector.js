'use client';

import { motion } from 'framer-motion';
import { Train, Plane, Bus, Ship } from 'lucide-react';

const TRANSPORT_CONFIG = {
  train: { icon: Train, label: 'Train', color: 'text-sky-400' },
  flight: { icon: Plane, label: 'Flight', color: 'text-violet-400' },
  bus: { icon: Bus, label: 'Bus', color: 'text-emerald-400' },
  ferry: { icon: Ship, label: 'Ferry', color: 'text-cyan-400' },
  unknown: { icon: Train, label: '', color: 'text-slate-500' },
};

export default function RouteConnector({ type = 'train', time, delay = 0, isSpinning = false }) {
  const config = TRANSPORT_CONFIG[type] || TRANSPORT_CONFIG.unknown;
  const Icon = config.icon;

  return (
    <>
      {/* Desktop: horizontal connector */}
      <div className="hidden md:flex items-center mx-1 flex-shrink-0" style={{ width: 120 }}>
        <motion.div
          className="relative w-full flex flex-col items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: isSpinning ? 0.3 : 1 }}
          transition={{ duration: 0.3, delay: isSpinning ? 0 : delay }}
        >
          {/* Line */}
          <div className="w-full h-px relative">
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-white/20 via-white/30 to-white/20"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: isSpinning ? 0 : 1 }}
              transition={{
                duration: 0.4,
                delay: isSpinning ? 0 : delay,
                ease: 'easeOut',
              }}
              style={{ originX: 0 }}
            />
            {/* Dashes overlay */}
            <motion.div
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: isSpinning ? 0 : 1 }}
              transition={{ delay: isSpinning ? 0 : delay + 0.2 }}
              style={{
                backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(255,255,255,0.15) 4px, rgba(255,255,255,0.15) 8px)',
              }}
            />
          </div>

          {/* Transport icon + time */}
          <motion.div
            className="flex items-center gap-1.5 mt-2"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: isSpinning ? 0 : 1, y: isSpinning ? 6 : 0 }}
            transition={{ duration: 0.3, delay: isSpinning ? 0 : delay + 0.3 }}
          >
            <Icon className={`h-3.5 w-3.5 ${config.color}`} />
            {time && (
              <span className="text-[11px] font-medium text-slate-400 whitespace-nowrap">
                {time}
              </span>
            )}
          </motion.div>
        </motion.div>
      </div>

      {/* Mobile: vertical connector */}
      <div className="md:hidden flex flex-col items-center py-1 flex-shrink-0">
        <motion.div
          className="relative flex flex-col items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: isSpinning ? 0.3 : 1 }}
          transition={{ duration: 0.3, delay: isSpinning ? 0 : delay }}
        >
          {/* Vertical line */}
          <motion.div
            className="w-px h-8 bg-gradient-to-b from-white/20 via-white/30 to-white/20"
            initial={{ scaleY: 0 }}
            animate={{ scaleY: isSpinning ? 0 : 1 }}
            transition={{
              duration: 0.4,
              delay: isSpinning ? 0 : delay,
              ease: 'easeOut',
            }}
            style={{ originY: 0 }}
          />

          {/* Badge */}
          <motion.div
            className="flex items-center gap-1.5 my-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: isSpinning ? 0 : 1, scale: isSpinning ? 0.8 : 1 }}
            transition={{ duration: 0.3, delay: isSpinning ? 0 : delay + 0.2 }}
          >
            <Icon className={`h-3 w-3 ${config.color}`} />
            {time && (
              <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap">
                {time}
              </span>
            )}
          </motion.div>

          {/* Vertical line */}
          <motion.div
            className="w-px h-8 bg-gradient-to-b from-white/20 via-white/30 to-white/20"
            initial={{ scaleY: 0 }}
            animate={{ scaleY: isSpinning ? 0 : 1 }}
            transition={{
              duration: 0.4,
              delay: isSpinning ? 0 : delay + 0.1,
              ease: 'easeOut',
            }}
            style={{ originY: 0 }}
          />
        </motion.div>
      </div>
    </>
  );
}
