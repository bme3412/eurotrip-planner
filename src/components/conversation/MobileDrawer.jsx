'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Map, ChevronUp } from 'lucide-react';

/**
 * MobileDrawer - Slide-up drawer for mobile map and trip summary
 */
export default function MobileDrawer({
  isOpen,
  onClose,
  children,
}) {
  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          />

          {/* Drawer */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 lg:hidden"
            style={{ maxHeight: '85vh' }}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-2 pb-1 bg-white rounded-t-2xl">
              <div className="w-10 h-1 bg-slate-300 rounded-full" />
            </div>

            {/* Close button */}
            <div className="absolute top-3 right-3">
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Content */}
            <div className="bg-white overflow-y-auto" style={{ maxHeight: 'calc(85vh - 40px)' }}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * MobileMapButton - Floating button to open the map drawer on mobile
 */
export function MobileMapButton({ onClick, tripHasCities }) {
  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.5, type: 'spring', stiffness: 300 }}
      onClick={onClick}
      className="fixed bottom-24 right-4 z-30 lg:hidden flex items-center gap-2 px-4 py-3 bg-white rounded-full shadow-lg border border-slate-200 hover:shadow-xl transition-shadow"
    >
      <Map className="w-5 h-5 text-blue-500" />
      <span className="text-sm font-medium text-slate-700">
        {tripHasCities ? 'View Trip' : 'Map'}
      </span>
      <ChevronUp className="w-4 h-4 text-slate-400" />
    </motion.button>
  );
}
