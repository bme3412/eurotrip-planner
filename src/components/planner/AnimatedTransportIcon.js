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
 * Transport mode to color configuration
 */
const TRANSPORT_CONFIG = {
  train: {
    color: '#0ea5e9',      // sky-500
    glowColor: '#38bdf8',  // sky-400
    bgGradient: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
    trailColor: 'rgba(14, 165, 233, 0.4)',
  },
  flight: {
    color: '#8b5cf6',      // violet-500
    glowColor: '#a78bfa',  // violet-400
    bgGradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    trailColor: 'rgba(139, 92, 246, 0.4)',
  },
  bus: {
    color: '#10b981',      // emerald-500
    glowColor: '#34d399',  // emerald-400
    bgGradient: 'linear-gradient(135deg, #10b981, #059669)',
    trailColor: 'rgba(16, 185, 129, 0.4)',
  },
  ferry: {
    color: '#06b6d4',      // cyan-500
    glowColor: '#22d3ee',  // cyan-400
    bgGradient: 'linear-gradient(135deg, #06b6d4, #0891b2)',
    trailColor: 'rgba(6, 182, 212, 0.4)',
  },
  unknown: {
    color: '#94a3b8',
    glowColor: '#cbd5e1',
    bgGradient: 'linear-gradient(135deg, #94a3b8, #64748b)',
    trailColor: 'rgba(148, 163, 184, 0.4)',
  },
};

/**
 * AnimatedTransportIcon - Renders an animated transport icon with motion effects
 *
 * @param {string} mode - Transport mode: 'train', 'flight', 'bus', 'ferry'
 * @param {number} x - X position in pixels
 * @param {number} y - Y position in pixels
 * @param {number} rotation - Rotation angle in degrees
 * @param {string} state - Visual state: 'normal', 'editing', 'downstream'
 * @param {number} opacity - Opacity value (0-1)
 * @param {number} progress - Animation progress (0-1)
 */
export default function AnimatedTransportIcon({
  mode = 'train',
  x = 0,
  y = 0,
  rotation = 0,
  state = 'normal',
  opacity = 1,
  progress = 0.5,
}) {
  const Icon = TRANSPORT_ICONS[mode] || TRANSPORT_ICONS.unknown;
  const config = TRANSPORT_CONFIG[mode] || TRANSPORT_CONFIG.unknown;

  // Adjust rotation for icon direction
  const iconRotation = rotation - 90;

  // Calculate animation phases
  const isMoving = progress > 0.02 && progress < 0.98;
  const isArriving = progress >= 0.98;

  // Speed-based scale (faster in the middle of journey)
  const speedCurve = Math.sin(progress * Math.PI);
  const scale = isArriving ? 1.15 : (1 + speedCurve * 0.1);

  // Pulsing glow intensity
  const pulsePhase = (Date.now() / 1000) % 1;
  const pulseIntensity = 0.5 + Math.sin(pulsePhase * Math.PI * 2) * 0.3;

  // State-based styling
  const isDownstream = state === 'downstream';
  const isEditing = state === 'editing';

  // Trail length based on speed
  const trailLength = isMoving ? 24 + speedCurve * 16 : 0;

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: x,
        top: y,
        transform: `translate(-50%, -50%)`,
        opacity: isDownstream ? 0.4 : opacity,
        filter: isDownstream ? 'grayscale(0.5)' : 'none',
      }}
    >
      {/* Motion trail - only when moving */}
      {isMoving && !isDownstream && (
        <div
          className="absolute"
          style={{
            width: trailLength,
            height: 6,
            left: '50%',
            top: '50%',
            transformOrigin: 'right center',
            transform: `translate(-100%, -50%) rotate(${iconRotation + 180}deg)`,
            background: `linear-gradient(to left, ${config.trailColor}, transparent)`,
            borderRadius: 3,
            opacity: 0.8,
          }}
        />
      )}

      {/* Secondary shorter trail for planes */}
      {mode === 'flight' && isMoving && !isDownstream && (
        <>
          <div
            className="absolute"
            style={{
              width: trailLength * 0.5,
              height: 3,
              left: '50%',
              top: '50%',
              transformOrigin: 'right center',
              transform: `translate(-100%, calc(-50% + 8px)) rotate(${iconRotation + 185}deg)`,
              background: `linear-gradient(to left, ${config.trailColor}, transparent)`,
              borderRadius: 2,
              opacity: 0.5,
            }}
          />
          <div
            className="absolute"
            style={{
              width: trailLength * 0.5,
              height: 3,
              left: '50%',
              top: '50%',
              transformOrigin: 'right center',
              transform: `translate(-100%, calc(-50% - 8px)) rotate(${iconRotation + 175}deg)`,
              background: `linear-gradient(to left, ${config.trailColor}, transparent)`,
              borderRadius: 2,
              opacity: 0.5,
            }}
          />
        </>
      )}

      {/* Pulsing glow ring */}
      {!isDownstream && (
        <div
          className="absolute rounded-full"
          style={{
            width: 48,
            height: 48,
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            background: `radial-gradient(circle, ${config.glowColor}${Math.round(pulseIntensity * 40).toString(16).padStart(2, '0')}, transparent 70%)`,
            animation: 'pulse 2s ease-in-out infinite',
          }}
        />
      )}

      {/* Main icon container */}
      <div
        style={{
          transform: `rotate(${iconRotation}deg) scale(${scale})`,
          transition: isArriving ? 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'transform 0.1s ease-out',
        }}
      >
        <div
          className="relative flex items-center justify-center w-9 h-9 rounded-full"
          style={{
            background: isEditing
              ? 'linear-gradient(135deg, #f59e0b, #d97706)'
              : isDownstream
                ? 'linear-gradient(135deg, #94a3b8, #64748b)'
                : config.bgGradient,
            boxShadow: isEditing
              ? '0 0 0 3px rgba(245, 158, 11, 0.3), 0 4px 12px rgba(0, 0, 0, 0.2)'
              : isDownstream
                ? '0 2px 6px rgba(0, 0, 0, 0.15)'
                : `0 0 0 2px ${config.glowColor}40, 0 4px 12px rgba(0, 0, 0, 0.2)`,
          }}
        >
          {/* Inner highlight */}
          <div
            className="absolute inset-0.5 rounded-full opacity-30"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.4) 0%, transparent 50%)',
            }}
          />

          <Icon
            className="w-4.5 h-4.5 text-white relative z-10"
            style={{ width: 18, height: 18 }}
            strokeWidth={2.5}
          />
        </div>

        {/* Arrival sparkle effect */}
        {isArriving && !isDownstream && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="absolute w-12 h-12 rounded-full animate-ping"
              style={{
                background: `radial-gradient(circle, ${config.glowColor}60, transparent 60%)`,
                animationDuration: '0.6s',
                animationIterationCount: '2',
              }}
            />
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
        }
      `}</style>
    </div>
  );
}
