'use client';

import { useState, useCallback } from 'react';
import { getSupabaseAuthHeaders } from '@/lib/supabase/authHeaders';

/**
 * Generation phase state machine:
 *   idle -> confirming -> generating -> complete
 *                     \-> idle (declined)     \-> error -> generating (retry)
 *   complete -> confirming (re-generate after changes)
 *   complete -> idle (start over)
 */
export function useItineraryGeneration({
  tripStateRef,
  tripIdRef = null,
  session = null,
  onGeneratedItinerary = null,
}) {
  const [generationPhase, setGenerationPhase] = useState('idle');
  const [itinerary, setItinerary] = useState(null);
  const [generationError, setGenerationError] = useState(null);

  /** Agent called finalize_trip — move to confirming. */
  const requestFinalization = useCallback((summary) => {
    setGenerationPhase('confirming');
    setGenerationError(null);
  }, []);

  /** User confirmed — call the generation API. */
  const confirmGeneration = useCallback(async () => {
    setGenerationPhase('generating');
    setGenerationError(null);

    const ts = tripStateRef.current;
    const cities = ts.route.cities
      .filter(c => c.id && c.nights > 0)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map(c => ({ id: c.id, name: c.name, country: c.country }));

    const dayAllocation = Object.fromEntries(
      ts.route.cities
        .filter(c => c.id && c.nights > 0)
        .map(c => [c.id, c.nights])
    );

    // Derive concrete dates for flexible dates
    let startDate = ts.dates.startDate;
    let endDate = ts.dates.endDate;
    if (!startDate && ts.dates.flexibleMonth && ts.dates.totalNights) {
      const [year, month] = ts.dates.flexibleMonth.split('-');
      if (year && month) {
        startDate = `${year}-${month}-01`;
        const sd = new Date(`${startDate}T00:00:00`);
        sd.setDate(sd.getDate() + ts.dates.totalNights);
        endDate = sd.toISOString().split('T')[0];
      }
    }

    try {
      const tripId = tripIdRef?.current;
      const res = await fetch(tripId ? `/api/trips/${tripId}/generate` : '/api/trips/generate', {
        method: 'POST',
        headers: tripId
          ? getSupabaseAuthHeaders(session, { 'Content-Type': 'application/json' })
          : { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripState: ts,
          cities,
          start_date: startDate,
          end_date: endDate,
          interests: ts.preferences.interests,
          pace: ts.preferences.pace || 'balanced',
          budget: ts.budget.style || 'moderate',
          day_allocation: dayAllocation,
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(body || `HTTP ${res.status}`);
      }

      const { itinerary: result } = await res.json();
      setItinerary(result);
      onGeneratedItinerary?.(result);
      setGenerationPhase('complete');
    } catch (err) {
      setGenerationError(err.message);
      setGenerationPhase('error');
    }
  }, [tripStateRef, tripIdRef, session, onGeneratedItinerary]);

  /** User declined finalization — go back to idle. */
  const cancelFinalization = useCallback(() => {
    setGenerationPhase('idle');
    setGenerationError(null);
  }, []);

  /** Retry after error. */
  const retryGeneration = useCallback(() => {
    confirmGeneration();
  }, [confirmGeneration]);

  /** Full reset (start over). */
  const resetGeneration = useCallback(() => {
    setGenerationPhase('idle');
    setItinerary(null);
    setGenerationError(null);
  }, []);

  return {
    generationPhase,
    itinerary,
    generationError,
    requestFinalization,
    confirmGeneration,
    cancelFinalization,
    retryGeneration,
    resetGeneration,
  };
}
