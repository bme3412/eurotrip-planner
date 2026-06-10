'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Bell, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseClient } from '@/lib/supabase/client';

/**
 * Live concierge inbox in the navbar. Reads the user's recent notifications (RLS
 * scopes to them) and subscribes to Supabase Realtime so new ones arrive without a
 * refresh — the "responsive" piece. Renders nothing for signed-out users.
 */
function timeAgo(iso) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const s = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function ConciergeBell() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const unread = items.filter((n) => !n.read_at).length;

  // Load + subscribe.
  useEffect(() => {
    if (!user?.id) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    let active = true;

    (async () => {
      const { data } = await supabase
        .from('concierge_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (active && data) setItems(data);
    })();

    const channel = supabase
      .channel(`concierge-notifs-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'concierge_notifications', filter: `user_id=eq.${user.id}` },
        (payload) => setItems((prev) => [payload.new, ...prev.filter((n) => n.id !== payload.new.id)])
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const markRead = useCallback(async (id) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
    const supabase = getSupabaseClient();
    await supabase?.from('concierge_notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
  }, []);

  if (!user?.id) return null;

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Travel agent notifications${unread ? `, ${unread} unread` : ''}`}
        className="relative flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
            <span className="text-xs font-bold uppercase tracking-widest text-gray-400">From Olivier</span>
            {unread > 0 && <span className="text-[11px] font-medium text-blue-600">{unread} new</span>}
          </div>

          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">
              Nothing yet. Turn on Olivier from a trip&apos;s travel agent page.
            </div>
          ) : (
            <ul className="max-h-96 divide-y divide-gray-50 overflow-y-auto">
              {items.map((n) => {
                const href = n.trip_id ? `/itineraries/${n.trip_id}/concierge` : null;
                const inner = (
                  <div className={`px-4 py-3 transition hover:bg-gray-50 ${n.read_at ? '' : 'bg-blue-50/40'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900">{n.title || 'Olivier'}</p>
                      <span className="shrink-0 text-[10px] text-gray-400">{timeAgo(n.created_at)}</span>
                    </div>
                    <p className="mt-0.5 text-sm leading-snug text-gray-600">{n.body}</p>
                  </div>
                );
                return (
                  <li key={n.id} onClick={() => markRead(n.id)}>
                    {href ? <Link href={href} onClick={() => setOpen(false)}>{inner}</Link> : inner}
                  </li>
                );
              })}
            </ul>
          )}

          {unread > 0 && (
            <button
              type="button"
              onClick={() => items.forEach((n) => !n.read_at && markRead(n.id))}
              className="flex w-full items-center justify-center gap-1.5 border-t border-gray-100 py-2.5 text-xs font-semibold text-gray-500 transition hover:bg-gray-50 hover:text-gray-800"
            >
              <Check className="h-3.5 w-3.5" /> Mark all read
            </button>
          )}
        </div>
      )}
    </div>
  );
}
