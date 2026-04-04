'use client';

import { Train, Plane, Bus, Ship } from 'lucide-react';

/**
 * Transport mode to icon mapping
 */
const TRANSPORT_ICONS = {
  train: Train,
  flight: Plane,
  bus: Bus,
  ferry: Ship,
  unknown: Train,
};

/**
 * Transport mode to color mapping
 */
const TRANSPORT_COLORS = {
  normal: {
    train: 'text-sky-500',
    flight: 'text-violet-500',
    bus: 'text-emerald-500',
    ferry: 'text-cyan-500',
    unknown: 'text-slate-400',
  },
  editing: {
    train: 'text-amber-500',
    flight: 'text-amber-500',
    bus: 'text-amber-500',
    ferry: 'text-amber-500',
    unknown: 'text-amber-500',
  },
  downstream: {
    train: 'text-slate-400',
    flight: 'text-slate-400',
    bus: 'text-slate-400',
    ferry: 'text-slate-400',
    unknown: 'text-slate-400',
  },
};

/**
 * AnimatedTransportIcon - Renders a transport icon at a specific position
 *
 * @param {string} mode - Transport mode: 'train', 'flight', 'bus', 'ferry'
 * @param {number} x - X position in pixels
 * @param {number} y - Y position in pixels
 * @param {number} rotation - Rotation angle in degrees (0 = pointing right/east)
 * @param {string} state - Visual state: 'normal', 'editing', 'downstream'
 * @param {number} opacity - Opacity value (0-1)
 */
export default function AnimatedTransportIcon({
  mode = 'train',
  x = 0,
  y = 0,
  rotation = 0,
  state = 'normal',
  opacity = 1,
}) {
  const Icon = TRANSPORT_ICONS[mode] || TRANSPORT_ICONS.unknown;
  const colorClass = TRANSPORT_COLORS[state]?.[mode] || TRANSPORT_COLORS.normal.unknown;

  // Adjust rotation: bearing 0 = North, but we want icon to point in direction of travel
  // Icons by default point right (East), so we need to adjust:
  // - Planes should point in direction of travel (bearing - 90)
  // - Trains/buses/ferries look better pointing right with slight adjustment
  const iconRotation = mode === 'flight' ? rotation - 90 : rotation - 90;

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: x,
        top: y,
        transform: `translate(-50%, -50%) rotate(${iconRotation}deg)`,
        opacity: state === 'downstream' ? 0.5 : opacity,
        transition: 'opacity 0.3s ease',
      }}
    >
      <div
        className={`
          flex items-center justify-center
          w-8 h-8 rounded-full
          bg-white shadow-lg
          border-2 border-white
          ${state === 'editing' ? 'ring-2 ring-amber-400 ring-offset-1' : ''}
        `}
        style={{
          boxShadow: '0 2px 8px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.1)',
        }}
      >
        <Icon
          className={`w-4 h-4 ${colorClass}`}
          strokeWidth={2.5}
        />
      </div>
    </div>
  );
}
