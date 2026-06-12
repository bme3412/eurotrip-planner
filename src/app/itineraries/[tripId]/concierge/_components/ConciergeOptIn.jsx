'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, BellRing, Loader2, Check, ArrowUp, Share, SquarePlus, MonitorDown, MessageCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseClient } from '@/lib/supabase/client';
import { getSupabaseAuthHeaders } from '@/lib/supabase/authHeaders';
import { subscribeToPush, pushAvailability } from '@/lib/concierge/pushClient';
import ConciergeWaitlist from '@/components/home/ConciergeWaitlist';
import OlivierMark from './OlivierMark';

/**
 * Signed-in control to turn the concierge ON and fire a real notification now —
 * the working end of the loop. Toggling writes concierge_preferences (RLS);
 * "Send tonight's brief" posts to /api/concierge/send-now, which generates a brief
 * and inserts a notification that lands live in the navbar bell.
 */
export default function ConciergeOptIn({ tripId }) {
  const { user, session } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [pushState, setPushState] = useState('idle'); // idle | on | denied | unsupported | needs_install | working
  const [invite, setInvite] = useState('loading'); // loading | invited | waitlist
  const [installPrompt, setInstallPrompt] = useState(null); // captured beforeinstallprompt (Chrome/Android)

  // Capture Chrome's install prompt so "get it on your phone" is one tap
  // instead of a buried browser menu.
  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  // Closed beta: ask the server whether this account is in. The check is
  // advisory for the UI — sends are gated server-side regardless.
  useEffect(() => {
    if (!session) return;
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/concierge/invite-status', {
          headers: getSupabaseAuthHeaders(session),
        });
        const data = res.ok ? await res.json() : { invited: false };
        if (active) setInvite(data.invited ? 'invited' : 'waitlist');
      } catch {
        if (active) setInvite('waitlist');
      }
    })();
    return () => { active = false; };
  }, [session]);

  useEffect(() => {
    if (!user?.id) return;
    const supabase = getSupabaseClient();
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('concierge_preferences')
        .select('enabled, push_enabled')
        .eq('user_id', user.id)
        .maybeSingle();
      if (active && data) {
        setEnabled(!!data.enabled);
        if (data.push_enabled) setPushState('on');
      }
    })();
    const availability = pushAvailability();
    if (availability === 'needs_install_ios') setPushState('needs_install');
    else if (availability === 'unsupported') setPushState('unsupported');
    return () => { active = false; };
  }, [user?.id]);

  const promptInstall = async () => {
    if (!installPrompt) return;
    try {
      installPrompt.prompt();
      await installPrompt.userChoice;
    } finally {
      setInstallPrompt(null);
    }
  };

  const savePrefs = async (patch) => {
    const supabase = getSupabaseClient();
    await supabase.from('concierge_preferences').upsert(
      { user_id: user.id, user_email: user.email, updated_at: new Date().toISOString(), ...patch },
      { onConflict: 'user_id' }
    );
  };

  const toggle = async () => {
    if (!user?.id || saving) return;
    const next = !enabled;
    setEnabled(next);
    setSaving(true);
    try {
      // Enabling Olivier opts into the daily briefs, email included (your own
      // trip only). Disabling turns email off too.
      await savePrefs({ enabled: next, email_enabled: next });
      // On enable, also try to light up push on this device (best-effort).
      if (next && pushState !== 'on' && pushState !== 'unsupported' && pushState !== 'needs_install') {
        setPushState('working');
        const headers = getSupabaseAuthHeaders(session, { 'Content-Type': 'application/json' });
        const r = await subscribeToPush(headers);
        setPushState(r.ok ? 'on' : r.reason === 'denied' ? 'denied' : r.reason === 'unsupported' ? 'unsupported' : 'idle');
        if (r.ok) await savePrefs({ push_enabled: true });
      }
    } catch {
      setEnabled(!next); // revert on failure
    } finally {
      setSaving(false);
    }
  };

  const sendNow = async () => {
    if (sending) return;
    setSending(true);
    setSent(false);
    try {
      const res = await fetch('/api/concierge/send-now', {
        method: 'POST',
        headers: getSupabaseAuthHeaders(session, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ tripId }),
      });
      if (res.ok) setSent(true);
    } catch {
      /* swallow — button just won't confirm */
    } finally {
      setSending(false);
    }
  };

  if (!user?.id) return null;

  if (invite === 'loading') return null;

  if (invite === 'waitlist') {
    return (
      <div>
        <p className="mb-4 text-center text-sm font-medium text-gray-500">
          Olivier is in early access — grab a spot and we&apos;ll let you in soon.
        </p>
        <ConciergeWaitlist heading="Get early access" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-100/70 bg-[#faf7f1] p-6 shadow-sm md:p-7">
      <div className="flex items-center gap-3">
        <OlivierMark size={40} />
        <div className="min-w-0">
          <p className="font-bold text-gray-900">Turn on Olivier for this trip</p>
          <p className="text-sm text-gray-500">He&apos;ll start checking in. You can stop anytime.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={toggle}
          className={`ml-auto inline-flex h-7 w-12 shrink-0 items-center rounded-full px-0.5 transition ${enabled ? 'bg-blue-600' : 'bg-gray-300'}`}
        >
          <span className={`h-6 w-6 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-5' : ''}`} />
        </button>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Link
          href={`/trips/${tripId}/today`}
          className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-5 py-2.5 text-sm font-bold text-blue-700 shadow-sm transition hover:border-blue-300"
        >
          <MessageCircle className="h-4 w-4" /> Open Trip Home
        </Link>
        <button
          type="button"
          onClick={sendNow}
          disabled={sending}
          className="inline-flex items-center gap-2 rounded-full bg-[#1e63e9] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#174fc2] disabled:opacity-50"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
          {sending ? 'Olivier is writing…' : 'Send tonight’s brief now'}
        </button>
        {sent && (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
            <Check className="h-4 w-4" /> Sent — check the bell <ArrowUp className="h-3.5 w-3.5" />
          </span>
        )}
      </div>

      {enabled && (
        <div className="mt-3 text-xs font-medium">
          {pushState === 'on' ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-700"><BellRing className="h-3.5 w-3.5" /> Push on for this device</span>
          ) : pushState === 'working' ? (
            <span className="inline-flex items-center gap-1.5 text-gray-500"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Enabling push…</span>
          ) : pushState === 'denied' ? (
            <span className="text-gray-400">Push blocked in your browser — in-app + email still work.</span>
          ) : pushState === 'needs_install' ? (
            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-gray-600">
              <p className="font-semibold text-gray-800">Want Olivier on your lock screen?</p>
              <p className="mt-1 leading-relaxed">
                Add EuroTrip to your Home Screen first: tap{' '}
                <Share className="inline h-3.5 w-3.5 align-[-2px] text-blue-600" aria-label="Share" /> Share, then{' '}
                <SquarePlus className="inline h-3.5 w-3.5 align-[-2px] text-blue-600" aria-label="Add to Home Screen" />{' '}
                <span className="font-semibold">Add to Home Screen</span>. Open it from there and flip this
                toggle again — until then the brief still lands in the bell and your email.
              </p>
            </div>
          ) : pushState === 'unsupported' ? (
            <span className="text-gray-400">This browser doesn&apos;t support push — in-app + email still work.</span>
          ) : (
            <button type="button" onClick={toggle} className="text-blue-600 hover:underline">Enable push on this device</button>
          )}
          {installPrompt && pushState !== 'needs_install' && (
            <button
              type="button"
              onClick={promptInstall}
              className="mt-2 inline-flex items-center gap-1.5 text-blue-600 hover:underline"
            >
              <MonitorDown className="h-3.5 w-3.5" /> Install the EuroTrip app on this device
            </button>
          )}
        </div>
      )}

      <p className="mt-3 text-xs text-gray-400">
        You&apos;ll get the evening brief in the bell and by email; turn on push for your phone too.
        He sends on his own at the right local time once scheduling is live for your account.
      </p>
    </div>
  );
}
