'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Infinite-scroll pagination for a long list.
 *
 * Watches `containerRef.current.getBoundingClientRect().bottom` against the
 * viewport; when within `threshold` px of the bottom, bumps `visibleCount`
 * by `step` (clamped to `total`). Resets to `initial` when `total` changes.
 *
 * @param {object}  opts
 * @param {number}  opts.total      total item count
 * @param {number} [opts.initial=100] initial visible items
 * @param {number} [opts.step=24]     items added per scroll trigger
 * @param {number} [opts.threshold=800] px from bottom to trigger
 */
export function usePagination({ total, initial = 100, step = 24, threshold = 800 }) {
  const [visibleCount, setVisibleCount] = useState(initial);
  const containerRef = useRef(null);

  useEffect(() => {
    const onScroll = () => {
      const el = containerRef.current;
      if (!el) return;
      if (el.getBoundingClientRect().bottom < window.innerHeight + threshold) {
        setVisibleCount((n) => Math.min(n + step, total));
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [total, step, threshold]);

  useEffect(() => {
    setVisibleCount(initial);
  }, [total, initial]);

  return { visibleCount, containerRef };
}
