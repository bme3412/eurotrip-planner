import { Sunrise, Sunset } from 'lucide-react';

/**
 * Compact weather + daylight strip: a sunrise→sunset arc with the temp range.
 * Pure SVG, no deps; renders nothing useful-looking only if data is absent.
 */
export default function WeatherStrip({ weather }) {
  if (!weather) return null;
  const { highC, lowC, sunrise, sunset, conditions } = weather;
  const hasArc = sunrise && sunset;

  return (
    <div className="flex items-center gap-4 rounded-xl border border-gray-200/80 bg-gray-50/60 px-4 py-3">
      <div className="flex flex-col">
        <span className="text-lg font-semibold text-gray-900">
          {highC != null ? `${Math.round(highC)}°` : '—'}
          {lowC != null && <span className="ml-1 text-sm font-normal text-gray-400">/ {Math.round(lowC)}°</span>}
        </span>
        {conditions?.label && (
          <span className="text-xs text-gray-500">
            {conditions.emoji} {conditions.label}
          </span>
        )}
      </div>

      {hasArc && (
        <div className="flex flex-1 items-center gap-2">
          <Sunrise className="h-4 w-4 shrink-0 text-amber-500" />
          <div className="relative h-8 flex-1">
            <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="h-full w-full overflow-visible">
              <path d="M2 30 Q 50 -8 98 30" fill="none" stroke="#fcd34d" strokeWidth="1.5" strokeDasharray="2 2" />
              <circle cx="50" cy="6" r="2.5" fill="#f59e0b" />
            </svg>
            <span className="absolute left-0 -bottom-1 text-[10px] text-gray-400">{sunrise}</span>
            <span className="absolute right-0 -bottom-1 text-[10px] text-gray-400">{sunset}</span>
          </div>
          <Sunset className="h-4 w-4 shrink-0 text-orange-500" />
        </div>
      )}
    </div>
  );
}
