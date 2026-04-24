'use client';

import { useCallback } from 'react';
import { mergeTripData } from '@/lib/conversation/tripState';
import {
  assignDaysToCity as assignDaysToCityPure,
  unassignDays as unassignDaysPure,
  setCityNights as setCityNightsPure,
} from '@/lib/conversation/dayAssignments';

/**
 * Hook for direct-manipulation mutators used by the schedule header.
 * These modify tripState outside the chat flow and post system events.
 */
export function useDirectManipulation({ tripStateRef, setTripState, postSystemEvent }) {
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
        const dayLabel =
          dayIndices.length === 1
            ? `day ${dayIndices[0] + 1}`
            : `${dayIndices.length} days`;
        postSystemEvent(`You assigned ${dayLabel} to ${city?.name || 'a city'}.`);
      }
    },
    [tripStateRef, setTripState, postSystemEvent]
  );

  const unassignDays = useCallback(
    (dayIndices, { notify = true } = {}) => {
      if (!dayIndices?.length) return;
      const before = tripStateRef.current;
      const next = unassignDaysPure(before, dayIndices);
      if (next === before) return;
      setTripState(next);
      if (notify) {
        const dayLabel =
          dayIndices.length === 1
            ? `day ${dayIndices[0] + 1}`
            : `${dayIndices.length} days`;
        postSystemEvent(`You freed up ${dayLabel}.`);
      }
    },
    [tripStateRef, setTripState, postSystemEvent]
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
        postSystemEvent(`You set ${city?.name || 'a city'} to ${nights} nights.`);
      }
    },
    [tripStateRef, setTripState, postSystemEvent]
  );

  const setTripDates = useCallback(
    (partial = {}, { notify = true } = {}) => {
      if (!('startDate' in partial) && !('endDate' in partial)) return;
      const before = tripStateRef.current;
      const next = JSON.parse(JSON.stringify(before));
      if ('startDate' in partial) {
        next.dates.startDate = partial.startDate || null;
      }
      if ('endDate' in partial) {
        next.dates.endDate = partial.endDate || null;
      }
      const s = next.dates.startDate;
      const e = next.dates.endDate;
      if (s && e) {
        const sd = new Date(`${s}T00:00:00`);
        const ed = new Date(`${e}T00:00:00`);
        if (
          !Number.isNaN(sd.getTime()) &&
          !Number.isNaN(ed.getTime()) &&
          ed >= sd
        ) {
          const nights = Math.round((ed - sd) / (1000 * 60 * 60 * 24));
          if (nights > 0) next.dates.totalNights = nights;
        }
      }
      setTripState(next);
      if (notify && s && e) {
        const nights = next.dates.totalNights;
        postSystemEvent(
          `You set trip dates to ${s} through ${e}${nights != null ? ` (${nights} nights).` : '.'}`
        );
      }
    },
    [tripStateRef, setTripState, postSystemEvent]
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
      if (notify) postSystemEvent(`You added ${cleanName} to the route.`);
      return created;
    },
    [tripStateRef, setTripState, postSystemEvent]
  );

  return {
    assignDaysToCity,
    unassignDays,
    setCityNights,
    setTripDates,
    addCity,
  };
}
