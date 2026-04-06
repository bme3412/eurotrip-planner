'use client';

import { useConversation } from '@/hooks/useConversation';
import { motion } from 'framer-motion';
import { ArrowDown, Check, Pencil, Train, Plane } from 'lucide-react';
import { getCountryFlag } from '@/utils/countryFlags';

/**
 * RouteSummary - Visual route summary that can be embedded in messages
 */
export default function RouteSummary({
  showDays = true,
  showDates = true,
  confirmable = false,
  onConfirm,
  onEdit,
}) {
  // Get trip state from context (we'll use this in the actual implementation)
  // For now, we'll receive it as a prop or from context

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200 overflow-hidden">
      {/* This will be populated from the trip context */}
      <div className="p-4">
        <p className="text-sm text-slate-600 text-center">
          Route summary will appear here once your trip is planned.
        </p>
      </div>

      {/* Action buttons */}
      {confirmable && (
        <div className="flex border-t border-slate-200">
          <button
            onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-slate-600 hover:bg-slate-100 transition-colors border-r border-slate-200"
          >
            <Pencil className="w-4 h-4" />
            <span className="text-sm font-medium">Make changes</span>
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-green-600 hover:bg-green-50 transition-colors"
          >
            <Check className="w-4 h-4" />
            <span className="text-sm font-medium">Looks good!</span>
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * RouteSummaryWithData - Version that receives trip data directly
 */
export function RouteSummaryWithData({
  trip,
  showDays = true,
  showDates = true,
  confirmable = false,
  onConfirm,
  onEdit,
}) {
  const { startCity, endCity, stops, totalDays, daysPerCity, dates } = trip;

  // Build ordered city list with travel info
  const route = [];
  if (startCity) {
    route.push({
      ...startCity,
      type: 'start',
      days: daysPerCity?.[startCity.id],
    });
  }
  stops?.forEach(stop => {
    route.push({
      ...stop,
      type: 'stop',
      days: daysPerCity?.[stop.id],
    });
  });
  if (endCity) {
    route.push({
      ...endCity,
      type: 'end',
      days: daysPerCity?.[endCity.id],
    });
  }

  if (route.length === 0) {
    return (
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-center">
        <p className="text-sm text-slate-500">No route to display yet</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200 overflow-hidden">
      {/* Route visualization */}
      <div className="p-4 space-y-1">
        {route.map((city, index) => (
          <motion.div
            key={city.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            {/* City row */}
            <div className="flex items-center gap-3 py-2">
              {/* Icon/indicator */}
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium
                ${city.type === 'start'
                  ? 'bg-green-500'
                  : city.type === 'end'
                    ? 'bg-red-500'
                    : 'bg-blue-500'
                }
              `}>
                {index + 1}
              </div>

              {/* City info */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getCountryFlag(city.country)}</span>
                  <span className="font-medium text-slate-800">{city.name}</span>
                </div>
              </div>

              {/* Days */}
              {showDays && city.days && (
                <div className="text-right">
                  <span className="text-sm font-medium text-slate-700">
                    {city.days} {city.days === 1 ? 'day' : 'days'}
                  </span>
                </div>
              )}
            </div>

            {/* Connector arrow (except after last city) */}
            {index < route.length - 1 && (
              <div className="flex items-center gap-3 py-1 ml-4">
                <div className="w-0.5 h-4 bg-slate-300 ml-3.5" />
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <ArrowDown className="w-3 h-3" />
                  {/* Travel time would go here */}
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Summary footer */}
      {(totalDays || dates) && (
        <div className="px-4 py-3 bg-white/50 border-t border-slate-200">
          <div className="flex items-center justify-between text-sm">
            {totalDays && (
              <span className="text-slate-600">
                <strong>{totalDays}</strong> days total
              </span>
            )}
            {showDates && dates?.start && dates?.end && (
              <span className="text-slate-600">
                {dates.start} → {dates.end}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Action buttons */}
      {confirmable && (
        <div className="flex border-t border-slate-200">
          <button
            onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-slate-600 hover:bg-slate-100 transition-colors border-r border-slate-200"
          >
            <Pencil className="w-4 h-4" />
            <span className="text-sm font-medium">Make changes</span>
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-green-600 hover:bg-green-50 transition-colors"
          >
            <Check className="w-4 h-4" />
            <span className="text-sm font-medium">Looks good!</span>
          </button>
        </div>
      )}
    </div>
  );
}
