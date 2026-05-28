'use client';

import { useEffect } from 'react';

/**
 * Bridge selected planner setters up to a parent (e.g. the page shell that
 * renders the top-bar Day Strip popover) without lifting the whole agent
 * state.
 *
 * Each `register*` prop, if provided, is called with the setter on mount /
 * setter-identity change and with `null` on unmount.
 */
export function useRegisterPlannerHandles({
  registerSetCityNights,
  setCityNights,
  registerSetTripDates,
  setTripDates,
  registerSetCityAccommodation,
  setCityAccommodation,
  registerApplyTripState,
  setTripState,
}) {
  useEffect(() => {
    if (!registerSetCityNights) return;
    registerSetCityNights(setCityNights);
    return () => registerSetCityNights(null);
  }, [registerSetCityNights, setCityNights]);

  useEffect(() => {
    if (!registerSetTripDates) return;
    registerSetTripDates(setTripDates);
    return () => registerSetTripDates(null);
  }, [registerSetTripDates, setTripDates]);

  useEffect(() => {
    if (!registerSetCityAccommodation) return;
    registerSetCityAccommodation(setCityAccommodation);
    return () => registerSetCityAccommodation(null);
  }, [registerSetCityAccommodation, setCityAccommodation]);

  useEffect(() => {
    if (!registerApplyTripState) return;
    registerApplyTripState(setTripState);
    return () => registerApplyTripState(null);
  }, [registerApplyTripState, setTripState]);
}
