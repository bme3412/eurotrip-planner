"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "bestNow_cache_v1";
const CACHE_TTL_MS = 1000 * 60 * 60 * 6;

function todayPlus(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function readCache(key) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.key !== key) return null;
    if (Date.now() - parsed.savedAt > CACHE_TTL_MS) return null;
    return parsed.items;
  } catch {
    return null;
  }
}

function writeCache(key, items) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ key, items, savedAt: Date.now() })
    );
  } catch {}
}

/**
 * Fetches the top-scored cities for "the next 30 days" from /api/suggestions.
 * Shared between BestNowTicker and MiniResultsPreview so we only fetch once.
 *
 * @param {object} opts
 * @param {number} [opts.limit=5] - How many cities to return.
 * @param {number} [opts.windowDays=30] - Forward window for the score.
 * @param {Array}  [opts.initialItems] - Server-fetched items. When provided,
 *   the hook seeds state with these and skips the client fetch entirely.
 */
export function useBestNow({ limit = 5, windowDays = 30, initialItems = null } = {}) {
  const seeded = Array.isArray(initialItems) && initialItems.length > 0;
  const [items, setItems] = useState(seeded ? initialItems.slice(0, limit) : null);
  const [loading, setLoading] = useState(!seeded);
  const [error, setError] = useState(null);
  const [dates] = useState(() => ({ start: todayPlus(0), end: todayPlus(windowDays) }));

  useEffect(() => {
    // Already have server-provided items — no need to fetch.
    if (seeded) return;

    const cacheKey = `${windowDays}-${limit}`;
    const cached = readCache(cacheKey);
    if (cached && cached.length > 0) {
      setItems(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;

    fetch("/api/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dates,
        v: 4,
        flat: true,
        limit: Math.max(limit, 5),
      }),
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        const top = (data.items ?? []).slice(0, limit);
        if (top.length === 0) {
          console.warn("[useBestNow] API returned empty items");
        }
        setItems(top);
        writeCache(cacheKey, top);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        console.error("[useBestNow] fetch error:", e);
        setError(e);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [limit, windowDays, dates, seeded]);

  return { items, loading, error, dates };
}
