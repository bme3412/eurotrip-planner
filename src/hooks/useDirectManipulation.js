'use client';

import { useCallback } from 'react';
import { mergeTripData } from '@/lib/conversation/tripState';
import {
  assignDaysToCity as assignDaysToCityPure,
  unassignDays as unassignDaysPure,
  setCityNights as setCityNightsPure,
  totalAssignedNights,
  addDays,
  toIsoDate,
  parseIsoDate,
} from '@/lib/conversation/dayAssignments';
import { applySuggestedAllocation, buildPlannerAction } from '@/lib/conversation/plannerActions';

function reflowCityDates(next) {
  const start = parseIsoDate(next?.dates?.startDate);
  const cities = next?.route?.cities || [];
  if (!start) {
    for (const c of cities) {
      c.arrivalDate = null;
      c.departureDate = null;
    }
    return;
  }
  const ordered = [...cities].sort((a, b) => {
    const ao = Number.isFinite(a.order) ? a.order : 999;
    const bo = Number.isFinite(b.order) ? b.order : 999;
    return ao - bo;
  });
  let cursor = 0;
  for (const c of ordered) {
    const n = Number.isFinite(c.nights) && c.nights > 0 ? c.nights : 0;
    if (n === 0) {
      c.arrivalDate = null;
      c.departureDate = null;
      continue;
    }
    c.arrivalDate = toIsoDate(addDays(start, cursor));
    c.departureDate = toIsoDate(addDays(start, cursor + n));
    cursor += n;
  }
}

/**
 * Truncate nights from the tail-most cities until `placedNights <= newTotal`.
 * Returns an array of { cityName, beforeNights, afterNights } describing the trim.
 */
function truncateFromTail(next, newTotal) {
  const trims = [];
  const ordered = [...(next?.route?.cities || [])].sort((a, b) => {
    const ao = Number.isFinite(a.order) ? a.order : 999;
    const bo = Number.isFinite(b.order) ? b.order : 999;
    return ao - bo;
  });
  for (let i = ordered.length - 1; i >= 0; i -= 1) {
    const placed = totalAssignedNights(next);
    if (placed <= newTotal) break;
    const overflow = placed - newTotal;
    const c = ordered[i];
    const cur = Number.isFinite(c.nights) ? c.nights : 0;
    if (cur <= 0) continue;
    const removed = Math.min(cur, overflow);
    const afterNights = cur - removed;
    c.nights = afterNights;
    if (afterNights === 0) {
      c.arrivalDate = null;
      c.departureDate = null;
    }
    trims.push({ cityName: c.name, beforeNights: cur, afterNights });
  }
  return trims;
}

/**
 * Hook for direct-manipulation mutators used by the schedule header.
 * These modify tripState outside the chat flow and post system events.
 */
