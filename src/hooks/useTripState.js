'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { initialTripState } from '@/lib/conversation/tripState';
import { analyzeGaps } from '@/lib/conversation/gapAnalysis';

/**
 * Hook for trip state and gap analysis.
 */
export function useTripState() {
  const [tripState, setTripState] = useState(initialTripState);
  const [isFinalized, setIsFinalized] = useState(false);
  const tripStateRef = useRef(initialTripState);

  useEffect(() => {
    tripStateRef.current = tripState;
  }, [tripState]);

  // Gap analysis is derived from tripState
  const gaps = analyzeGaps(tripState);

  const resetTripState = useCallback(() => {
    setTripState(initialTripState);
    setIsFinalized(false);
  }, []);

  return {
    tripState,
    setTripState,
    tripStateRef,
    isFinalized,
    setIsFinalized,
    gaps,
    resetTripState,
  };
}
