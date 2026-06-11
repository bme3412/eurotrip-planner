'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, ChevronRight, Clock, Loader2, MapPin, Moon, Send, Sunrise, Wand2, BedDouble, SendHorizonal, X } from 'lucide-react';
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
  hours_alert: { label: 'Opening hours', icon: Clock },
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
  // The in-flight turn's working trace — Olivier's thinking streams in, tool
  // chips resolve, then the reply streams below. Replaces the old spinner note.
  const [liveTurn, setLiveTurn] = useState(null); // { thinking, tools: [{name,label,ok,summary}], reply }

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
        setBundle({
          threadId: data.threadId,
          meta: data.meta,
          days: data.days,
          todayDayNumber: data.todayDayNumber,
          telegramLinked: !!data.telegramLinked,
        });
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

  // Sticky-bottom autoscroll: follow the stream only while the user is already
  // at (or near) the bottom — scrolling up to re-read pins their position.
  // While streaming, follow instantly; smooth animations re-triggered per
  // chunk fight each other and read as the page "jumping around".
  const stickToBottomRef = useRef(true);
  useEffect(() => {
    const onScroll = () => {
      const el = document.scrollingElement;
      if (!el) return;
      stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!stickToBottomRef.current) return;
    bottomRef.current?.scrollIntoView({ block: 'end', behavior: liveTurn ? 'auto' : 'smooth' });
  }, [messages, liveTurn]);

  /**
   * Stream one agent run (chat turn or nightly round) and drive the live
   * working trace. A local mutable turn object is snapshotted into state
   * after each event so the bubble re-renders without setState-updater
   * side effects.
   */
  const streamAgent = useCallback(
    async (payload) => {
      const turn = { thinking: '', tools: [], reply: '' };
      // Throttle snapshots: token deltas arrive far faster than the eye reads;
      // re-rendering per token saturates the main thread and makes the stream
      // feel janky. ~12fps is plenty for streaming text.
      let syncTimer = null;
      const snapshot = () =>
        setLiveTurn({ thinking: turn.thinking, tools: turn.tools.map((t) => ({ ...t })), reply: turn.reply });
      const sync = () => {
        if (syncTimer) return;
        syncTimer = setTimeout(() => {
          syncTimer = null;
          snapshot();
        }, 80);
      };
      const settle = () => {
        if (syncTimer) clearTimeout(syncTimer);
        syncTimer = null;
        setLiveTurn(null);
      };
      snapshot();

      try {
        const res = await fetch(`/api/trips/${tripId}/agent`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify(payload),
        });
        if (!res.ok || !res.body) throw new Error(await res.text().catch(() => 'failed'));

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        const buf = createSSEBuffer();

        const handle = (evt) => {
          if (evt.type === 'thinking' && evt.text) {
            turn.thinking += evt.text;
            sync();
          } else if (evt.type === 'delta' && evt.text) {
            turn.reply += evt.text;
            sync();
          } else if (evt.type === 'tool_call') {
            turn.tools.push({ name: evt.name, label: evt.label || evt.name, ok: null, summary: null });
            sync();
          } else if (evt.type === 'tool_result') {
            for (let i = turn.tools.length - 1; i >= 0; i -= 1) {
              if (turn.tools[i].name === evt.name && turn.tools[i].ok === null) {
                turn.tools[i].ok = evt.ok !== false;
                turn.tools[i].summary = evt.summary || null;
                break;
              }
            }
            sync();
          } else if (evt.type === 'done') {
            const meta = {
              ...(evt.proposal ? { proposal: evt.proposal } : {}),
              ...(evt.trace ? { trace: evt.trace } : {}),
            };
            if (evt.beat) {
              // Nightly round → an evening_brief beat. It may already be in
              // the list via realtime INSERT (or a re-run refreshing an old
              // row) — update in place, else append.
              if (evt.messageId) seenIdsRef.current.add(evt.messageId);
              const msg = {
                id: evt.messageId || `beat-${Date.now()}`,
                role: 'olivier',
                kind: evt.beat.kind,
                day_number: evt.beat.dayNumber,
                body: evt.beat.body,
                created_at: new Date().toISOString(),
                meta: { ...meta, cityName: evt.beat.cityName, dateLabel: evt.beat.dateLabel },
              };
              setMessages((prev) => {
                const i = prev.findIndex((m) => m.id === msg.id);
                if (i >= 0) {
                  const next = [...prev];
                  next[i] = { ...next[i], ...msg };
                  return next;
                }
                return [...prev, msg];
              });
            } else {
              const body = turn.reply.trim();
              if (body) {
                // appendMessage records the id in seenIds itself — do NOT
                // pre-add it here or the append dedupes against itself and
                // the reply vanishes when the live bubble clears.
                appendMessage({
                  id: evt.messageId || `olivier-${Date.now()}`,
                  role: 'olivier',
                  kind: 'chat',
                  body,
                  created_at: new Date().toISOString(),
                  meta,
                });
              }
            }
            settle();
          } else if (evt.type === 'error') {
            settle();
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
        console.error('[trip-home] agent stream failed', err);
        appendMessage({ id: `err-${Date.now()}`, role: 'system', kind: 'system', body: 'Couldn’t reach Olivier — try again in a moment.', created_at: new Date().toISOString() });
      } finally {
        setSending(false);
        settle();
      }
    },
    [tripId, authHeaders, appendMessage]
  );

  // ── Send a turn: optimistic user bubble, live working trace, SSE reply ──
  const send = useCallback(async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setDraft('');
    setSending(true);
    appendMessage({ id: `local-${Date.now()}`, role: 'user', kind: 'chat', body: text, created_at: new Date().toISOString() });
    await streamAgent({ message: text });
  }, [draft, sending, appendMessage, streamAgent]);

  // ── Run Olivier's evening rounds now — the dry-run button. Same live
  //    trace as a chat turn; the resulting brief lands in the thread. ──
  const previewBrief = useCallback(async () => {
    if (sending) return;
    setSending(true);
    await streamAgent({ mode: 'nightly_round' });
  }, [sending, streamAgent]);

  // ── Connect Telegram: signed deep link into the bot ──
  const connectTelegram = useCallback(async () => {
    try {
      const res = await fetch('/api/telegram/link', { headers: authHeaders });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        window.open(data.url, '_blank', 'noopener');
        // Optimistic: the webhook flips the real flag when /start lands.
        setBundle((prev) => (prev ? { ...prev, telegramLinked: true } : prev));
      } else if (data?.code === 'unconfigured') {
        appendMessage({ id: `sys-${Date.now()}`, role: 'system', kind: 'system', body: 'Telegram isn’t set up on this deployment yet.', created_at: new Date().toISOString() });
      }
    } catch {
      /* non-fatal */
    }
  }, [authHeaders, appendMessage]);

  // ── Apply / Skip a proposal ──
  const decide = useCallback(
    async (messageId, decision) => {
      const patch = (status, failReason = null) =>
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId && m.meta?.proposal
              ? { ...m, meta: { ...m.meta, proposal: { ...m.meta.proposal, status, ...(failReason ? { failReason } : {}) } } }
              : m
          )
        );
      patch('working');
      try {
        const res = await fetch(`/api/trips/${tripId}/agent/apply`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ messageId, decision }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.status) patch(data.status);
        else patch('failed', data.error || 'Couldn’t apply — try again.');
      } catch {
        patch('failed', 'Couldn’t reach the server — try again.');
      }
    },
    [tripId, authHeaders]
  );

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
            <button
              type="button"
              onClick={previewBrief}
              disabled={sending}
              className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline disabled:opacity-40"
            >
              <Wand2 className="h-3.5 w-3.5" /> Preview tonight&apos;s brief
            </button>
            {bundle.telegramLinked ? (
              <span className="inline-flex items-center gap-1 text-emerald-700">
                <SendHorizonal className="h-3.5 w-3.5" /> Telegram connected
              </span>
            ) : (
              <button
                type="button"
                onClick={connectTelegram}
                className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline"
              >
                <SendHorizonal className="h-3.5 w-3.5" /> Connect Telegram
              </button>
            )}
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
          <MessageBubble key={m.id} message={m} onDecision={decide} />
        ))}
        {liveTurn && <LiveTurnBubble turn={liveTurn} />}
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

