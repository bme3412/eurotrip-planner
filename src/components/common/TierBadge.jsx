'use client';

/**
 * TierBadge Component
 *
 * Displays a tier badge for city recommendations.
 * Tiers are visually distinct without showing numerical scores.
 *
 * Tier 1: Gold - Top picks
 * Tier 2: Silver - Great options
 * Tier 3: Bronze - Good options
 * Tier 4: Neutral - Worth considering
 */

const TIER_CONFIG = {
  1: {
    label: 'Top Pick',
    shortLabel: 'T1',
    icon: '\u2605', // Star
    bg: 'bg-gradient-to-r from-amber-400 to-yellow-300',
    text: 'text-amber-900',
    border: 'border-amber-500',
  },
  2: {
    label: 'Great Option',
    shortLabel: 'T2',
    icon: '\u25C6', // Diamond
    bg: 'bg-gradient-to-r from-slate-300 to-gray-200',
    text: 'text-gray-800',
    border: 'border-slate-400',
  },
  3: {
    label: 'Good Option',
    shortLabel: 'T3',
    icon: '\u25CF', // Circle
    bg: 'bg-gradient-to-r from-orange-200 to-amber-100',
    text: 'text-orange-800',
    border: 'border-orange-300',
  },
  4: {
    label: 'Consider',
    shortLabel: 'T4',
    icon: null,
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    border: 'border-gray-200',
  },
};

export function TierBadge({
  tier,
  size = 'sm',
  showLabel = true,
  showIcon = true,
  className = '',
}) {
  const config = TIER_CONFIG[tier] || TIER_CONFIG[4];

  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[10px]',
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1
        ${config.bg} ${config.text}
        border ${config.border}
        rounded-full font-semibold
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {showIcon && config.icon && (
        <span className="flex-shrink-0">{config.icon}</span>
      )}
      {showLabel && (
        <span>{size === 'xs' ? config.shortLabel : config.label}</span>
      )}
    </span>
  );
}

/**
 * TierIndicator - Compact circular tier indicator for list views
 */
export function TierIndicator({ tier, size = 'md' }) {
  const config = TIER_CONFIG[tier] || TIER_CONFIG[4];

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  return (
    <div
      className={`
        ${config.bg} ${config.text}
        border-2 ${config.border}
        rounded-full
        flex items-center justify-center
        font-bold
        ${sizeClasses[size]}
      `}
    >
      {config.icon || `T${tier}`}
    </div>
  );
}

/**
 * TierSection - Header for tier groups in results
 */
export function TierSection({ tier, label, sublabel, paragraph, cityCount }) {
  const config = TIER_CONFIG[tier] || TIER_CONFIG[4];

  return (
    <div className="space-y-2 py-3">
      <div className="flex items-center gap-3">
        <TierBadge tier={tier} size="md" showIcon={true} />
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900">{label}</h3>
          {sublabel && (
            <p className="text-sm text-gray-500">{sublabel}</p>
          )}
        </div>
        {cityCount !== undefined && (
          <span className="text-sm text-gray-400">
            {cityCount} {cityCount === 1 ? 'city' : 'cities'}
          </span>
        )}
      </div>

      {/* Tier context paragraph */}
      {paragraph && (
        <p className="text-sm text-gray-600 leading-relaxed pl-14">
          {paragraph}
        </p>
      )}
    </div>
  );
}

export default TierBadge;
