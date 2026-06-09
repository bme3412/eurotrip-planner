'use client';

import { useEffect, useState } from 'react';
import { Bell, Loader2, Check, ArrowUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseClient } from '@/lib/supabase/client';
import { getSupabaseAuthHeaders } from '@/lib/supabase/authHeaders';
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

  useEffect(() => {
    if (!user?.id) return;
    const supabase = getSupabaseClient();
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('concierge_preferences')
        .select('enabled')
        .eq('user_id', user.id)
        .maybeSingle();
      if (active && data) setEnabled(!!data.enabled);
    })();
    return () => { active = false; };
  }, [user?.id]);

  const toggle = async () => {
    if (!user?.id || saving) return;
    const next = !enabled;
    setEnabled(next);
    setSaving(true);
    try {
      const supabase = getSupabaseClient();
      await supabase.from('concierge_preferences').upsert(
        { user_id: user.id, user_email: user.email, enabled: next, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
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
      <p className="mt-3 text-xs text-gray-400">
        Preview today; once the scheduler ships he&apos;ll send these on his own, in your timezone.
      </p>
    </div>
  );
}
