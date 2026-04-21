'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

/**
 * QuestionChips - Inline question buttons that expand to show answers
 *
 * No "AI" mentions - answers appear inline below the chip.
 * Expert voice: specific, opinionated, backed by data.
 */

function getCurrentMonth() {
  return new Date().toLocaleString('en-US', { month: 'long' });
}

export default function QuestionChips({ cityName, citySlug }) {
  const [expandedChip, setExpandedChip] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(null);

  const chips = [
    { id: 'when', label: 'When should I go?', question: `When is the best time to visit ${cityName}?` },
    { id: 'days', label: 'How many days?', question: `How many days do I need in ${cityName}?` },
    { id: 'booking', label: 'What needs booking?', question: `What attractions or experiences in ${cityName} need advance booking?` },
    { id: 'month', label: `Best in ${getCurrentMonth()}?`, question: `What's happening in ${cityName} in ${getCurrentMonth()}? Is it a good time to visit?` },
  ];

  const handleChipClick = useCallback(async (chip) => {
    // Toggle off if already expanded
    if (expandedChip === chip.id) {
      setExpandedChip(null);
      return;
    }

    setExpandedChip(chip.id);

    // Already have answer cached
    if (answers[chip.id]) {
      return;
    }

    // Fetch answer
    setLoading(chip.id);
    try {
      const res = await fetch('/api/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: chip.question }],
          tripContext: { page: 'city-guide', citySlug },
          quickAnswer: true, // Signal for shorter, direct responses
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // Handle SSE streaming
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullAnswer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === 'delta' || event.type === 'content') {
              fullAnswer += event.text || event.content || '';
              setAnswers(prev => ({ ...prev, [chip.id]: fullAnswer }));
            } else if (event.type === 'done') {
              setAnswers(prev => ({ ...prev, [chip.id]: fullAnswer }));
            }
          } catch {
            continue;
          }
        }
      }

      // Finalize answer
      if (fullAnswer) {
        setAnswers(prev => ({ ...prev, [chip.id]: fullAnswer }));
      }
    } catch (err) {
      console.error('QuestionChips fetch error:', err);
      setAnswers(prev => ({
        ...prev,
        [chip.id]: 'Sorry, could not load the answer. Please try again.'
      }));
    } finally {
      setLoading(null);
    }
  }, [expandedChip, answers, citySlug]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 mb-6">
      {/* Chips row */}
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <button
            key={chip.id}
            onClick={() => handleChipClick(chip)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              expandedChip === chip.id
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-300 hover:bg-blue-50'
            }`}
          >
            {chip.label}
            {loading === chip.id && (
              <span className="ml-2 inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
          </button>
        ))}
      </div>

      {/* Expanded answer card */}
      {expandedChip && (
        <div className="mt-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm animate-fade-in">
          {loading === expandedChip ? (
            <div className="flex items-center gap-3 text-gray-500">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
              <span className="text-sm">Looking this up...</span>
            </div>
          ) : answers[expandedChip] ? (
            <div className="prose prose-sm max-w-none text-gray-700">
              <p className="whitespace-pre-wrap">{answers[expandedChip]}</p>
            </div>
          ) : null}

          {/* Footer with subtle branding + handoff to planner */}
          {answers[expandedChip] && !loading && (
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
              <Link
                href={`/plan?q=${encodeURIComponent(
                  chips.find(c => c.id === expandedChip)?.question || ''
                )}`}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                Keep going in the planner
                <ArrowRight className="w-3 h-3" />
              </Link>
              <button
                onClick={() => setExpandedChip(null)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
