'use client';

import { useMemo, useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, Info, Route, Zap, ArrowRight, MapPin } from 'lucide-react';
import { getValidationSummary, compareRoutes } from '@/lib/planning/routeValidator';

/**
 * RouteValidationPanel - Shows route efficiency and optimization suggestions
 *
 * Props:
 * - stops: Array<{ city, cityName }> - Selected stop cities
 * - startCity: { id, name } - Start anchor
 * - endCity: { id, name } - End anchor
 * - compact: boolean - Compact mode for inline display
 * - onOptimize: (optimizedStops) => void - Callback when user applies optimization
 */
export default function RouteValidationPanel({
  stops = [],
  startCity,
  endCity,
  compact = false,
  onOptimize,
}) {
  // Track whether the user has dismissed the optimization suggestion for the
  // current route. Reset whenever the underlying stops change so a freshly
  // suboptimal route surfaces a new suggestion.
  const [dismissed, setDismissed] = useState(false);
  const stopsKey = stops.map((s) => s.city || s.id).join('|');
  useEffect(() => {
    setDismissed(false);
  }, [stopsKey, startCity?.id, endCity?.id]);

  // Run validation and comparison
  const analysis = useMemo(() => {
    if (!startCity || !endCity || stops.length === 0) {
      return null;
    }
    return compareRoutes(stops, startCity, endCity);
  }, [stops, startCity, endCity]);

  // Don't show if no stops selected
  if (!analysis || stops.length === 0) {
    return null;
  }

  const { current, optimized, shouldOptimize } = analysis;
  const showOptimization = shouldOptimize && !dismissed;
  const summary = getValidationSummary({ efficiencyScore: current.efficiency });

  // Get styling based on efficiency
  const getStatusStyles = (efficiency) => {
    if (efficiency >= 70) {
      return {
        icon: CheckCircle,
        color: 'text-[#4a7c59]',
        bg: 'bg-[#f0f7f4]',
        border: 'border-[#4a7c59]/30',
        barColor: 'bg-[#4a7c59]',
      };
    }
    return {
      icon: AlertTriangle,
      color: 'text-[#a08545]',
      bg: 'bg-[#fef7e6]',
      border: 'border-[#a08545]/30',
      barColor: 'bg-[#a08545]',
    };
  };

  const styles = getStatusStyles(current.efficiency);
  const StatusIcon = styles.icon;

  // Handle optimize click
  const handleOptimize = () => {
    if (onOptimize && optimized.stops) {
      onOptimize(optimized.stops);
    }
  };

  if (compact) {
    // Compact inline version
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${styles.bg} ${styles.border} border`}>
        <StatusIcon className={`w-4 h-4 ${styles.color}`} />
        <span className="text-xs font-medium text-[#2a2520]">
          {summary.label}
        </span>
        <span className="text-xs text-[#6a6459]">
          ({current.efficiency}%)
        </span>
        {showOptimization && (
          <button
            onClick={handleOptimize}
            className="ml-2 text-xs text-[#6366f1] hover:text-[#4f46e5] font-medium"
          >
            Optimize
          </button>
        )}
      </div>
    );
  }

  // Full version
  return (
    <div className={`rounded-xl ${styles.bg} border ${styles.border} p-4`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <StatusIcon className={`w-5 h-5 ${styles.color}`} />
          <span className="text-sm font-medium text-[#2a2520]">
            {summary.label}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Route className="w-4 h-4 text-[#8a8578]" />
            <span className="text-sm font-medium text-[#6a6459]">
              {current.distance.toLocaleString()} km
            </span>
          </div>
          <div className="px-2 py-0.5 rounded-full bg-white/70">
            <span className="text-sm font-semibold text-[#2a2520]">
              {current.efficiency}%
            </span>
          </div>
        </div>
      </div>

      {/* Efficiency bar */}
      <div className="h-2 bg-white/50 rounded-full overflow-hidden mb-4">
        <div
          className={`h-full transition-all duration-500 rounded-full ${styles.barColor}`}
          style={{ width: `${current.efficiency}%` }}
        />
      </div>

      {/* Warnings */}
      {current.warnings.length > 0 && (
        <div className="space-y-2 mb-4">
          {current.warnings.map((warning, i) => (
            <div
              key={i}
              className="flex items-start gap-2 text-xs"
            >
              {warning.severity === 'warning' ? (
                <AlertTriangle className="w-3.5 h-3.5 text-[#a08545] flex-shrink-0 mt-0.5" />
              ) : (
                <Info className="w-3.5 h-3.5 text-[#6a6459] flex-shrink-0 mt-0.5" />
              )}
              <div>
                <span className="text-[#2a2520]">{warning.message}</span>
                {warning.cities && (
                  <span className="block text-[#8a8578] mt-0.5">
                    {warning.cities.join(' → ')}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Optimization suggestion */}
      {showOptimization && optimized.savings > 0 && (
        <div className="bg-white/80 rounded-lg p-3 mb-3 border border-[#6366f1]/20">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-[#6366f1]" />
            <span className="text-sm font-medium text-[#2a2520]">
              Optimized Route Available
            </span>
          </div>

          {/* Suggested order */}
          <div className="flex flex-wrap items-center gap-1 mb-3">
            <div className="flex items-center gap-1 px-2 py-1 rounded bg-[#faf6eb] text-xs">
              <MapPin className="w-3 h-3 text-[#a08545]" />
              <span className="text-[#2a2520]">{startCity.name}</span>
            </div>
            {optimized.stops.map((stop, i) => (
              <div key={i} className="flex items-center">
                <ArrowRight className="w-3 h-3 text-[#8a8578] mx-0.5" />
                <div className="flex items-center gap-1 px-2 py-1 rounded bg-[#eef2ff] text-xs">
                  <MapPin className="w-3 h-3 text-[#6366f1]" />
                  <span className="text-[#2a2520]">{stop.cityName || stop.city?.name || 'City'}</span>
                </div>
              </div>
            ))}
            <ArrowRight className="w-3 h-3 text-[#8a8578] mx-0.5" />
            <div className="flex items-center gap-1 px-2 py-1 rounded bg-[#faf6eb] text-xs">
              <MapPin className="w-3 h-3 text-[#a08545]" />
              <span className="text-[#2a2520]">{endCity.name}</span>
            </div>
          </div>

          {/* Savings info */}
          <div className="flex items-center justify-between text-xs mb-3">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-[#8a8578]">Distance: </span>
                <span className="text-[#4a7c59] font-medium">
                  {optimized.distance.toLocaleString()} km
                </span>
              </div>
              <div>
                <span className="text-[#8a8578]">Saves: </span>
                <span className="text-[#4a7c59] font-medium">
                  {optimized.savings.toLocaleString()} km
                </span>
              </div>
              <div>
                <span className="text-[#8a8578]">New efficiency: </span>
                <span className="text-[#4a7c59] font-medium">
                  {optimized.efficiency}%
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleOptimize}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#6366f1] hover:bg-[#4f46e5] text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Zap className="w-4 h-4" />
              Apply Optimized Route
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="px-4 py-2 bg-white hover:bg-gray-50 text-[#6a6459] text-sm font-medium rounded-lg border border-[#e5e0d8] transition-colors"
            >
              Keep Current
            </button>
          </div>
        </div>
      )}

      {/* Good route message */}
      {!shouldOptimize && current.efficiency >= 70 && (
        <div className="flex items-center gap-2 text-xs text-[#4a7c59]">
          <CheckCircle className="w-4 h-4" />
          <span>Your route is efficient! No optimization needed.</span>
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-[10px] text-[#8a8578] italic mt-3">
        These are suggestions only – you can proceed with any route.
      </p>
    </div>
  );
}