function MessageBubble({ message: m, onDecision }) {
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
        {m.meta?.proposal && <ProposalCard message={m} onDecision={onDecision} />}
        {m.meta?.trace?.steps?.length > 0 && <TraceDisclosure trace={m.meta.trace} />}
      </div>
    </div>
  );
}

/**
 * The forming Olivier bubble while a turn streams: thinking in muted italic
 * (clamped to the last couple of lines), tool chips that resolve ✓/✗ with a
 * one-line summary, then the reply streaming below — never a bare spinner.
 */
function LiveTurnBubble({ turn }) {
  const idle = !turn.thinking && !turn.tools.length && !turn.reply;
  return (
    <div className="flex items-end gap-2">
      <OlivierMark size={26} className="mb-1 shrink-0" />
      <div className="min-w-0 max-w-[85%] rounded-2xl rounded-bl-md border border-gray-200/80 bg-white px-4 py-2.5 shadow-sm">
        {idle && (
          <p className="flex items-center gap-2 text-xs font-medium text-gray-400">
            <Loader2 className="h-3 w-3 animate-spin" /> Olivier is reading your message…
          </p>
        )}
        {turn.thinking && (
          /* Stays mounted once the reply starts — collapsing it mid-stream
             shifts the layout under the reader. */
          <div className="flex max-h-9 flex-col justify-end overflow-hidden">
            <p className="whitespace-pre-wrap text-xs italic leading-snug text-gray-400">{turn.thinking}</p>
          </div>
        )}
        {turn.tools.length > 0 && (
          <div className={`flex flex-col gap-1 ${turn.thinking ? 'mt-1.5' : ''}`}>
            {turn.tools.map((t, i) => (
              <span key={i} className="inline-flex items-start gap-1.5 text-xs text-gray-500">
                {t.ok === null ? (
                  <Loader2 className="mt-0.5 h-3 w-3 shrink-0 animate-spin text-blue-500" />
                ) : t.ok ? (
                  <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />
                ) : (
                  <X className="mt-0.5 h-3 w-3 shrink-0 text-amber-600" />
                )}
                <span className="min-w-0">
                  <span className="font-medium text-gray-600">{t.label}</span>
                  {t.summary && <span className="text-gray-400"> — {t.summary}</span>}
                </span>
              </span>
            ))}
          </div>
        )}
        {turn.reply && (
          <p className={`whitespace-pre-wrap text-[15px] leading-relaxed text-gray-800 ${turn.tools.length ? 'mt-2' : ''}`}>
            {turn.reply}
          </p>
        )}
      </div>
    </div>
  );
}

