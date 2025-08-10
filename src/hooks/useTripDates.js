"use client";
import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "tripDates";

export function serializeDates(dates) {
  if (!dates || !dates.mode) return "";
  const p = new URLSearchParams();
  p.set("mode", dates.mode);
  if (dates.start) p.set("start", dates.start);
  if (dates.end) p.set("end", dates.end);
  if (dates.month) p.set("month", dates.month);
  return p.toString();
}

export function parseDatesFromParams(searchParams) {
  const mode = searchParams.get("mode");
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const month = searchParams.get("month");
  if (!mode) return null;
  if (mode === "month" && month) return { mode, month };
  if ((mode === "exact" || mode === "range") && (start || end)) return { mode, start, end };
  return null;
}

export function useTripDates(initialValue = null) {
  const [dates, setDates] = useState(initialValue);

  // Load from localStorage on mount
  useEffect(() => {
    if (dates != null) return; // do not overwrite if provided
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
      if (raw) setDates(JSON.parse(raw));
    } catch {}
  }, []);

  // Persist to localStorage
  useEffect(() => {
    try {
      if (dates) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(dates));
    } catch {}
  }, [dates]);

  const toQuery = useCallback(() => serializeDates(dates), [dates]);

  return useMemo(() => ({ dates, setDates, toQuery }), [dates, setDates, toQuery]);
}


