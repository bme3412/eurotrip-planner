'use client';

import { useEffect } from 'react';

/**
 * Emit a read-only snapshot of the planner state to the parent so a shell
 * can render the top-bar Day Strip alongside the Describe / Step-by-step
 * toggle without re-implementing agent state.
 *
 * `interaction.briefCompleteness` and `interaction.nextAction` are unstable
 * by reference each render, so we accept a `briefSignature` string from the
 * caller and use that as the dependency.
 */
export function usePlannerStateSnapshot({
  onPlannerStateChange,
  tripState,
  dayAssignments,
  cityColors,
  tripHasCities,
  briefCompleteness,
  nextAction,
  briefSignature,
  itinerary,
}) {
  useEffect(() => {
    if (!onPlannerStateChange) return;
    onPlannerStateChange({
      tripState,
      days: dayAssignments,
      cities: tripState?.route?.cities || [],
      cityColors,
      hasCities: tripHasCities,
      briefCompleteness: briefCompleteness || null,
      nextAction: nextAction || null,
      itinerary: itinerary || null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onPlannerStateChange, tripState, dayAssignments, cityColors, tripHasCities, briefSignature, itinerary]);
}
