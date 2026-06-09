'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseAuthHeaders } from '@/lib/supabase/authHeaders';

export default function ShareButton({ tripId, cityName }) {
  const { session } = useAuth();
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState(null);

  async function handleShare() {
    if (!session?.access_token) {
      setError('Sign in to share');
      setTimeout(() => setError(null), 2500);
      return;
    }

    setSharing(true);
    setError(null);

    let shareToken = null;
    try {
      const res = await fetch(`/api/trips/${tripId}`, {
        method: 'PUT',
        headers: getSupabaseAuthHeaders(session, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ is_public: true }),
      });
      if (!res.ok) throw new Error('Could not enable sharing');
      const trip = await res.json();
      shareToken = trip.share_token;
    } catch {
      setError('Share failed');
      setSharing(false);
      setTimeout(() => setError(null), 2500);
      return;
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = shareToken
      ? `${origin}/trips/${tripId}?share=${encodeURIComponent(shareToken)}`
      : `${origin}/trips/${tripId}`;

    const shareData = {
      title: `My ${cityName} Trip — EuroTrip Planner`,
      text: `Check out my ${cityName} itinerary!`,
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        setSharing(false);
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
      setError('Copy failed');
      setTimeout(() => setError(null), 2500);
    } finally {
      setSharing(false);
    }
  }

  const label = error || (sharing ? 'Sharing…' : copied ? '✓ Copied' : 'Share');

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={sharing}
      className="inline-flex items-center justify-center gap-2 rounded-full border border-zinc-700 bg-transparent px-3.5 py-1.5 text-xs font-semibold text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-200 disabled:opacity-50"
    >
      {label}
    </button>
  );
}
