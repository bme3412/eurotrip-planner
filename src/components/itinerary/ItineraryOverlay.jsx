'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { X, ExternalLink, Pencil, Wand2, Sparkles } from 'lucide-react';
import ItineraryView from './ItineraryView';
import EditPanel from './EditPanel';
import SignInNudge from '@/components/common/SignInNudge';

/**
 * Full-screen overlay that renders the rich generated itinerary right after the
 * planner finishes — so the user sees the polished view immediately instead of a
 * cramped inline preview. Escape / backdrop-button close; scroll locked.
 *
 * "Edit activities" opens the existing swap agent (EditPanel) in place. That
 * agent operates on persisted trip_activities, so it requires a saved trip;
 * signed-out users get a sign-in nudge instead.
 */
export default function ItineraryOverlay({
  itinerary,
  trip,
  savedTripId,
  citySlug,
  cityDisplay,
  onActivityUpdate,
  onClose,
  onKeepEditing,
}) {
  const closeRef = useRef(null);
  const [editOpen, setEditOpen] = useState(false);
  const [nudge, setNudge] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  if (!itinerary) return null;

  const handleEditClick = () => {
    if (savedTripId) setEditOpen(true);
    else setNudge(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="fixed inset-0 z-[60] overflow-y-auto bg-[#fafaf7]"
    >
      {/* Sticky action bar */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-zinc-200 bg-white/90 px-4 py-2.5 backdrop-blur">
        <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-zinc-500">Your itinerary</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={handleEditClick}
            className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300 px-4 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100"
          >
            <Wand2 className="h-3.5 w-3.5" /> Edit activities
          </button>
          {savedTripId && (
            <Link
              href={`/itineraries/${savedTripId}/concierge`}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#1e63e9]/30 bg-[#1e63e9]/5 px-4 py-1.5 text-xs font-semibold text-[#1e63e9] transition hover:bg-[#1e63e9]/10"
            >
              <Sparkles className="h-3.5 w-3.5" /> Travel agent
            </Link>
          )}
          {savedTripId && (
            <Link
              href={`/itineraries/${savedTripId}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#1e63e9] px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#174fc2]"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Open full page
            </Link>
          )}
          {onKeepEditing && (
            <button
              type="button"
              onClick={onKeepEditing}
              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300 px-4 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100"
            >
              <Pencil className="h-3.5 w-3.5" /> Keep editing
            </button>
          )}
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-300 text-zinc-600 transition hover:bg-zinc-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <ItineraryView itinerary={itinerary} showPhotos />

      {/* Inline activity-swap agent (saved trips only). EditPanel's own fixed
          z-index sits above this overlay. */}
      {editOpen && savedTripId && (
        <EditPanel
          open={editOpen}
          onClose={() => setEditOpen(false)}
          tripId={savedTripId}
          citySlug={citySlug}
          cityDisplay={cityDisplay}
          plan={itinerary}
          onActivityUpdate={onActivityUpdate}
        />
      )}

      {nudge && (
        <SignInNudge
          message="Sign in to edit activities — it saves changes to your trip."
          onClose={() => setNudge(false)}
        />
      )}
    </motion.div>
  );
}
