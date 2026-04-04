'use client';

import { memo } from 'react';
import AnimatedTransportIcon from './AnimatedTransportIcon';

/**
 * TransportAnimationOverlay - Container for all animated transport icons
 *
 * Renders absolutely positioned icons over the map.
 * Uses pointer-events: none to not interfere with map interactions.
 *
 * @param {Array} animationStates - Array of animation states from useTransportAnimation
 */
function TransportAnimationOverlay({ animationStates = [] }) {
  // Debug: log animation states
  if (animationStates.length > 0) {
    console.log('[Transport Animation] Rendering', animationStates.length, 'icons', animationStates[0]);
  }

  if (animationStates.length === 0) {
    return null;
  }

  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{ zIndex: 1000 }}
    >
      {animationStates.map((state) => (
        <AnimatedTransportIcon
          key={state.segmentId}
          mode={state.transportMode}
          x={state.screenPosition.x}
          y={state.screenPosition.y}
          rotation={state.bearing}
          state={state.state}
          opacity={1}
        />
      ))}
    </div>
  );
}

// Memoize to prevent unnecessary re-renders
export default memo(TransportAnimationOverlay);
