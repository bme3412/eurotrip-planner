'use client';

import { useMemo } from 'react';
import { CheckCircle, AlertTriangle, Info, Route } from 'lucide-react';
import { validateRoute, getValidationSummary } from '@/lib/planning/routeValidator';

/**
 * RouteValidationPanel - Shows soft guidance about route efficiency
 *
 * Props:
 * - stops: Array<{ city, cityName }> - Selected stop cities
 * - startCity: { id, name } - Start anchor
 * - endCity: { id, name } - End anchor
 * - compact: boolean - Compact mode for inline display
 */
export default function RouteValidationPanel({
  stops = [],
  startCity,
  endCity,
  compact = false,
}) {
  // Run validation
  const validation = useMemo(() => {
    if (!startCity || !endCity || stops.length === 0) {
      return null;
    }
    return validateRoute(stops, startCity, endCity);
  }, [stops, startCity, endCity]);

  // Don't show if no stops selected
  if (!validation || stops.length === 0) {
    return null;
  }

  const summary = getValidationSummary(validation);
  const { isEfficient, efficiencyScore, warnings } = validation;

  // Get icon based on status
  const StatusIcon = isEfficient ? CheckCircle : AlertTriangle;
  const statusColor = summary.color === 'green' ? 'text-[#4a7c59]' : 'text-[#a08545]';
  const bgColor = summary.color === 'green' ? 'bg-[#f0f7f4]' : 'bg-[#fef7e6]';
  const borderColor = summary.color === 'green' ? 'border-[#4a7c59]/30' : 'border-[#a08545]/30';

  if (compact) {
    // Compact inline version
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${bgColor} ${borderColor} border`}>
        <StatusIcon className={`w-4 h-4 ${statusColor}`} />
        <span className="text-xs font-medium text-[#2a2520]">
          {summary.label}
        </span>
        <span className="text-xs text-[#6a6459]">
          ({efficiencyScore}%)
        </span>
      </div>
    );
  }

  // Full version
  return (
    <div className={`rounded-xl ${bgColor} border ${borderColor} p-4`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <StatusIcon className={`w-5 h-5 ${statusColor}`} />
          <span className="text-sm font-medium text-[#2a2520]">
            {summary.label}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Route className="w-4 h-4 text-[#8a8578]" />
          <span className="text-sm font-medium text-[#6a6459]">
            {efficiencyScore}%
          </span>
        </div>
      </div>

      {/* Efficiency bar */}
      <div className="h-2 bg-white/50 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full transition-all duration-500 rounded-full ${
            summary.color === 'green' ? 'bg-[#4a7c59]' : 'bg-[#a08545]'
          }`}
          style={{ width: `${efficiencyScore}%` }}
        />
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-2 mb-3">
          {warnings.map((warning, i) => (
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
                {warning.suggestion && (
                  <span className="block text-[#8a8578] mt-0.5">
                    {warning.suggestion}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-[10px] text-[#8a8578] italic">
        These are suggestions only – you can proceed with any route.
      </p>
    </div>
  );
}
