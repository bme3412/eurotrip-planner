'use client';

/**
 * DateScoreBadges
 *
 * Displays visual badges for date-specific scores:
 * - Weather (temperature, conditions)
 * - Crowds (tourism level)
 * - Events (special happenings)
 */

const colorClasses = {
  green: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    icon: 'text-emerald-600',
  },
  amber: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    icon: 'text-amber-600',
  },
  red: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    icon: 'text-red-600',
  },
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    icon: 'text-blue-600',
  },
  gray: {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    text: 'text-gray-600',
    icon: 'text-gray-500',
  },
};

function Badge({ icon, label, sublabel, color = 'gray', compact = false }) {
  const colors = colorClasses[color] || colorClasses.gray;

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${colors.bg} border ${colors.border}`}>
        <span className={colors.icon}>{icon}</span>
        <span className={`text-[10px] font-medium ${colors.text}`}>{label}</span>
      </span>
    );
  }

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${colors.bg} border ${colors.border}`}>
      <span className={`text-sm ${colors.icon}`}>{icon}</span>
      <div className="flex flex-col">
        <span className={`text-xs font-medium ${colors.text} leading-tight`}>{label}</span>
        {sublabel && (
          <span className={`text-[10px] ${colors.text} opacity-75 leading-tight`}>{sublabel}</span>
        )}
      </div>
    </div>
  );
}

export default function DateScoreBadges({ scoreBadges, compact = false, showEvents = true }) {
  if (!scoreBadges) {
    return null;
  }

  const { weather, crowds, events } = scoreBadges;

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {weather && (
          <Badge
            icon={weather.icon}
            label={weather.label}
            color={weather.color}
            compact
          />
        )}
        {crowds && (
          <Badge
            icon={crowds.icon}
            label={crowds.label}
            color={crowds.color}
            compact
          />
        )}
        {showEvents && events && (
          <Badge
            icon={events.icon}
            label={events.label}
            color={events.color}
            compact
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {weather && (
        <Badge
          icon={weather.icon}
          label={weather.label}
          sublabel={weather.sublabel}
          color={weather.color}
        />
      )}
      {crowds && (
        <Badge
          icon={crowds.icon}
          label={crowds.label}
          color={crowds.color}
        />
      )}
      {showEvents && events && (
        <Badge
          icon={events.icon}
          label={events.name || events.label}
          color={events.color}
        />
      )}
    </div>
  );
}

/**
 * Inline variant for use in list items
 */
export function DateScoreInline({ scoreBadges }) {
  if (!scoreBadges) return null;

  const { weather, crowds, events } = scoreBadges;

  return (
    <div className="flex items-center gap-3 text-xs text-[#6a6459]">
      {weather && (
        <span className="flex items-center gap-1">
          <span>{weather.icon}</span>
          <span>{weather.label}</span>
        </span>
      )}
      {crowds && (
        <span className="flex items-center gap-1">
          <span>{crowds.icon}</span>
          <span>{crowds.label}</span>
        </span>
      )}
      {events && (
        <span className="flex items-center gap-1">
          <span>{events.icon}</span>
          <span>{events.label}</span>
        </span>
      )}
    </div>
  );
}

/**
 * Summary badge showing overall score quality
 */
export function DateScoreSummary({ dateScore }) {
  if (!dateScore?.overall) return null;

  const score = dateScore.overall;
  let label, color, icon;

  if (score >= 80) {
    label = 'Excellent time';
    color = 'green';
    icon = '✨';
  } else if (score >= 65) {
    label = 'Good time';
    color = 'green';
    icon = '👍';
  } else if (score >= 50) {
    label = 'Fair time';
    color = 'amber';
    icon = '👌';
  } else {
    label = 'Consider dates';
    color = 'amber';
    icon = '📅';
  }

  const colors = colorClasses[color];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${colors.bg} border ${colors.border}`}>
      <span>{icon}</span>
      <span className={`text-[10px] font-medium ${colors.text}`}>{label}</span>
    </span>
  );
}
