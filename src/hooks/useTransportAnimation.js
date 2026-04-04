'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  interpolatePosition,
  interpolateGreatCircle,
  calculateBearing,
  calculateDistance,
  easeInOutQuad,
} from '../utils/lineInterpolation';

/**
 * Animation duration per transport type (in milliseconds)
 * Faster transports complete the animation quicker for visual effect
 */
const ANIMATION_DURATION = {
  flight: 6000,   // 6 seconds - fastest
  train: 10000,   // 10 seconds
  bus: 12000,     // 12 seconds
  ferry: 14000,   // 14 seconds - slowest
  unknown: 10000,
};

/**
 * Stagger offset between segments (in milliseconds)
 * Each subsequent segment starts this much later
 */
const STAGGER_OFFSET = 800;

/**
 * Custom hook for animating transport icons along route segments
 *
 * @param {Array} routeSegments - Array of route segment objects
 * @param {Object} mapRef - Reference to the Mapbox map instance
 * @param {boolean} isMapLoaded - Whether the map is ready
 * @returns {Array} Array of animation states for each segment
 */
export function useTransportAnimation(routeSegments, mapRef, isMapLoaded) {
  const [animationStates, setAnimationStates] = useState([]);
  const animationFrameRef = useRef(null);
  const startTimeRef = useRef(null);
  const segmentStartTimesRef = useRef([]);

  // Debug logging
  useEffect(() => {
    console.log('[useTransportAnimation] State:', {
      isMapLoaded,
      hasMapRef: !!mapRef?.current,
      segmentCount: routeSegments.length,
      segments: routeSegments.map(s => ({ id: s.id, mode: s.stop?.transport?.mode })),
    });
  }, [isMapLoaded, mapRef, routeSegments]);

  // Project lng/lat to screen coordinates
  const projectToScreen = useCallback((lngLat) => {
    if (!mapRef?.current) return { x: 0, y: 0 };
    try {
      const point = mapRef.current.project(lngLat);
      return { x: point.x, y: point.y };
    } catch {
      return { x: 0, y: 0 };
    }
  }, [mapRef]);

  // Calculate animation state for a single segment
  const calculateSegmentState = useCallback((segment, currentTime, segmentIndex) => {
    let transportMode = segment.stop?.transport?.mode;

    // Auto-detect transport type based on distance if not provided
    if (!transportMode) {
      const distance = calculateDistance(segment.coordinates[0], segment.coordinates[1]);
      if (distance > 800) {
        transportMode = 'flight'; // > 800km = likely a flight
      } else if (distance > 300) {
        transportMode = 'train';  // 300-800km = train
      } else {
        transportMode = 'train';  // < 300km = train or bus, default train
      }
    }

    const duration = ANIMATION_DURATION[transportMode] || ANIMATION_DURATION.unknown;
    const staggeredStart = segmentStartTimesRef.current[segmentIndex] || 0;

    // Calculate progress with stagger - clamp to 1.0 (no looping)
    const elapsed = currentTime - staggeredStart;
    const rawProgress = Math.min(1, elapsed / duration);
    const progress = easeInOutQuad(rawProgress);
    const isComplete = rawProgress >= 1;

    // Use great circle interpolation for flights (curved path)
    const isGreatCircle = transportMode === 'flight';
    const distance = calculateDistance(segment.coordinates[0], segment.coordinates[1]);

    // Only use great circle for long distances (> 500km)
    const position = (isGreatCircle && distance > 500)
      ? interpolateGreatCircle(segment.coordinates[0], segment.coordinates[1], progress)
      : interpolatePosition(segment.coordinates[0], segment.coordinates[1], progress);

    // Calculate bearing for icon rotation
    const bearing = calculateBearing(segment.coordinates[0], segment.coordinates[1]);

    // Project to screen coordinates
    const screenPos = projectToScreen(position);

    return {
      segmentId: segment.id,
      segmentIndex,
      transportMode,
      progress,
      position,
      screenPosition: screenPos,
      bearing,
      state: segment.state || 'normal',
      isComplete,
    };
  }, [projectToScreen]);

  // Animation loop
  const animate = useCallback((timestamp) => {
    if (!startTimeRef.current) {
      startTimeRef.current = timestamp;
      // Initialize staggered start times
      segmentStartTimesRef.current = routeSegments.map((_, i) => timestamp + i * STAGGER_OFFSET);
    }

    const currentTime = timestamp;

    // Calculate state for each segment
    const newStates = routeSegments.map((segment, index) =>
      calculateSegmentState(segment, currentTime, index)
    );

    setAnimationStates(newStates);

    // Stop animation when all segments are complete
    const allComplete = newStates.every(state => state.isComplete);
    if (!allComplete) {
      animationFrameRef.current = requestAnimationFrame(animate);
    } else {
      // Animation finished - icons stay at destination
      animationFrameRef.current = null;
    }
  }, [routeSegments, calculateSegmentState]);

  // Update screen positions when map moves/zooms
  const updateProjections = useCallback(() => {
    setAnimationStates(prevStates =>
      prevStates.map(state => {
        const screenPos = projectToScreen(state.position);
        return { ...state, screenPosition: screenPos };
      })
    );
  }, [projectToScreen]);

  // Start/stop animation based on map and segments
  useEffect(() => {
    if (!isMapLoaded || !mapRef?.current || routeSegments.length === 0) {
      // Clean up if conditions not met
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      setAnimationStates([]);
      return;
    }

    // Reset start times when segments change
    startTimeRef.current = null;

    // Start animation
    animationFrameRef.current = requestAnimationFrame(animate);

    // Listen for map movements to update projections
    const map = mapRef.current;
    map.on('move', updateProjections);
    map.on('zoom', updateProjections);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      map.off('move', updateProjections);
      map.off('zoom', updateProjections);
    };
  }, [isMapLoaded, mapRef, routeSegments, animate, updateProjections]);

  return animationStates;
}
