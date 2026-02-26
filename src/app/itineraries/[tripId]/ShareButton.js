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
      className="inline-flex items-center justify-center gap-2 rounded-full border border-indigo-100 bg-white px-4 py-2 text-sm font-semibold text-indigo-600 transition hover:border-indigo-300 hover:text-indigo-700"
    >
      {copied ? '✓ Copied!' : '🔗 Share'}
    </button>
  );
}
