'use client';

import { useState } from 'react';
import { Minus, Plus, Calendar, Check } from 'lucide-react';

/**
 * DayAllocationControls - Stepper + optional date picker for day allocation
 *
 * Props:
 * - days: number - Currently allocated days
 * - minDays: number - Minimum days (default 1)
 * - maxDays: number - Maximum days based on remaining gap
 * - recommendedDays: number - Suggested days for this city
 * - onChange: (days: number) => void
 * - cityName: string - City name for display
 * - compact: boolean - Compact mode for inline display
 */
export default function DayAllocationControls({
  days,
  minDays = 1,
  maxDays,
  recommendedDays,
  onChange,
  cityName,
  compact = false,
}) {
  const isRecommended = days === recommendedDays;
  const canDecrease = days > minDays;
  const canIncrease = days < maxDays;

  if (compact) {
    // Compact inline version for city cards
    return (
      <div className="flex items-center gap-1.5">
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (canDecrease) onChange(days - 1);
          }}
          disabled={!canDecrease}
          className={`
            w-6 h-6 rounded-full flex items-center justify-center transition-all
            ${canDecrease
              ? 'bg-[#f5f3f0] hover:bg-[#e5e0d8] text-[#6a6459]'
              : 'bg-[#f5f3f0] text-[#c5c0b8] cursor-not-allowed'
            }
          `}
        >
          <Minus className="w-3 h-3" />
        </button>

        <div className="flex flex-col items-center min-w-[40px]">
          <span className="text-sm font-medium text-[#2a2520]">{days}d</span>
          {isRecommended && (
            <span className="text-[8px] text-[#4a7c59] leading-none">rec</span>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            if (canIncrease) onChange(days + 1);
          }}
          disabled={!canIncrease}
          className={`
            w-6 h-6 rounded-full flex items-center justify-center transition-all
            ${canIncrease
              ? 'bg-[#f5f3f0] hover:bg-[#e5e0d8] text-[#6a6459]'
              : 'bg-[#f5f3f0] text-[#c5c0b8] cursor-not-allowed'
            }
          `}
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
    );
  }

  // Full version for modals/panels
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[#6a6459] uppercase tracking-wider">
          Days in {cityName}
        </span>
        {recommendedDays && (
          <span className="text-xs text-[#8a8578]">
            {recommendedDays}d recommended
          </span>
        )}
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-center gap-4 py-2">
        <button
          onClick={() => canDecrease && onChange(days - 1)}
          disabled={!canDecrease}
          className={`
            w-10 h-10 rounded-full flex items-center justify-center transition-all border
            ${canDecrease
              ? 'bg-white border-[#e5e0d8] hover:border-[#c9a227] hover:bg-[#faf6eb] text-[#6a6459]'
              : 'bg-[#f5f3f0] border-[#e5e0d8] text-[#c5c0b8] cursor-not-allowed'
            }
          `}
        >
          <Minus className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center min-w-[80px]">
          <span className="text-3xl font-light text-[#2a2520]">{days}</span>
          <span className="text-xs text-[#8a8578]">
            {days === 1 ? 'day' : 'days'}
          </span>
          {isRecommended && (
            <span className="flex items-center gap-1 text-[10px] text-[#4a7c59] mt-1">
              <Check className="w-3 h-3" />
              Recommended
            </span>
          )}
        </div>

        <button
          onClick={() => canIncrease && onChange(days + 1)}
          disabled={!canIncrease}
          className={`
            w-10 h-10 rounded-full flex items-center justify-center transition-all border
            ${canIncrease
              ? 'bg-white border-[#e5e0d8] hover:border-[#c9a227] hover:bg-[#faf6eb] text-[#6a6459]'
              : 'bg-[#f5f3f0] border-[#e5e0d8] text-[#c5c0b8] cursor-not-allowed'
            }
          `}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Quick select buttons */}
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3, 4].filter(d => d <= maxDays).map((d) => (
          <button
            key={d}
            onClick={() => onChange(d)}
            className={`
              px-3 py-1.5 rounded-full text-xs font-medium transition-all
              ${days === d
                ? 'bg-[#a08545] text-white'
                : 'bg-[#f5f3f0] text-[#6a6459] hover:bg-[#e5e0d8]'
              }
              ${d === recommendedDays ? 'ring-1 ring-[#4a7c59]/40' : ''}
            `}
          >
            {d}d
          </button>
        ))}
      </div>

      {/* Remaining days warning */}
      {maxDays - days === 0 && (
        <p className="text-center text-xs text-[#a08545]">
          This uses all remaining days
        </p>
      )}
    </div>
  );
}