/** Collapsed "what Olivier checked" on past messages, read from meta.trace. */
function TraceDisclosure({ trace }) {
  const toolSteps = trace.steps.filter((s) => s.t === 'tool').length;
  const n = toolSteps || trace.steps.length;
  return (
    <details className="group mt-2">
      <summary className="flex cursor-pointer list-none items-center gap-1 text-[11px] font-medium text-gray-400 transition hover:text-gray-600">
        <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
        What I checked · {n} step{n === 1 ? '' : 's'}
      </summary>
      <div className="mt-1.5 flex flex-col gap-1 border-l-2 border-gray-100 pl-2.5">
        {trace.steps.map((s, i) =>
          s.t === 'thinking' ? (
            <p key={i} className="text-xs italic leading-snug text-gray-400">{s.text}</p>
          ) : (
            <p key={i} className="text-xs leading-snug text-gray-500">
              <span className={s.ok === false ? 'text-amber-600' : 'text-emerald-600'}>
                {s.ok === false ? '✗' : '✓'}
              </span>{' '}
              <span className="font-medium text-gray-600">{s.label}</span>
              {s.summary && <span className="text-gray-400"> — {s.summary}</span>}
            </p>
          )
        )}
      </div>
    </details>
  );
}

/** The trust ladder's top rung in v1: the agent proposes, the traveler applies. */
function ProposalCard({ message: m, onDecision }) {
  const p = m.meta.proposal;
  return (
    <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/60 p-3">
      <p className="text-sm font-semibold text-gray-800">{p.diff}</p>
      <div className="mt-2.5">
        {p.status === 'pending' && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onDecision(m.id, 'apply')}
              className="rounded-full bg-[#1e63e9] px-4 py-1.5 text-xs font-bold text-white transition hover:bg-[#174fc2]"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={() => onDecision(m.id, 'skip')}
              className="rounded-full border border-gray-200 bg-white px-4 py-1.5 text-xs font-bold text-gray-600 transition hover:border-gray-300"
            >
              Skip
            </button>
          </div>
        )}
        {p.status === 'working' && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500">
            <Loader2 className="h-3 w-3 animate-spin" /> Applying…
          </span>
        )}
        {p.status === 'applied' && (
          <span className="text-xs font-bold text-emerald-700">✓ Applied to your itinerary</span>
        )}
        {p.status === 'skipped' && <span className="text-xs font-medium text-gray-400">Skipped</span>}
        {p.status === 'failed' && (
          <span className="text-xs font-medium text-amber-700">{p.failReason || 'Couldn’t apply.'}</span>
        )}
      </div>
    </div>
  );
}
