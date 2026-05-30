'use client';

import { useState } from 'react';
import { Share2, Printer, Check } from 'lucide-react';

/**
 * ShareGuideButton — share + print controls for the city-guide header.
 *
 * Share uses navigator.share() with a clipboard fallback (cloned from
 * itineraries/[tripId]/ShareButton.js). It reads window.location.href at click
 * time, so it always shares the CURRENT deep-linked tab (see tabUrl.js).
 *
 * Styled light-on-dark to read against the header's dark gradient. Both
 * buttons are print:hidden so they never appear in the printout.
 */
export default function ShareGuideButton({ title = 'Travel guide', onPrint }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const shareData = {
      title: `${title} — EuroTrip Planner`,
      text: `Check out this ${title}`,
      url,
    };

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // User cancelled or share failed — fall through to clipboard.
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — fail silently.
    }
  }

  const btn =
    'inline-flex items-center justify-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20 print:hidden';

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={handleShare} className={btn} aria-label="Share this guide">
        {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Share2 className="h-3.5 w-3.5" aria-hidden />}
        {copied ? 'Copied' : 'Share'}
      </button>
      {onPrint && (
        <button type="button" onClick={onPrint} className={btn} aria-label="Print this guide">
          <Printer className="h-3.5 w-3.5" aria-hidden />
          <span className="hidden sm:inline">Print</span>
        </button>
      )}
    </div>
  );
}
