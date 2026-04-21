"use client";

import { X } from "lucide-react";

/**
 * ChipTray displays dismissible chips for parsed entities (cities, dates, themes).
 *
 * @param {Object} props
 * @param {Array} props.cities - Array of { id, name, country }
 * @param {string|null} props.month - Month name
 * @param {Object|null} props.duration - { value, unit }
 * @param {Array} props.themes - Array of { key, emoji, label }
 * @param {Function} props.onRemoveCity - Called with city id
 * @param {Function} props.onRemoveMonth - Called when month is removed
 * @param {Function} props.onRemoveDuration - Called when duration is removed
 * @param {Function} props.onRemoveTheme - Called with theme key
 */
export default function ChipTray({
  cities = [],
  month = null,
  duration = null,
  themes = [],
  onRemoveCity,
  onRemoveMonth,
  onRemoveDuration,
  onRemoveTheme,
}) {
  const hasChips = cities.length > 0 || month || duration || themes.length > 0;

  if (!hasChips) return null;

  return (
    <div
      className="flex flex-wrap gap-1.5 py-2"
      role="list"
      aria-label="Detected trip details"
    >
      {/* City chips */}
      {cities.map((city, index) => (
        <Chip
          key={city.id}
          icon="📍"
          label={city.name}
          badge={cities.length > 1 ? index + 1 : undefined}
          onRemove={() => onRemoveCity?.(city.id)}
          ariaLabel={`Remove ${city.name}`}
        />
      ))}

      {/* Month chip */}
      {month && (
        <Chip
          icon="📅"
          label={month}
          onRemove={onRemoveMonth}
          ariaLabel={`Remove ${month}`}
        />
      )}

      {/* Duration chip */}
      {duration && (
        <Chip
          icon="⏱"
          label={`${duration.value} ${duration.unit}${duration.value > 1 ? 's' : ''}`}
          onRemove={onRemoveDuration}
          ariaLabel="Remove duration"
        />
      )}

      {/* Theme chips */}
      {themes.map((theme) => (
        <Chip
          key={theme.key}
          icon={theme.emoji}
          label={theme.label}
          onRemove={() => onRemoveTheme?.(theme.key)}
          ariaLabel={`Remove ${theme.label} theme`}
        />
      ))}
    </div>
  );
}

/**
 * Individual chip component.
 */
function Chip({ icon, label, badge, onRemove, ariaLabel }) {
  return (
    <span
      role="listitem"
      className="group inline-flex items-center gap-1 rounded-full bg-hero-accent-soft px-2.5 py-1 text-xs font-medium text-hero-ink transition-colors hover:bg-hero-accent-soft/80"
    >
      {/* Badge for ordering (route visualization) */}
      {badge !== undefined && (
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-hero-accent text-[10px] font-bold text-white">
          {badge}
        </span>
      )}

      <span className="select-none" aria-hidden="true">{icon}</span>
      <span>{label}</span>

      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 rounded-full p-0.5 opacity-60 transition-opacity hover:bg-white/50 hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-1 focus:ring-hero-accent"
          aria-label={ariaLabel}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}
