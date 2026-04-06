'use client';

import { motion } from 'framer-motion';
import { MapPin, HelpCircle, X } from 'lucide-react';

function formatShortDate(iso) {
  if (!iso) return '';
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function getDayCount(start, end) {
  if (!start || !end) return 0;
  const s = new Date(start + 'T12:00:00');
  const e = new Date(end + 'T12:00:00');
  return Math.round((e - s) / (1000 * 60 * 60 * 24));
}

export default function TripTimeline({ tripDates, items, onClearGap }) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <div className="p-4 rounded-xl bg-white border border-[#e5e0d8] shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3
          className="text-sm font-light text-[#6a6459]"
          style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
        >
          Your Journey
        </h3>
        <span className="text-xs text-[#8a8578]">
          {formatShortDate(tripDates.start)} – {formatShortDate(tripDates.end)}
        </span>
      </div>

      {/* Timeline */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-hide">
        {items.map((item, index) => (
          <div key={item.id || `item-${index}`} className="flex items-center">
            {/* Connector (not for first item) */}
            {index > 0 && (
              <div className="w-4 h-px bg-[#d5d0c8] mx-0.5" />
            )}

            {/* Item card */}
            {item.type === 'anchor' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="flex-shrink-0"
              >
                <div className="px-2.5 py-1.5 rounded-md bg-[#faf6eb] border border-[#c9a227]/40">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-[#a08545]" />
                    <span className="text-xs font-medium text-[#2a2520]">
                      {item.cityName}
                    </span>
                    <span className="text-[10px] text-[#6a6459]">
                      {getDayCount(item.startDate, item.endDate)}d
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            {item.type === 'gap' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="flex-shrink-0"
              >
                <div className="px-2.5 py-1.5 rounded-md border border-dashed border-[#d5d0c8] bg-[#faf8f5]">
                  <div className="flex items-center gap-1">
                    <HelpCircle className="w-3 h-3 text-[#8a8578]" />
                    <span className="text-[10px] text-[#8a8578]">{item.days}d open</span>
                  </div>
                </div>
              </motion.div>
            )}

            {item.type === 'gap-filled' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="relative group flex-shrink-0"
              >
                <div className="px-2.5 py-1.5 rounded-md bg-[#f0f7f4] border border-[#4a7c59]/30">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-[#4a7c59]" />
                    <span className="text-xs font-medium text-[#2a2520]">
                      {item.cityName}
                    </span>
                    <span className="text-[10px] text-[#4a7c59]">
                      {item.days || getDayCount(item.startDate, item.endDate)}d
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => onClearGap?.(item.city)}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white border border-[#e5e0d8] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#fef2f2] hover:border-[#d4a5a5]"
                >
                  <X className="w-2.5 h-2.5 text-[#6a6459]" />
                </button>
              </motion.div>
            )}

            {item.type === 'intermediate' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="relative group flex-shrink-0"
              >
                <div className="px-2.5 py-1.5 rounded-md bg-[#eef2ff] border border-[#6366f1]/30">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-[#6366f1]" />
                    <span className="text-xs font-medium text-[#2a2520]">
                      {item.cityName}
                    </span>
                    <span className="text-[10px] text-[#6366f1]">
                      {item.days || getDayCount(item.startDate, item.endDate)}d
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
