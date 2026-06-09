'use client';

import { motion, useReducedMotion } from 'framer-motion';

/**
 * Route template: re-mounts on every navigation into the itinerary, so it's the
 * clean place for an enter animation (no AnimatePresence/exit-timing pitfalls).
 * Matches the motion vocabulary of <ItineraryOverlay> so it feels native.
 */
export default function ItineraryTemplate({ children }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
