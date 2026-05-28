'use client';

import { useEffect } from 'react';

/**
 * Kick off the agent conversation the first time the planner mounts.
 *
 * `useTripPlannerAgent` flips `hasStarted` to true after the welcome turn,
 * so this effect is a one-shot guard.
 */
export function useStartConversationOnce({ hasStarted, startConversation }) {
  useEffect(() => {
    if (!hasStarted) {
      startConversation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasStarted]);
}
