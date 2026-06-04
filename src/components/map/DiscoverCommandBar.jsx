'use client';

import React, { useState } from 'react';

/**
 * DiscoverCommandBar — the agentic command bar on the Explore/Discover surface.
 *
 * The traveler types a request in plain language ("add Lisbon", "try
 * September", "make it 10 days"); we send it to /api/discover/command, which
 * returns structured edits, and `onApply` mutates the shared trip context so
 * the ranked map/list re-rank live. A transient reply line confirms the change.
 */
export default function DiscoverCommandBar({ context, onApply }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState(null);
  const [error, setError] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const q = text.trim();
    if (!q || busy) return;
    setBusy(true);
    setReply(null);
    setError(false);
    try {
      const res = await fetch('/api/discover/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: q, context }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const actions = await res.json();
      onApply?.(actions);
      setReply(actions.reply || 'Updated your trip.');
      setText('');
    } catch {
      setError(true);
      setReply("Sorry — I couldn't do that. Try rephrasing.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-[min(92vw,26rem)]">
      <form
        onSubmit={submit}
        className="flex items-center gap-2 rounded-full bg-white/95 px-2 py-1.5 shadow-lg ring-1 ring-slate-200 backdrop-blur"
      >
        <span className="pl-2 text-blue-600" aria-hidden>✦</span>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask: add Lisbon · try September · make it 10 days"
          aria-label="Ask the trip assistant"
          className="min-w-0 flex-1 bg-transparent px-1 py-1 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || !text.trim()}
          className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          aria-label="Send"
        >
          {busy ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.926A1.5 1.5 0 005.135 9.25H10a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.085l-1.414 4.926a.75.75 0 00.826.95 28.897 28.897 0 0015.293-7.155.75.75 0 000-1.114A28.897 28.897 0 003.105 2.289z" />
            </svg>
          )}
        </button>
      </form>
      {reply && (
        <p className={`mt-2 px-3 text-center text-xs font-medium ${error ? 'text-rose-600' : 'text-slate-600'}`}>
          {reply}
        </p>
      )}
    </div>
  );
}
