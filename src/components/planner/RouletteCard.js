'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Unlock, Star, ChevronDown, ChevronUp, Train, Plane, Bus, Ship, Clock, MapPin } from 'lucide-react';

const TRANSPORT_ICONS = {
  train: Train,
  flight: Plane,
  bus: Bus,
  ferry: Ship,
};

function EaseBadge({ score }) {
  const stars = score >= 8 ? 3 : score >= 6 ? 2 : 1;
  const label = score >= 8 ? 'Easy' : score >= 6 ? 'Moderate' : 'Adventurous';
  const colors = score >= 8
    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    : score >= 6
      ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
      : 'text-orange-400 bg-orange-500/10 border-orange-500/20';

  return (
    <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-semibold tracking-wide ${colors}`}>
      {[...Array(stars)].map((_, i) => (
        <Star key={i} className="h-2.5 w-2.5 fill-current" />
      ))}
      <span className="ml-0.5">{label}</span>
    </div>
  );
}

function TransportRow({ type, data, label }) {
  if (!data) return null;
  const Icon = TRANSPORT_ICONS[type] || Train;
  const time = data.journeyTime || data.approxFlightTime;
  if (!time || time === 'N/A') return null;

  return (
    <div className="flex items-center gap-2 text-xs text-slate-400">
      <Icon className="h-3 w-3 text-slate-500 flex-shrink-0" />
      <span className="font-medium text-slate-300">{time}</span>
      {data.frequency && data.frequency !== 'N/A' && (
        <span className="text-slate-500">· {data.frequency}</span>
      )}
    </div>
  );
}

export default function RouletteCard({
  city,
  isAnchor = false,
  isLocked = false,
  onToggleLock,
  delay = 0,
  isSpinning = false,
}) {
  const [expanded, setExpanded] = useState(false);

  if (!city) return null;

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.85, y: 12 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: 'spring',
        damping: 20,
        stiffness: 200,
        delay,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.9,
      y: -8,
      transition: { duration: 0.2 },
    },
    spinning: {
      opacity: 0.15,
      scale: 0.92,
      filter: 'blur(6px)',
      transition: { duration: 0.25 },
    },
  };

  const borderColor = isAnchor
    ? 'border-blue-500/30 ring-1 ring-blue-500/10'
    : isLocked
      ? 'border-amber-500/40 ring-1 ring-amber-500/10'
      : 'border-white/[0.08] hover:border-white/15';

  return (
    <motion.div
      layout
      variants={cardVariants}
      initial="hidden"
      animate={isSpinning ? 'spinning' : 'visible'}
      exit="exit"
      className={`relative rounded-2xl border backdrop-blur-sm bg-slate-900/70 transition-colors ${borderColor} ${
        isAnchor ? 'md:w-52 w-full' : 'md:w-56 w-full'
      }`}
    >
      {/* Lock button (not on anchor) */}
      {!isAnchor && onToggleLock && (
        <button
          onClick={onToggleLock}
          className={`absolute top-3 right-3 z-10 p-1.5 rounded-lg transition-all ${
            isLocked
              ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
              : 'bg-white/5 text-slate-500 hover:bg-white/10 hover:text-slate-300'
          }`}
          title={isLocked ? 'Unlock city' : 'Lock city'}
        >
          {isLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
        </button>
      )}

      <div className="p-5">
        {/* Anchor badge */}
        {isAnchor && (
          <div className="flex items-center gap-1.5 mb-2">
            <MapPin className="h-3 w-3 text-blue-400" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-blue-400">
              Start
            </span>
          </div>
        )}

        {/* City name */}
        <h3 className="font-display text-xl font-bold text-white leading-tight mb-0.5">
          {city.name}
        </h3>
        <p className="text-xs text-slate-500 font-medium mb-3">{city.country}</p>

        {/* Ease badge */}
        {!isAnchor && city.easeScore != null && (
          <div className="mb-3">
            <EaseBadge score={city.easeScore} />
          </div>
        )}

        {/* Primary transport (compact) */}
        {!isAnchor && city.transportTime && (
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
              {(() => {
                const Icon = TRANSPORT_ICONS[city.transportType] || Train;
                return <Icon className="h-3.5 w-3.5 text-slate-400" />;
              })()}
              <Clock className="h-3 w-3 text-slate-500" />
              <span className="text-xs font-semibold text-slate-300">{city.transportTime}</span>
            </div>
          </div>
        )}

        {/* Why go */}
        {city.whyGo && (
          <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-2">
            {city.whyGo}
          </p>
        )}

        {/* Expand toggle for details */}
        {!isAnchor && city.allTransport && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-300 transition-colors mt-1"
          >
            {expanded ? 'Less' : 'All routes'}
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        )}

        {/* Expanded transport details */}
        <AnimatePresence>
          {expanded && !isAnchor && city.allTransport && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-3 mt-2 border-t border-white/[0.06] space-y-2">
                <TransportRow type="train" data={city.allTransport.train} label="Train" />
                <TransportRow type="flight" data={city.allTransport.flight} label="Flight" />
                <TransportRow type="bus" data={city.allTransport.bus} label="Bus" />
                <TransportRow type="ferry" data={city.allTransport.ferry} label="Ferry" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Locked shimmer */}
      {isLocked && !isSpinning && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(245,158,11,0.04) 0%, transparent 50%, rgba(245,158,11,0.04) 100%)',
          }}
        />
      )}
    </motion.div>
  );
}
