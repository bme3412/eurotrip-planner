'use client';

import { Check } from './icons';

/**
 * FilterChip - Unified filter chip component
 *
 * Used for both transport and time filters with consistent styling.
 * Supports single-select and multi-select modes.
 *
 * @param {string} label - Display text
 * @param {boolean} isActive - Whether the chip is selected
 * @param {function} onClick - Click handler
 * @param {Component} icon - Optional lucide icon component
 * @param {boolean} multiSelect - If true, shows checkmark when active
 * @param {string} className - Additional classes
 */
export default function FilterChip({
  label,
  isActive = false,
  onClick,
  icon: Icon,
  multiSelect = false,
  className = '',
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
        transition-all duration-150 border
        ${isActive
          ? 'bg-[#c9a227] text-white border-[#c9a227] shadow-sm'
          : 'bg-white text-[#6a6459] border-[#e5e0d8] hover:border-[#c9a227]/50 hover:bg-[#faf8f5]'
        }
        ${className}
      `}
    >
      {/* Multi-select checkmark */}
      {multiSelect && isActive && (
        <Check className="w-3 h-3" strokeWidth={3} />
      )}

      {/* Icon (only show if not multi-select active, to avoid double icons) */}
      {Icon && !(multiSelect && isActive) && (
        <Icon className="w-3.5 h-3.5" />
      )}

      {/* Label */}
      <span>{label}</span>
    </button>
  );
}

/**
 * FilterChipGroup - Container for a group of filter chips
 */
export function FilterChipGroup({ children, label, className = '' }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <span className="text-[10px] font-medium text-[#8a8578] uppercase tracking-wide">
          {label}
        </span>
      )}
      <div className="flex flex-wrap gap-1.5">
        {children}
      </div>
    </div>
  );
}
