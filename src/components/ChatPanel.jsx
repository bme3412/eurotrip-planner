"use client";
import { useEffect, useRef } from 'react';
import { useChat } from '@ai-sdk/react';
import { X, Send } from 'lucide-react';

export default function ChatPanel({ onClose }) {
  const containerRef = useRef(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/ai/chat',
    initialMessages: [
      {
        id: 'intro',
        role: 'assistant',
        content:
          "Hi! I'm your Eurotrip Copilot. Tell me your dates, interests, or cities, and I'll suggest an itinerary or answer questions.",
      },
    ],
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[calc(100vw-2rem)] max-w-md rounded-xl border border-black/10 bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
        <div className="text-sm font-semibold">Eurotrip Copilot</div>
        <button onClick={onClose} aria-label="Close" className="rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div ref={containerRef} className="max-h-80 overflow-y-auto px-4 py-3 text-sm">
        {messages.map((m) => (
          <div key={m.id} className={`mb-3 flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`rounded-2xl px-3 py-2 shadow-sm ${
                m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-zinc-100 text-zinc-900'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {isLoading && <div className="text-xs text-zinc-500">Thinking…</div>}
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-black/10 px-3 py-2">
        <input
          value={input ?? ''}
          onChange={handleInputChange}
          placeholder="Ask about cities, dates, or trip ideas…"
          className="flex-1 rounded-md border border-black/10 px-3 py-2 text-sm outline-none focus:border-indigo-300"
        />
        <button
          type="submit"
          className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          disabled={isLoading || !((input ?? '').trim())}
        >
          <Send className="h-4 w-4" />
          Send
        </button>
      </form>
    </div>
  );
}


