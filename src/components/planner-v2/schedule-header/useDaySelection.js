'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * Local hook for the schedule strip's day selection state.
 *
 * - Click toggles a single day.
 * - Shift-click extends a contiguous range from the last clicked anchor.
 * - Escape clears.
 *
 * Selection is just an array of day indices; the consumer decides what
 * "assign to city" means.
 */
export function useDaySelection({ totalDays = 0 } = {}) {
  const [selected, setSelected] = useState(() => new Set());
  const [anchor, setAnchor] = useState(null);

  // Reset selection if the trip window shrinks below current selection.
  useEffect(() => {
    setSelected((prev) => {
      const filtered = new Set();
      for (const idx of prev) if (idx < totalDays) filtered.add(idx);
      return filtered.size === prev.size ? prev : filtered;
    });
  }, [totalDays]);

  // Esc clears selection.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setSelected(new Set());
        setAnchor(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const clear = useCallback(() => {
    setSelected(new Set());
    setAnchor(null);
  }, []);

  const toggle = useCallback((dayIndex, { shift = false } = {}) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (shift && anchor != null) {
        const lo = Math.min(anchor, dayIndex);
        const hi = Math.max(anchor, dayIndex);
        for (let i = lo; i <= hi; i += 1) next.add(i);
      } else if (next.has(dayIndex)) {
        next.delete(dayIndex);
      } else {
        next.add(dayIndex);
      }
      return next;
    });
    if (!shift) setAnchor(dayIndex);
  }, [anchor]);

  const indices = useMemo(() => {
    const arr = [...selected];
    arr.sort((a, b) => a - b);
    return arr;
  }, [selected]);

  return {
    selectedSet: selected,
    selectedIndices: indices,
    selectionCount: selected.size,
    toggle,
    clear,
  };
}
