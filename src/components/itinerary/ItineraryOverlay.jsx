'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { X, ExternalLink, Pencil } from 'lucide-react';
import ItineraryView from './ItineraryView';

/**
 * Full-screen overlay that renders the rich generated itinerary right after the
 * planner finishes — so the user sees the polished view immediately instead of a
 * cramped inline preview. Escape / backdrop-button close; scroll locked.
 */
export default function ItineraryOverlay({ itinerary, trip, savedTripId, onClose, onKeepEditing }) {
  const closeRef = useRef(null);

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

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-[#0c0c0e]">
      {/* Sticky action bar */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-zinc-800 bg-[#0c0c0e]/90 px-4 py-2.5 backdrop-blur">
        <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-zinc-400">Your itinerary</span>
        <div className="ml-auto flex items-center gap-2">
          {savedTripId && (
            <Link
              href={`/itineraries/${savedTripId}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#c9963c] px-4 py-1.5 text-xs font-semibold text-black transition hover:opacity-90"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Open full page
            </Link>
          )}
          {onKeepEditing && (
            <button
              type="button"
              onClick={onKeepEditing}
              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 px-4 py-1.5 text-xs font-semibold text-zinc-300 transition hover:bg-zinc-800"
            >
              <Pencil className="h-3.5 w-3.5" /> Keep editing
            </button>
          )}
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700 text-zinc-300 transition hover:bg-zinc-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <ItineraryView itinerary={itinerary} theme="dark" showPhotos />
    </div>
  );
}
