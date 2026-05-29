"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * useShortlist
 *
 * Phase 5 (lovely-baking-piglet.md): a tiny, localStorage-only hook
 * that powers the Explore-page shortlist tray. It deliberately mirrors
 * the shape of `useWishlist` so the API feels familiar, but it stays
 * fully local — no auth, no Supabase, no wishlist sync. The shortlist
 * is the "jump-start planning" bridge: pick a few cities on the map,
 * hit the tray, land on /plan?cities=a,b,c.
 *
 * Items are stored as `{ id, title, country }`. We dedupe by id (or by
 * lower-cased title when id is missing). Order is insertion order.
 */
const STORAGE_KEY = "explore.shortlist.v1";
const MAX_ITEMS = 12;

function readStored() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Defensive shape filter.
    return parsed
      .filter((it) => it && typeof it === "object")
      .map((it) => ({
        id: it.id || null,
        title: it.title || "",
        country: it.country || "",
      }))
      .filter((it) => it.id || it.title);
  } catch {
    return [];
  }
}

function writeStored(items) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* ignore quota / private mode */
  }
}

function itemKey(city) {
  return city.id || (city.title || "").toLowerCase();
}

export default function useShortlist() {
  const [items, setItems] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from storage on mount. We intentionally avoid lazy-init in
  // useState so SSR markup stays consistent — the first client paint
  // shows an empty tray, then snaps to the stored value.
  useEffect(() => {
    setItems(readStored());
    setHydrated(true);
  }, []);

  // Cross-tab sync: if another tab edits the same key, update locally.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (event) => {
      if (event.key !== STORAGE_KEY) return;
      setItems(readStored());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const persist = useCallback((next) => {
    writeStored(next);
    return next;
  }, []);

  const add = useCallback(
    (city) => {
      if (!city) return false;
      const key = itemKey(city);
      if (!key) return false;
      let added = false;
      setItems((prev) => {
        if (prev.length >= MAX_ITEMS) return prev;
        if (prev.some((it) => itemKey(it) === key)) return prev;
        added = true;
        return persist([
          ...prev,
          {
            id: city.id || null,
            title: city.title || "",
            country: city.country || "",
          },
        ]);
      });
      return added;
    },
    [persist]
  );

  const remove = useCallback(
    (city) => {
      const key = itemKey(city);
      if (!key) return;
      setItems((prev) => persist(prev.filter((it) => itemKey(it) !== key)));
    },
    [persist]
  );

  const clear = useCallback(() => {
    setItems(persist([]));
  }, [persist]);

  const has = useCallback(
    (city) => {
      const key = itemKey(city);
      if (!key) return false;
      return items.some((it) => itemKey(it) === key);
    },
    [items]
  );

  return {
    items,
    count: items.length,
    isFull: items.length >= MAX_ITEMS,
    max: MAX_ITEMS,
    hydrated,
    add,
    remove,
    clear,
    has,
  };
}
