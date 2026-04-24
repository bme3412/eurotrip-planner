'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Train,
  Plane,
  Bus,
  Car,
  Ship,
  Clock,
  MapPin,
  Calendar,
  RotateCcw,
  Save,
  AlertCircle,
} from 'lucide-react';
import { getCountryFlag } from '@/utils/countryFlags';

// ── Transport icon helper ────────────────────────────────────────────
function TransportIcon({ type, className = 'w-4 h-4' }) {
  switch (type?.toLowerCase()) {
    case 'train':
    case 'rail':
      return <Train className={className} />;
    case 'flight':
    case 'plane':
      return <Plane className={className} />;
    case 'bus':
      return <Bus className={className} />;
    case 'ferry':
      return <Ship className={className} />;
    default:
      return <Car className={className} />;
  }
}

// ── Loading Skeleton ─────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full bg-blue-100" />
        <div className="space-y-2 flex-1">
          <div className="h-5 bg-gray-200 rounded w-48" />
          <div className="h-3 bg-gray-100 rounded w-32" />
        </div>
      </div>
      {[1, 2, 3].map(i => (
        <div key={i} className="rounded-2xl border border-gray-100 p-4 space-y-3">
          <div className="h-5 bg-gray-200 rounded w-36" />
          <div className="space-y-2 pl-4">
            <div className="h-4 bg-gray-100 rounded w-56" />
            <div className="h-4 bg-gray-100 rounded w-48" />
            <div className="h-4 bg-gray-100 rounded w-44" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Error Banner ─────────────────────────────────────────────────────
function ErrorBanner({ error, onRetry }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center">
      <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
      <p className="text-red-700 font-medium mb-1">Generation failed</p>
      <p className="text-red-600 text-sm mb-4">{error}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-5 py-2 bg-red-600 text-white text-sm font-semibold rounded-full hover:bg-red-700 transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  );
}

// ── Activity Item ────────────────────────────────────────────────────
function ActivityItem({ activity }) {
  const timeLabel =
    activity.timeBlock || activity.time_block || activity.time || '';

  return (
    <div className="flex gap-3 py-2">
      <div className="w-16 shrink-0 text-xs font-medium text-gray-400 uppercase pt-0.5">
        {timeLabel}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 leading-snug">
          {activity.name}
        </p>
        {activity.description && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
            {activity.description}
          </p>
        )}
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
          {activity.duration_minutes || activity.durationMinutes ? (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {activity.duration_minutes || activity.durationMinutes}m
            </span>
          ) : null}
          {(activity.neighborhood || activity.address) && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {activity.neighborhood || activity.address}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Transfer Card ────────────────────────────────────────────────────
function TransferCard({ transfer }) {
  const transportType =
    transfer.transport?.type || transfer.transportType || 'train';
  const duration =
    transfer.transport?.journeyTime || transfer.duration || transfer.travelTime || '';
  const fromName = transfer.from?.name || transfer.fromCity || '';
  const toName = transfer.to?.name || transfer.toCity || '';

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-blue-50/50 border border-blue-100 rounded-xl mx-2">
      <TransportIcon type={transportType} className="w-4 h-4 text-blue-500 shrink-0" />
      <div className="flex-1 text-xs text-blue-700">
        <span className="font-medium">{fromName}</span>
        {' → '}
        <span className="font-medium">{toName}</span>
      </div>
      {duration && (
        <span className="text-xs font-medium text-blue-500 shrink-0">
          {duration}
        </span>
      )}
    </div>
  );
}

// ── Day Card ─────────────────────────────────────────────────────────
function DayCard({ day, dayIndex }) {
  const [isOpen, setIsOpen] = useState(dayIndex < 3); // first 3 days open

  const activities = day.timeBlocks || day.activities || day.items || [];
  const allActivities =
    Array.isArray(activities) && activities.length > 0
      ? activities.flatMap(block =>
          block.activities
            ? block.activities.map(a => ({
                ...a,
                timeBlock: block.label || block.time,
              }))
            : [block]
        )
      : [];

  const cityName = day.cityName || day.city || '';
  const dayNum = day.dayNumber || dayIndex + 1;
  const theme = day.theme || '';
  const isTravelDay = day.isTravelDay || false;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
            {dayNum}
          </span>
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-900">
              {isTravelDay ? 'Travel Day' : `Day ${dayNum}`}
              {cityName && (
                <span className="text-gray-500 font-normal"> — {cityName}</span>
              )}
            </p>
            {theme && (
              <p className="text-xs text-gray-400">{theme}</p>
            )}
          </div>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && allActivities.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 divide-y divide-gray-50">
              {allActivities.map((activity, i) => (
                <ActivityItem key={i} activity={activity} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────
export default function InlineItinerary({
  itinerary,
  isLoading,
  error,
  trip,
  onRetry,
  onStartOver,
  onSaveTrip,
}) {
  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto py-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-gray-600">
            Building your day-by-day itinerary...
          </p>
        </div>
        <LoadingSkeleton />
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto py-6"
      >
        <ErrorBanner error={error} onRetry={onRetry} />
      </motion.div>
    );
  }

  if (!itinerary) return null;

  const days = itinerary.days || [];
  const transfers = itinerary.transfers || [];
  const cities = itinerary.cities || [];
  const meta = itinerary.meta || {};

  // Build route label
  const routeCities = cities.map(c => c.name || c.city).filter(Boolean);
  const routeLabel = routeCities.join(' → ');

  // Date formatting
  const formatDate = (d) => {
    if (!d) return '';
    return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const dateRange =
    meta.startDate && meta.endDate
      ? `${formatDate(meta.startDate)} – ${formatDate(meta.endDate)}`
      : trip?.dates?.start && trip?.dates?.end
        ? `${formatDate(trip.dates.start)} – ${formatDate(trip.dates.end)}`
        : '';

  const totalDays = meta.totalDays || days.length;

  // Interleave days with transfers
  const timeline = [];
  let transferIdx = 0;

  for (let i = 0; i < days.length; i++) {
    const day = days[i];
    timeline.push({ type: 'day', data: day, index: i });

    // Insert transfer if the next day is in a different city
    if (i < days.length - 1) {
      const nextDay = days[i + 1];
      const currentCity = day.city;
      const nextCity = nextDay.city;

      if (currentCity && nextCity && currentCity !== nextCity) {
        const transfer = transfers[transferIdx];
        if (transfer) {
          timeline.push({ type: 'transfer', data: transfer, index: transferIdx });
          transferIdx++;
        }
      }
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-2xl mx-auto py-6"
    >
      {/* Header */}
      <div className="text-center mb-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.1 }}
          className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3"
        >
          <Check className="w-6 h-6 text-green-600" />
        </motion.div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">
          Your Itinerary is Ready
        </h3>
        {routeLabel && (
          <p className="text-sm text-gray-600 mb-1">{routeLabel}</p>
        )}
        <div className="flex items-center justify-center gap-3 text-xs text-gray-400">
          {dateRange && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {dateRange}
            </span>
          )}
          {totalDays > 0 && <span>{totalDays} days</span>}
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-3 mb-8">
        {timeline.map((item, i) =>
          item.type === 'day' ? (
            <DayCard key={`day-${i}`} day={item.data} dayIndex={item.index} />
          ) : (
            <TransferCard key={`transfer-${i}`} transfer={item.data} />
          )
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-center gap-3">
        {onStartOver && (
          <button
            onClick={onStartOver}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Start Over
          </button>
        )}
        {onSaveTrip && (
          <button
            onClick={onSaveTrip}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-full hover:bg-blue-700 transition-colors"
          >
            <Save className="w-4 h-4" />
            Save Trip
          </button>
        )}
      </div>
    </motion.div>
  );
}
