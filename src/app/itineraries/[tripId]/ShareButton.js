'use client';

import { useState } from 'react';

export default function ShareButton({ tripId, cityName }) {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/trips/${tripId}`;

  async function handleShare() {
    const shareData = {
      title: `My ${cityName} Trip — EuroTrip Planner`,
      text: `Check out my ${cityName} itinerary!`,
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // User cancelled or share failed — fall through to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard failed silently
    }
  }

  return (
    <button
      onClick={handleShare}
      className="inline-flex items-center justify-center gap-2 rounded-full border border-zinc-700 bg-transparent px-3.5 py-1.5 text-xs font-semibold text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-200"
    >
      {copied ? '✓ Copied' : 'Share'}
    </button>
  );
}
