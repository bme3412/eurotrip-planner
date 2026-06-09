'use client';

import { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import OlivierMark from './OlivierMark';

const SUGGESTIONS = [
  'What should I not miss?',
  'Where would a local eat near my hotel?',
  "What's the one thing to book ahead?",
];

/**
 * One-shot "ask Olivier" — a taste of the in-app chat. Posts a single question to
 * /api/trips/[id]/concierge-ask and shows the reply in his voice. Not a thread.
 */
export default function AskOlivier({ tripId, authHeaders, sample = null }) {
  const [q, setQ] = useState('');
  // Pre-seed with a real sample exchange so the quality is visible without typing.
  const [turns, setTurns] = useState(
    sample?.question && sample?.answer ? [{ q: sample.question, a: sample.answer }] : []
  );
  const [loading, setLoading] = useState(false);
  const [userAsked, setUserAsked] = useState(false);
  const seeded = Boolean(sample?.question) && !userAsked;

  const ask = async (question) => {
    const text = (question ?? q).trim();
    if (!text || loading) return;
    setQ('');
    setUserAsked(true);
    setLoading(true);
    setTurns((t) => [...t, { q: text, a: null }]);
    try {
      const res = await fetch(`/api/trips/${tripId}/concierge-ask`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ question: text }),
      });
      const data = await res.json();
      const reply = res.ok ? data.reply : "I couldn't get to that just now — try me again in a moment.";
      setTurns((t) => t.map((turn, i) => (i === t.length - 1 ? { ...turn, a: reply } : turn)));
    } catch {
      setTurns((t) => t.map((turn, i) => (i === t.length - 1 ? { ...turn, a: 'I had trouble reaching you just now.' } : turn)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm md:p-7">
      <div className="flex items-center gap-3">
        <OlivierMark size={36} />
        <div>
          <p className="font-bold text-gray-900">Ask Olivier anything</p>
          <p className="text-xs text-gray-500">He already knows your itinerary. Try a question.</p>
        </div>
      </div>

      {seeded && <p className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-gray-300">Sample</p>}

      {turns.length > 0 && (
        <div className="mt-3 space-y-4">
          {turns.map((t, i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-end">
                <span className="max-w-[85%] rounded-2xl rounded-br-sm bg-[#1e63e9] px-3.5 py-2 text-sm text-white">{t.q}</span>
              </div>
              <div className="flex items-start gap-2">
                <OlivierMark size={24} />
                <span className="max-w-[85%] rounded-2xl rounded-bl-sm bg-gray-100 px-3.5 py-2 text-sm text-gray-800">
                  {t.a == null ? <Loader2 className="h-4 w-4 animate-spin text-gray-400" /> : t.a}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {!userAsked && (
        <div className="mt-4 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => ask(s)}
              className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:border-gray-300 hover:bg-white"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); ask(); }}
        className="mt-4 flex items-center gap-2"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ask about your trip…"
          aria-label="Ask Olivier a question"
          className="flex-1 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          type="submit"
          disabled={loading || !q.trim()}
          aria-label="Send"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1e63e9] text-white transition hover:bg-[#174fc2] disabled:opacity-40"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}