export function useDirectManipulation({ tripStateRef, setTripState, onPlannerAction }) {
  const assignDaysToCity = useCallback(
    (cityId, dayIndices, { notify = true } = {}) => {
      if (!cityId || !dayIndices?.length) return;
      const before = tripStateRef.current;
      const next = assignDaysToCityPure(before, dayIndices, cityId);
      if (next === before) return;
      setTripState(next);
      if (notify) {
        const city = next.route.cities.find(
          (c) => (c.id || c.name?.toLowerCase()) === cityId
        );
        onPlannerAction?.(
          buildPlannerAction('assign_days_to_city', { before, after: next, city, dayIndices }),
          next
        );
      }
    },
    [onPlannerAction, tripStateRef, setTripState]
  );

  const unassignDays = useCallback(
    (dayIndices, { notify = true } = {}) => {
      if (!dayIndices?.length) return;
      const before = tripStateRef.current;
      const next = unassignDaysPure(before, dayIndices);
      if (next === before) return;
      setTripState(next);
      if (notify) {
        onPlannerAction?.(
          buildPlannerAction('unassign_days', { before, after: next, dayIndices }),
          next
        );
      }
    },
    [onPlannerAction, tripStateRef, setTripState]
  );

  const setCityNights = useCallback(
    (cityId, nights, { notify = true } = {}) => {
      if (!cityId || !Number.isFinite(nights)) return;
      const before = tripStateRef.current;
      const next = setCityNightsPure(before, cityId, nights);
      if (next === before) return;
      setTripState(next);
      if (notify) {
        const city = next.route.cities.find(
          (c) => (c.id || c.name?.toLowerCase()) === cityId
        );
        onPlannerAction?.(
          buildPlannerAction('set_city_nights', { before, after: next, city }),
          next
        );
      }
    },
    [onPlannerAction, tripStateRef, setTripState]
  );

  const setTripDates = useCallback(
    (partial = {}, { notify = true } = {}) => {
      if (!('startDate' in partial) && !('endDate' in partial)) return;
      const before = tripStateRef.current;
      const oldTotal = Number.isFinite(before?.dates?.totalNights)
        ? before.dates.totalNights
        : null;
      const next = JSON.parse(JSON.stringify(before));
      next.dates = next.dates || {};
      if ('startDate' in partial) {
        next.dates.startDate = partial.startDate || null;
      }
      if ('endDate' in partial) {
        next.dates.endDate = partial.endDate || null;
      }
      const s = next.dates.startDate;
      const e = next.dates.endDate;
      let newTotal = oldTotal;
      if (s && e) {
        const sd = new Date(`${s}T00:00:00`);
        const ed = new Date(`${e}T00:00:00`);
        if (
          !Number.isNaN(sd.getTime()) &&
          !Number.isNaN(ed.getTime()) &&
          ed >= sd
        ) {
          const nights = Math.round((ed - sd) / (1000 * 60 * 60 * 24));
          if (nights > 0) {
            next.dates.totalNights = nights;
            newTotal = nights;
          }
        }
      }

      // Reflow placed nights if the trip is shrinking past the placed total.
      const placed = totalAssignedNights(next);
      let trims = [];
      if (Number.isFinite(newTotal) && placed > newTotal) {
        trims = truncateFromTail(next, newTotal);
      }
      reflowCityDates(next);

      if (trims.length > 0) {
        const summaryBits = trims.map(
          (t) => `${t.cityName} ${t.beforeNights}n → ${t.afterNights}n`
        );
        next.lastReflow = {
          at: Date.now(),
          summary: `Trimmed ${summaryBits.join(', ')} to fit new end date`,
          trims,
          snapshot: before,
        };
      } else {
        // Clear stale reflow notice once user touches dates again without trimming.
        if (next.lastReflow) delete next.lastReflow;
      }

      setTripState(next);
      if (notify && s && e) {
        onPlannerAction?.(
          buildPlannerAction('set_trip_dates', { before, after: next, partial }),
          next
        );
      }
    },
    [onPlannerAction, tripStateRef, setTripState]
  );

  const undoLastReflow = useCallback(
    ({ notify = true } = {}) => {
      const current = tripStateRef.current;
      const reflow = current?.lastReflow;
      if (!reflow?.snapshot) return false;
      const restored = JSON.parse(JSON.stringify(reflow.snapshot));
      if (restored.lastReflow) delete restored.lastReflow;
      setTripState(restored);
      if (notify) {
        onPlannerAction?.(
          buildPlannerAction('set_trip_dates', {
            before: current,
            after: restored,
            partial: {
              startDate: restored?.dates?.startDate,
              endDate: restored?.dates?.endDate,
            },
          }),
          restored
        );
      }
      return true;
    },
    [onPlannerAction, tripStateRef, setTripState]
  );

  const addCity = useCallback(
    ({ name, country = null, id = null, latitude = null, longitude = null } = {}, { notify = true } = {}) => {
      if (!name?.trim()) return null;
      const cleanName = name.trim();
      const before = tripStateRef.current;
      const next = mergeTripData(before, {
        cities: [{ name: cleanName, country, id, latitude, longitude, role: 'stop', nights: 0 }],
      });
      // Ensure the new city has an id we can address it by.
      const created = next.route.cities.find(
        (c) =>
          (id && c.id === id) ||
          (c.id || c.name?.toLowerCase()) === cleanName.toLowerCase()
      );
      if (created) {
        if (!created.id) created.id = id || cleanName.toLowerCase();
        if (!created.country && country) created.country = country;
        if (!created.latitude && latitude) created.latitude = latitude;
        if (!created.longitude && longitude) created.longitude = longitude;
      }
      setTripState(next);
      if (notify) {
        onPlannerAction?.(
          buildPlannerAction('add_city', { before, after: next, city: created }),
          next
        );
      }
      return created;
    },
    [onPlannerAction, tripStateRef, setTripState]
  );

  const acceptSuggestedAllocation = useCallback(
    (allocation, { notify = true } = {}) => {
      if (!allocation?.segments?.length) return;
      const before = tripStateRef.current;
      const next = applySuggestedAllocation(before, allocation);
      if (next === before) return;
      setTripState(next);
      if (notify) {
        onPlannerAction?.(
          buildPlannerAction('accept_allocation', { before, after: next }),
          next
        );
      }
    },
    [onPlannerAction, tripStateRef, setTripState]
  );

  return {
    assignDaysToCity,
    unassignDays,
    setCityNights,
    setTripDates,
    undoLastReflow,
    addCity,
    acceptSuggestedAllocation,
  };
}
