'use client';

import { useEffect } from 'react';

/**
 * Keep the browser URL in sync with the current trip identity:
 *
 * - Once a trip is persisted server-side (`savedTripId`), upgrade the URL
 *   from `?localTripId=...` to `?tripId=...`.
 * - Until then, surface the in-progress `localTripId` so a refresh resumes
 *   the same draft.
 *
 * `initialTripId` / `initialLocalTripId` mean the URL already carries a real
 * identifier — we never overwrite that.
 */
export function useTripIdUrlSync({
  savedTripId,
  localTripId,
  initialTripId,
  initialLocalTripId,
}) {
  useEffect(() => {
    if (!savedTripId || initialTripId) return;
    const url = new URL(window.location.href);
    url.searchParams.set('tripId', savedTripId);
    window.history.replaceState({}, '', `${url.pathname}?${url.searchParams.toString()}`);
  }, [initialTripId, savedTripId]);

  useEffect(() => {
    if (!localTripId || savedTripId || initialTripId || initialLocalTripId) return;
    const url = new URL(window.location.href);
    url.searchParams.delete('tripId');
    url.searchParams.set('localTripId', localTripId);
    window.history.replaceState({}, '', `${url.pathname}?${url.searchParams.toString()}`);
  }, [initialLocalTripId, initialTripId, localTripId, savedTripId]);
}
