'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Train, Plane, Bus, Ship, MapPin, Clock, Star, Sun, Users, Ticket, ArrowRight } from 'lucide-react';

const TRANSPORT_ICONS = {
  train: Train,
  flight: Plane,
  bus: Bus,
  ferry: Ship,
};

/**
 * CityDetailModal - Full-screen modal showing city details
 *
 * Features:
 * - Hero image with gradient overlay
 * - "Why visit now" contextual description
 * - Weather/crowds/events badges
 * - Transport details
 * - Highlights
 * - Add to trip action
 */
export default function CityDetailModal({
  city,
  isOpen,
  onClose,
  onSelect,
  gapStart,
  gapEnd,
}) {
  const [imgError, setImgError] = useState(false);

  if (!city) return null;

  const TransportIcon = TRANSPORT_ICONS[city.transportType?.toLowerCase()] || Train;

  // Format month for display
  const month = gapStart
    ? new Date(gapStart + 'T12:00:00').toLocaleString('en', { month: 'long' })
    : null;

  // Calculate travel dates for the button
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const startDateFormatted = formatDate(gapStart);
  const endDate = gapStart && city.recommendedDays
    ? new Date(new Date(gapStart + 'T12:00:00').getTime() + (city.recommendedDays - 1) * 24 * 60 * 60 * 1000)
    : null;
  const endDateFormatted = endDate
    ? endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '';

  const handleSelect = () => {
    onSelect?.(city);
    onClose?.();
  };

  // Determine image source with fallback
  const imageSrc = imgError
    ? '/images/city-placeholder.svg'
    : city.thumbnail || `/images/city-thumbnail/${city.country?.replace(/\s+/g, '-')}/${city.id}-thumbnail.jpeg`;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop + Centering wrapper */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          >
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden"
            >
            {/* Hero Image - shorter */}
            <div className="relative h-40 flex-shrink-0">
              <Image
                src={imageSrc}
                alt={city.name}
                fill
                className="object-cover"
                onError={() => setImgError(true)}
                priority
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>

              {/* Score badge */}
              {city.score >= 70 && (
                <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 bg-[#c9a227] rounded-full">
                  <Star className="w-3.5 h-3.5 text-white" fill="white" />
                  <span className="text-sm font-medium text-white">{city.score}</span>
                </div>
              )}

              {/* City name overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h2
                  className="text-2xl font-light text-white tracking-tight"
                  style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                >
                  {city.name}
                </h2>
                <p className="text-white/80 text-sm">
                  {city.country} &bull; {city.recommendedDays} days recommended
                </p>
              </div>
            </div>

            {/* Content - compact layout */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* Why visit now */}
              {city.visitDescription && (
                <div>
                  <h3 className="text-[10px] font-medium uppercase tracking-wider text-[#8a8578] mb-1">
                    Why visit{month ? ` in ${month}` : ''}
                  </h3>
                  <p className="text-sm text-[#5a5549] leading-snug">
                    {city.visitDescription}
                  </p>
                </div>
              )}

              {/* Date score badges - inline */}
              {city.dateScore && (
                <div className="flex flex-wrap gap-1.5">
                  {city.dateScore.weather && (
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs ${
                      city.dateScore.weather.color === 'green' ? 'bg-[#f0f7f4] text-[#4a7c59]' :
                      city.dateScore.weather.color === 'amber' ? 'bg-[#fef7e6] text-[#a08545]' :
                      'bg-[#fef2f2] text-[#991b1b]'
                    }`}>
                      <Sun className="w-3 h-3" />
                      <span className="font-medium">{city.dateScore.weather.label}</span>
                    </div>
                  )}
                  {city.dateScore.crowds && (
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs ${
                      city.dateScore.crowds.color === 'green' ? 'bg-[#f0f7f4] text-[#4a7c59]' :
                      city.dateScore.crowds.color === 'amber' ? 'bg-[#fef7e6] text-[#a08545]' :
                      'bg-[#fef2f2] text-[#991b1b]'
                    }`}>
                      <Users className="w-3 h-3" />
                      <span className="font-medium">{city.dateScore.crowds.label}</span>
                    </div>
                  )}
                  {city.dateScore.events && (
                    <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-[#f0f0ff] text-[#5b5b9d]">
                      <Ticket className="w-3 h-3" />
                      <span className="font-medium">{city.dateScore.events.name?.slice(0, 20) || 'Event'}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Getting there + End connection - compact row */}
              <div className="flex items-center justify-between py-2 px-3 bg-[#faf8f5] rounded-lg">
                <div className="flex items-center gap-2">
                  <TransportIcon className="w-4 h-4 text-[#a08545]" />
                  <span className="text-sm font-medium text-[#2a2520]">{city.transportTime}</span>
                  {city.transportDetails?.type && (
                    <span className="text-xs text-[#8a8578]">by {city.transportDetails.type}</span>
                  )}
                </div>
                {city.endCityConnection && (
                  <div className="flex items-center gap-1 text-xs text-[#8a8578]">
                    <ArrowRight className="w-3 h-3" />
                    <span>{Math.round(city.endCityConnection.travelMinutes / 60)}h to end</span>
                  </div>
                )}
              </div>

              {/* Highlights - compact */}
              {city.highlights && city.highlights.length > 0 && (
                <div>
                  <h3 className="text-[10px] font-medium uppercase tracking-wider text-[#8a8578] mb-1">
                    What to See
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {city.highlights.slice(0, 4).map((highlight, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#faf8f5] rounded text-xs text-[#5a5549]">
                        <MapPin className="w-2.5 h-2.5 text-[#a08545]" />
                        {highlight}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Match reasons as tags */}
              {city.matchReasons && city.matchReasons.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {city.matchReasons.map((reason, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-white border border-[#e5e0d8] rounded-full text-[10px] text-[#6a6459]"
                    >
                      {reason}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Footer with action - compact */}
            <div className="flex-shrink-0 px-4 py-3 border-t border-[#e5e0d8] bg-[#faf8f5]">
              <button
                onClick={handleSelect}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#c9a227] hover:bg-[#d4af37] text-white font-medium rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add to Trip</span>
                <span className="text-white/80 font-normal">·</span>
                <span className="text-sm text-white/90 font-normal">
                  {city.recommendedDays}d {startDateFormatted && endDateFormatted ? `(${startDateFormatted} – ${endDateFormatted})` : ''}
                </span>
              </button>
            </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
