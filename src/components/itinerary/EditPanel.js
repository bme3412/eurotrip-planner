'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Loader2, RefreshCw, Pencil } from 'lucide-react';

const AGENT_URL = '/api/plan/agent';

const QUICK_EDITS = [
  {
    label: 'Swap a museum for something outdoors',
    request: 'Swap one of the museums for something outdoors with strong reviews — same time block.',
  },
  {
    label: 'Add a non-touristy dinner',
    request: 'Add a great dinner spot — local, not touristy, well-reviewed. Pick the day that needs it most.',
  },
  {
    label: 'Make Day 1 lighter',
    request: 'Make Day 1 lighter — fewer activities, more downtime, keep the best one.',
  },
  {
    label: 'Add half-day priorities',
    request: 'If I only had a half day, what should I prioritise from this trip and why?',
  },
  {
    label: 'Find a better lunch spot',
    request: 'Replace the weakest lunch with something better-rated within 10 minutes walk.',
  },
  {
    label: 'Cut one activity per day',
    request: 'Cut the lowest-impact activity each day so the pace breathes.',
  },
];

function ToolPill({ event }) {
  const labels = {
    get_city_attractions: 'Looking up attractions',
    get_place_details: 'Checking place details',
    search_nearby: 'Searching nearby',
    update_itinerary: 'Updating the trip',
  };

  if (event.type === 'tool_call') {
    return (
      <div className="flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-100 px-3 py-1.5 text-xs text-zinc-600">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>{labels[event.name] || event.name}…</span>
      </div>
    );
  }
  if (event.type === 'tool_result') {
    return (
      <div className="flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-100 px-3 py-1.5 text-xs text-zinc-600">
        <span>{event.summary}</span>
      </div>
    );
  }
  if (event.type === 'activity_updated') {
    return (
      <div className="flex items-center gap-2 rounded-full border border-[#1e63e940] bg-[#1e63e910] px-3 py-1.5 text-xs font-medium text-[#1e63e9]">
        <RefreshCw className="h-3 w-3" />
        <span>Day {event.dayNumber} updated: {event.activity?.name}</span>
      </div>
    );
  }
  return null;
}

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';

  if (msg.role === 'tool_event') {
    return (
      <div className="flex justify-start px-1 py-0.5">
        <ToolPill event={msg} />
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'rounded-br-sm bg-[#1e63e9] text-white'
            : 'rounded-bl-sm border border-zinc-200 bg-zinc-50 text-zinc-800'
        }`}
      >
        {msg.content}
        {msg.isStreaming && (
          <span className="ml-1 inline-block h-3.5 w-0.5 animate-pulse rounded-sm bg-current opacity-70" />
        )}
      </div>
    </div>
  );
}

export default function EditPanel({
  open,
  onClose,
  tripId,
  citySlug,
  cityDisplay,
  plan,
  onActivityUpdate,
}) {
  const [mode, setMode] = useState('quick'); // 'quick' | 'type'
  const [messages, setMessages] = useState([]);
  const [displayMessages, setDisplayMessages] = useState([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);
  const sessionIdRef = useRef(
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `s-${Date.now()}`
  );

  // Auto-scroll on new messages
  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [displayMessages, open]);

  // Focus input when switching to type mode
  useEffect(() => {
    if (open && mode === 'type') {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open, mode]);

  // Cancel any in-flight stream when the panel closes
  useEffect(() => {
    if (!open && abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
      setStreaming(false);
    }
  }, [open]);

  const sendMessage = useCallback(
    async (text) => {
      const userText = text.trim();
      if (!userText || streaming) return;

      // Once a request fires, drop into the conversation view.
      setMode('type');
      setInput('');
      setStreaming(true);

      const userMsg = { role: 'user', content: userText };
      const nextMessages = [...messages, userMsg];
      setMessages(nextMessages);

      const userDisplay = { ...userMsg };
      const assistantPlaceholder = {
        role: 'assistant',
        content: '',
        isStreaming: true,
        _key: Date.now(),
      };
      setDisplayMessages((prev) => [...prev, userDisplay, assistantPlaceholder]);

      let assistantText = '';

      const updateAssistant = (next, done = false) => {
        assistantText = next;
        setDisplayMessages((prev) =>
          prev.map((m) =>
            m._key === assistantPlaceholder._key
              ? { ...m, content: next, isStreaming: !done }
              : m
          )
        );
      };

      const insertToolEvent = (event) => {
        setDisplayMessages((prev) => {
          const idx = prev.findIndex((m) => m._key === assistantPlaceholder._key);
          if (idx === -1) return [...prev, { role: 'tool_event', ...event }];
          return [
            ...prev.slice(0, idx),
            { role: 'tool_event', ...event },
            ...prev.slice(idx),
          ];
        });
      };

      try {
        abortRef.current = new AbortController();
        const res = await fetch(AGENT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tripId,
            citySlug,
            messages: nextMessages,
            sessionId: sessionIdRef.current,
          }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            let event;
            try { event = JSON.parse(line.slice(6)); } catch { continue; }

            switch (event.type) {
              case 'delta':
                updateAssistant(assistantText + event.text);
                break;
              case 'tool_call':
                insertToolEvent({ type: 'tool_call', name: event.name, args: event.args });
                break;
              case 'tool_result':
                insertToolEvent({ type: 'tool_result', name: event.name, summary: event.summary });
                break;
              case 'activity_updated':
                insertToolEvent({
                  type: 'activity_updated',
                  dayNumber: event.dayNumber,
                  timeBlock: event.timeBlock,
                  activity: event.activity,
                });
                if (onActivityUpdate) {
                  onActivityUpdate(event.dayNumber, event.timeBlock, event.activity, event.activityId);
                }
                break;
              case 'error':
                updateAssistant(`Couldn't apply that — ${event.message}`, true);
                break;
              case 'done':
                updateAssistant(assistantText, true);
                break;
            }
          }
        }

        updateAssistant(assistantText, true);
        setMessages((prev) => [...prev, { role: 'assistant', content: assistantText }]);
      } catch (err) {
        if (err.name !== 'AbortError') {
          updateAssistant("Couldn't reach the trip data right now. Try again in a moment.", true);
        }
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [messages, streaming, tripId, citySlug, onActivityUpdate]
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleAbort = () => {
    abortRef.current?.abort();
    setStreaming(false);
  };

  if (!open) return null;

  const hasThread = displayMessages.length > 0;

  return (
    <>
      {/* Backdrop (mobile). z sits above the post-generation overlay (z-60). */}
      <div
        className="fixed inset-0 z-[80] bg-black/40 sm:bg-transparent"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-label={`Edit ${cityDisplay} trip`}
        className="fixed bottom-0 right-0 z-[90] flex h-[85vh] w-full max-w-md flex-col rounded-t-2xl border border-zinc-200 bg-white shadow-2xl ring-1 ring-black/5 sm:bottom-6 sm:right-6 sm:h-[640px] sm:rounded-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3.5">
          <div className="flex items-center gap-2 min-w-0">
            <Pencil className="h-4 w-4 shrink-0" style={{ color: '#1e63e9' }} />
            <span className="text-sm font-semibold text-zinc-900 truncate">
              {cityDisplay} trip — edits
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Close edit panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mode tabs (only shown before any thread exists) */}
        {!hasThread && (
          <div className="flex border-b border-zinc-200 px-4">
            <button
              onClick={() => setMode('quick')}
              className={`relative px-3 py-2.5 text-xs font-semibold uppercase tracking-wider transition ${
                mode === 'quick'
                  ? 'text-[#1e63e9]'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              Quick edits
              {mode === 'quick' && (
                <span className="absolute inset-x-3 -bottom-px h-0.5 bg-[#1e63e9]" />
              )}
            </button>
            <button
              onClick={() => setMode('type')}
              className={`relative px-3 py-2.5 text-xs font-semibold uppercase tracking-wider transition ${
                mode === 'type'
                  ? 'text-[#1e63e9]'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              Type a request
              {mode === 'type' && (
                <span className="absolute inset-x-3 -bottom-px h-0.5 bg-[#1e63e9]" />
              )}
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {hasThread ? (
            <div className="flex flex-col gap-3">
              {displayMessages.map((msg, i) => (
                <MessageBubble key={msg._key ?? i} msg={msg} />
              ))}
              <div ref={bottomRef} />
            </div>
          ) : mode === 'quick' ? (
            <div className="flex flex-col gap-2">
              <p className="px-1 pb-1 text-xs text-zinc-500">
                Pick one. The trip updates in place.
              </p>
              {QUICK_EDITS.map((item) => (
                <button
                  key={item.label}
                  onClick={() => sendMessage(item.request)}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-left text-sm text-zinc-800 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50"
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="max-w-xs">
                <p className="font-semibold text-zinc-900">What needs to change?</p>
                <p className="mt-1.5 text-sm text-zinc-500">
                  Describe the swap, addition, or pace change. Cite a day if it
                  helps — e.g. &ldquo;Day 2 morning is too packed.&rdquo;
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Input — always visible once thread starts; visible in 'type' mode pre-thread */}
        {(hasThread || mode === 'type') && (
          <form onSubmit={handleSubmit} className="border-t border-zinc-200 px-3 py-3">
            <div className="flex items-end gap-2 rounded-xl border border-zinc-300 bg-white px-3 py-2 focus-within:border-[#1e63e9]">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                disabled={streaming}
                placeholder="Describe a change to the trip…"
                className="flex-1 resize-none bg-transparent text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none disabled:opacity-50"
                style={{ maxHeight: '96px' }}
              />
              {streaming ? (
                <button
                  type="button"
                  onClick={handleAbort}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-200 text-zinc-600 transition hover:bg-zinc-300"
                  title="Stop"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white transition hover:opacity-90 disabled:opacity-30"
                  style={{ backgroundColor: '#1e63e9' }}
                  title="Send"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <p className="mt-1.5 text-center text-[10px] text-zinc-400">
              Changes save automatically.
            </p>
          </form>
        )}
      </aside>
    </>
  );
}
