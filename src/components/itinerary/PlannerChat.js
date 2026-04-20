'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Sparkles, Loader2, MapPin, RefreshCw } from 'lucide-react';

const STARTER_PROMPTS = [
  'Replace the museum on Day 2 with something outdoors',
  'Add a great dinner spot on Day 1 — local, not touristy',
  "I've already visited this attraction — can you swap it out?",
  'What should I prioritise if I only have half a day?',
];

function ToolPill({ event }) {
  const icons = {
    get_city_attractions: '🏛️',
    get_place_details: '📍',
    search_nearby: '🔍',
    update_itinerary: '✏️',
  };
  const labels = {
    get_city_attractions: 'Looking up attractions',
    get_place_details: 'Checking place details',
    search_nearby: 'Searching nearby',
    update_itinerary: 'Updating your itinerary',
  };

  if (event.type === 'tool_call') {
    return (
      <div className="flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-800/60 px-3 py-1.5 text-xs text-zinc-400">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>{labels[event.name] || event.name}…</span>
      </div>
    );
  }
  if (event.type === 'tool_result') {
    return (
      <div className="flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-800/60 px-3 py-1.5 text-xs text-zinc-400">
        <span>{event.summary}</span>
      </div>
    );
  }
  if (event.type === 'activity_updated') {
    return (
      <div className="flex items-center gap-2 rounded-full border border-[#c9963c40] bg-[#c9963c10] px-3 py-1.5 text-xs font-medium text-[#c9963c]">
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
      {!isUser && (
        <div className="mr-2 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#c9963c] text-xs text-black">
          <Sparkles className="h-3 w-3" />
        </div>
      )}
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'rounded-br-sm bg-zinc-700 text-white'
            : 'rounded-bl-sm border border-zinc-700 bg-[#1c1c1f] text-zinc-200'
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

const AGENT_URL = '/api/plan/agent';

export default function PlannerChat({ tripId, citySlug, cityDisplay, plan, onActivityUpdate }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [displayMessages, setDisplayMessages] = useState([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);
  const sessionIdRef = useRef(typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `s-${Date.now()}`);

  // Scroll to bottom on new message
  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [displayMessages, open]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  const sendMessage = useCallback(
    async (text) => {
      const userText = text.trim();
      if (!userText || streaming) return;

      setInput('');
      setStreaming(true);

      const userMsg = { role: 'user', content: userText };
      const nextMessages = [...messages, userMsg];
      setMessages(nextMessages);

      // Add user bubble + placeholder assistant bubble
      const userDisplay = { ...userMsg };
      const assistantPlaceholder = { role: 'assistant', content: '', isStreaming: true, _key: Date.now() };
      setDisplayMessages((prev) => [...prev, userDisplay, assistantPlaceholder]);

      let assistantText = '';

      const updateAssistant = (text, done = false) => {
        assistantText = text;
        setDisplayMessages((prev) =>
          prev.map((m) =>
            m._key === assistantPlaceholder._key
              ? { ...m, content: text, isStreaming: !done }
              : m
          )
        );
      };

      const insertToolEvent = (event) => {
        setDisplayMessages((prev) => {
          // Insert before the streaming assistant bubble
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

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

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
            try {
              event = JSON.parse(line.slice(6));
            } catch {
              continue;
            }

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
                updateAssistant(`Sorry, something went wrong: ${event.message}`, true);
                break;
              case 'done':
                updateAssistant(assistantText, true);
                break;
            }
          }
        }

        // Commit final assistant text to message history
        updateAssistant(assistantText, true);
        setMessages((prev) => [...prev, { role: 'assistant', content: assistantText }]);
      } catch (err) {
        if (err.name !== 'AbortError') {
          updateAssistant("Sorry, I couldn't connect to the planning agent. Please try again.", true);
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

  const isEmpty = displayMessages.length === 0;

  return (
    <>
      {/* Floating trigger */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-black shadow-xl transition hover:opacity-90 focus:outline-none"
          style={{ backgroundColor: '#c9963c' }}
          aria-label="Refine your itinerary with AI"
        >
          <Sparkles className="h-4 w-4" />
          Refine with AI
        </button>
      )}

      {/* Slide-in panel */}
      {open && (
        <div className="fixed bottom-0 right-0 z-50 flex h-[80vh] w-full max-w-md flex-col rounded-t-2xl border border-zinc-700 bg-[#111113] shadow-2xl sm:bottom-6 sm:right-6 sm:h-[600px] sm:rounded-2xl">
          {/* Header */}
          <div className="flex items-center justify-between rounded-t-2xl border-b border-zinc-800 px-4 py-3.5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" style={{ color: '#c9963c' }} />
              <span className="text-sm font-semibold text-zinc-200">Refine your {cityDisplay} trip</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-300"
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Message thread */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {isEmpty ? (
              <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: '#c9963c20' }}>
                  <Sparkles className="h-6 w-6" style={{ color: '#c9963c' }} />
                </div>
                <div>
                  <p className="font-semibold text-zinc-200">Your AI travel editor</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Tell me what to change and I&apos;ll update your plan instantly.
                  </p>
                </div>
                <div className="flex w-full flex-col gap-2">
                  {STARTER_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => sendMessage(prompt)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-800/50 px-3 py-2.5 text-left text-sm text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {displayMessages.map((msg, i) => (
                  <MessageBubble key={msg._key ?? i} msg={msg} />
                ))}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="border-t border-zinc-800 px-3 py-3">
            <div className="flex items-end gap-2 rounded-xl border border-zinc-700 bg-zinc-800/60 px-3 py-2 focus-within:border-zinc-500">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                disabled={streaming}
                placeholder="Ask me to change anything…"
                className="flex-1 resize-none bg-transparent text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none disabled:opacity-50"
                style={{ maxHeight: '96px' }}
              />
              {streaming ? (
                <button
                  type="button"
                  onClick={handleAbort}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-700 text-zinc-400 transition hover:bg-zinc-600"
                  title="Stop generating"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-black transition hover:opacity-90 disabled:opacity-30"
                  style={{ backgroundColor: '#c9963c' }}
                  title="Send"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <p className="mt-1.5 text-center text-[10px] text-zinc-600">
              Changes save automatically · AI-powered planner
            </p>
          </form>
        </div>
      )}
    </>
  );
}
