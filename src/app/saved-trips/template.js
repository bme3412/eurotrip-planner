'use client';

import { motion, useReducedMotion } from 'framer-motion';

/**
 * Route template for My Trips — gives the same enter animation as the itinerary
 * page, so navigating back and forth between the two feels continuous rather
 * than a hard cut.
 */
export default function SavedTripsTemplate({ children }) {
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
