'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Scroll-spy for the itinerary day rail. Observes the day `<article id="day-N">`
 * elements and returns the id of the one currently anchored near the top of the
 * viewport, so the rail can show a live "you are here".
 *
 * The `rootMargin` shrinks the observer's viewport to a thin band in the upper
 * third (top inset 45%, bottom inset 50%): a day is "active" while its top edge
 * sits in that band — the standard scroll-spy recipe that avoids the whole-page
 * flicker you get from naive intersection ratios.
 *
 * @param {string[]} ids - element ids to track, in document order.
 * @returns {string|null} the active id, or null before the first intersection.
 */
export default function useScrollSpy(ids) {
  const [activeId, setActiveId] = useState(null);
  // Track per-id visibility so we can always pick the topmost visible one.
  const visible = useRef(new Map());
  const key = ids.join('|');

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined' || ids.length === 0) return;
    visible.current = new Map();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          visible.current.set(entry.target.id, entry.isIntersecting);
        }
        // Pick the first id (document order) that's currently in the band.
        const top = ids.find((id) => visible.current.get(id));
        if (top) setActiveId(top);
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 },
    );

    const els = ids
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    els.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
    // `key` re-runs the effect when the set of ids changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return activeId;
}
