'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, Loader2, MapPin, Moon, Send, Sunrise, Wand2, BedDouble } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseClient } from '@/lib/supabase/client';
import { getSupabaseAuthHeaders } from '@/lib/supabase/authHeaders';
import { createSSEBuffer, feedSSE, flushSSE } from '@/lib/conversation/sseParser';
import ConciergeWaitlist from '@/components/home/ConciergeWaitlist';
import OlivierMark from '@/app/itineraries/[tripId]/concierge/_components/OlivierMark';

const KIND_LABEL = {
  evening_brief: { label: 'Evening brief', icon: Moon },
  morning_wakeup: { label: 'Morning wake-up', icon: Sunrise },
  wind_down: { label: 'Wind-down', icon: Moon },
  reactive: { label: 'Heads up', icon: Wand2 },
  action: { label: 'Done', icon: Wand2 },
};

/** The day to feature: today's, else the next upcoming real day, else the first. */
function pickTodayCard(days, todayDayNumber) {
  const real = (days || []).filter((d) => !d.isTravelDay);
  if (!real.length) return null;
  const byNumber = todayDayNumber && real.find((d) => d.dayNumber === todayDayNumber);
  if (byNumber) return byNumber;
  const todayIso = new Date().toISOString().slice(0, 10);
  return real.find((d) => d.date && d.date >= todayIso) || real[0];
}

export default function TodayClient({ tripId }) {
  const { user, session } = useAuth();
  const authHeaders = useMemo(
    () => getSupabaseAuthHeaders(session, { 'Content-Type': 'application/json' }),
    [session]
  );

  const [status, setStatus] = useState('loading'); // loading | ready | gated | error
  const [bundle, setBundle] = useState(null); // { threadId, meta, days, todayDayNumber }
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [agentNote, setAgentNote] = useState(null); // "checking your day…"

  const seenIdsRef = useRef(new Set());
  const bottomRef = useRef(null);

  const appendMessage = useCallback((msg) => {
    if (msg.id) {
      if (seenIdsRef.current.has(msg.id)) return;
      seenIdsRef.current.add(msg.id);
    }
    setMessages((prev) => [...prev, msg]);
  }, []);

  // ── Bootstrap: context + thread history in one authenticated call ──
  const didInit = useRef(false);
  useEffect(() => {
    if (!session?.access_token || didInit.current) return;
    didInit.current = true;
    (async () => {
      try {
        const res = await fetch(`/api/trips/${tripId}/agent`, { headers: authHeaders });
        if (res.status === 403) {
          const data = await res.json().catch(() => ({}));
          setStatus(data?.code === 'not_invited' ? 'gated' : 'error');
          return;
        }
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        for (const m of data.messages || []) seenIdsRef.current.add(m.id);
        setBundle({ threadId: data.threadId, meta: data.meta, days: data.days, todayDayNumber: data.todayDayNumber });
        setMessages(data.messages || []);
        setStatus('ready');
      } catch (err) {
        console.error('[trip-home] bootstrap failed', err);
        setStatus('error');
      }
    })();
  }, [session, tripId, authHeaders]);

  // ── Realtime: beats and cross-device messages land live ──
  useEffect(() => {
    if (!bundle?.threadId) return undefined;
    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`thread-${bundle.threadId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'concierge_messages', filter: `thread_id=eq.${bundle.threadId}` },
        (payload) => {
          const m = payload.new;
          // Own user messages render optimistically; skip the echo.
          if (m.role === 'user') return;
          appendMessage(m);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [bundle?.threadId, appendMessage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [messages, agentNote]);

  // ── Send a turn: optimistic user bubble, SSE reply ──
  const send = useCallback(async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setDraft('');
    setSending(true);
    setAgentNote(null);
    appendMessage({ id: `local-${Date.now()}`, role: 'user', kind: 'chat', body: text, created_at: new Date().toISOString() });

    try {
      const res = await fetch(`/api/trips/${tripId}/agent`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok || !res.body) throw new Error(await res.text().catch(() => 'failed'));

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      const buf = createSSEBuffer();
      let replyText = '';
      const localId = `olivier-${Date.now()}`;

      const handle = (evt) => {
        if (evt.type === 'delta' && evt.text) {
          replyText = replyText ? `${replyText}\n\n${evt.text}` : evt.text;
          setAgentNote(null);
          setMessages((prev) => {
            const next = prev.filter((m) => m.id !== localId);
            return [...next, { id: localId, role: 'olivier', kind: 'chat', body: replyText, created_at: new Date().toISOString() }];
          });
        } else if (evt.type === 'tool_call') {
          setAgentNote('Checking the itinerary…');
        } else if (evt.type === 'done') {
          if (evt.messageId) seenIdsRef.current.add(evt.messageId);
        } else if (evt.type === 'error') {
          setAgentNote(null);
          appendMessage({ id: `err-${Date.now()}`, role: 'system', kind: 'system', body: evt.message || 'Something went wrong.', created_at: new Date().toISOString() });
        }
      };

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const evt of feedSSE(buf, decoder.decode(value, { stream: true }))) handle(evt);
      }
      for (const evt of flushSSE(buf)) handle(evt);
    } catch (err) {
      console.error('[trip-home] send failed', err);
      appendMessage({ id: `err-${Date.now()}`, role: 'system', kind: 'system', body: 'Couldn’t reach Olivier — try again in a moment.', created_at: new Date().toISOString() });
    } finally {
      setSending(false);
      setAgentNote(null);
    }
  }, [draft, sending, tripId, authHeaders, appendMessage]);

  // ── Signed-out / gated / loading shells ──
  if (!user) {
    return (
      <Shell tripId={tripId}>
        <p className="mt-16 text-center text-sm text-gray-500">Sign in to open your trip home.</p>
      </Shell>
    );
  }
  if (status === 'gated') {
    return (
      <Shell tripId={tripId}>
        <div className="mx-auto mt-12 max-w-md">
          <p className="mb-4 text-center text-sm font-medium text-gray-500">
            Olivier is in early access — grab a spot and we&apos;ll let you in soon.
          </p>
          <ConciergeWaitlist heading="Get early access" />
        </div>
      </Shell>
    );
  }
  if (status === 'error') {
    return (
      <Shell tripId={tripId}>
        <p className="mt-16 text-center text-sm text-gray-500">Couldn&apos;t open your trip home — try again in a moment.</p>
      </Shell>
    );
  }
  if (status === 'loading' || !bundle) {
    return (
      <Shell tripId={tripId}>
        <div className="mt-20 flex flex-col items-center gap-3">
          <OlivierMark size={44} />
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
        </div>
      </Shell>
    );
  }

  const today = pickTodayCard(bundle.days, bundle.todayDayNumber);

  return (
    <Shell tripId={tripId}>
      {/* ── Today card ── */}
      {today && (
        <section className="rounded-2xl border border-amber-100/70 bg-white p-5 shadow-sm">
          <div className="flex items-baseline justify-between gap-3">
            <h1 className="font-display text-xl font-bold text-gray-900">
              Day {today.dayNumber} · {today.cityName}
            </h1>
            {today.dateLabel && <span className="text-xs font-medium text-gray-400">{today.dateLabel}</span>}
          </div>
          {today.departBy && (
            <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700">
              <Clock className="h-3.5 w-3.5" /> Leave by {today.departBy}
            </p>
          )}
          {today.schedule?.length > 0 && (
            <ol className="mt-3 space-y-2">
              {today.schedule.map((s, i) => (
                <li key={i} className="flex items-baseline gap-3 text-sm">
                  <span className="w-11 shrink-0 font-semibold tabular-nums text-blue-600">{s.time || '—'}</span>
                  <span className="min-w-0 text-gray-800">
                    {s.name}
                    {s.neighborhood && <span className="text-gray-400"> · {s.neighborhood}</span>}
                  </span>
                </li>
              ))}
            </ol>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-gray-100 pt-3 text-xs text-gray-500">
            {today.hotelName && (
              <span className="inline-flex items-center gap-1"><BedDouble className="h-3.5 w-3.5 text-gray-400" /> {today.hotelName}</span>
            )}
            <Link href={`/itineraries/${tripId}`} className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline">
              <MapPin className="h-3.5 w-3.5" /> Full itinerary
            </Link>
          </div>
        </section>
      )}

      {/* ── Thread ── */}
      <section className="mt-6 flex-1 space-y-3 pb-4">
        {messages.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white/60 px-5 py-8 text-center text-sm text-gray-500">
            This is your line to Olivier. Ask anything about the trip — briefs land here too.
          </div>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        {agentNote && (
          <p className="flex items-center gap-2 pl-2 text-xs font-medium text-gray-400">
            <Loader2 className="h-3 w-3 animate-spin" /> {agentNote}
          </p>
        )}
        <div ref={bottomRef} />
      </section>

      {/* ── Composer ── */}
      <div className="sticky bottom-0 -mx-4 border-t border-gray-200/70 bg-[#faf8f3]/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex items-end gap-2"
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder="Message Olivier…"
            className="max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-[16px] text-gray-900 placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            aria-label="Send"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#1e63e9] text-white shadow-sm transition hover:bg-[#174fc2] disabled:opacity-40"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
      </div>
    </Shell>
  );
}

function Shell({ tripId, children }) {
  return (
    <div className="min-h-screen bg-[#faf8f3]">
      <div className="mx-auto flex min-h-screen max-w-xl flex-col px-4 pt-5">
        <Link
          href={`/itineraries/${tripId}/concierge`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 transition hover:text-gray-800"
        >
          <ArrowLeft className="h-4 w-4" /> Trip
        </Link>
        {children}
      </div>
    </div>
  );
}

function MessageBubble({ message: m }) {
  if (m.role === 'system') {
    return <p className="px-2 text-center text-xs text-amber-700">{m.body}</p>;
  }
  if (m.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-[#1e63e9] px-4 py-2.5 text-[15px] leading-relaxed text-white shadow-sm">
          {m.body}
        </div>
      </div>
    );
  }
  // Olivier: beats get a labeled card, chat gets a plain bubble.
  const beat = KIND_LABEL[m.kind];
  return (
    <div className="flex items-end gap-2">
      <OlivierMark size={26} className="mb-1 shrink-0" />
      <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-gray-200/80 bg-white px-4 py-2.5 shadow-sm">
        {beat && (
          <p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-blue-600">
            <beat.icon className="h-3 w-3" /> {beat.label}
            {m.day_number ? <span className="font-medium text-gray-400">· day {m.day_number}</span> : null}
          </p>
        )}
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-gray-800">{m.body}</p>
      </div>
    </div>
  );
}
