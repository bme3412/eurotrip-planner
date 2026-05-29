'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { getCitiesLite as getCitiesData } from '@/generated/cityListLite';
import { getFlagForCountry } from '@/utils/countryFlags';

function searchCities(query, cities, limit = 6) {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase().trim();

  const scored = cities
    .map(city => {
      const name = city.name.toLowerCase();
      const country = city.country.toLowerCase();
      const region = (city.region || '').toLowerCase();
      let score = 0;

      if (name.startsWith(q)) score = 100;
      else if (name.split(/[\s-]/).some(w => w.startsWith(q))) score = 80;
      else if (name.includes(q)) score = 60;
      else if (country.startsWith(q)) score = 40;
      else if (country.includes(q)) score = 20;
      else if (region.includes(q)) score = 10;
      else return null;

      return { ...city, _score: score };
    })
    .filter(Boolean)
    .sort((a, b) => b._score - a._score);

  return scored.slice(0, limit);
}

// Detect if query looks like a question/request vs city search
function isQuestionQuery(query) {
  if (!query || query.length < 5) return false;
  const q = query.toLowerCase().trim();

  // Question words
  const questionStarters = ['what', 'where', 'when', 'how', 'which', 'why', 'can', 'should', 'could', 'would', 'is', 'are', 'do', 'does', 'help', 'suggest', 'recommend', 'plan', 'find'];
  const startsWithQuestion = questionStarters.some(w => q.startsWith(w + ' '));

  // Contains question marks or action words
  const hasQuestionMark = q.includes('?');
  const hasActionWords = /\b(trip|itinerary|route|days|weeks|visit|travel|best|good|budget|cheap|expensive)\b/.test(q);

  // More than 3 words usually means it's not just a city name
  const wordCount = q.split(/\s+/).length;

  return hasQuestionMark || startsWithQuestion || (hasActionWords && wordCount > 2);
}

const SUGGESTED_QUERIES = [
  { text: 'Best cities for first-time visitors', type: 'question' },
  { text: 'Paris', type: 'city' },
  { text: 'Weekend trip ideas for spring', type: 'question' },
  { text: 'Barcelona', type: 'city' },
];

export default function CommandBar({ open, onClose }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  const cities = useRef(null);
  if (!cities.current) {
    try { cities.current = getCitiesData(); } catch { cities.current = []; }
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset state when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setActiveIdx(-1);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (query.length >= 2 && !isQuestionQuery(query)) {
        const r = searchCities(query, cities.current);
        setResults(r);
      } else {
        setResults([]);
      }
      setActiveIdx(-1);
    }, 150);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const handleClose = useCallback(() => {
    setQuery('');
    setResults([]);
    onClose();
  }, [onClose]);

  const handleSubmit = useCallback(() => {
    const q = query.trim();
    if (!q) return;

    if (isQuestionQuery(q)) {
      // Navigate to /plan with query
      router.push(`/plan?q=${encodeURIComponent(q)}`);
    } else if (results.length > 0 && activeIdx >= 0) {
      // Navigate to selected city
      router.push(`/city-guides/${results[activeIdx].id}`);
    } else if (results.length > 0) {
      // Navigate to first result
      router.push(`/city-guides/${results[0].id}`);
    } else {
      // General search
      router.push(`/city-guides?search=${encodeURIComponent(q)}`);
    }
    handleClose();
  }, [query, results, activeIdx, router, handleClose]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      handleClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, results.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, -1));
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isQuestion = isQuestionQuery(query);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="w-full max-w-xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="relative border-b border-gray-100">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search cities or ask a question..."
            className="w-full pl-12 pr-12 py-4 text-base bg-transparent focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Results or suggestions */}
        <div className="max-h-[50vh] overflow-y-auto">
          {/* Question detected - show action */}
          {isQuestion && query.length >= 3 && (
            <div className="p-3">
              <button
                onClick={handleSubmit}
                className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-xl text-left transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">&ldquo;{query}&rdquo;</div>
                  <div className="text-sm text-blue-600">Get personalized recommendations →</div>
                </div>
              </button>
            </div>
          )}

          {/* City results */}
          {results.length > 0 && (
            <div className="p-2">
              <div className="px-3 py-1.5 text-xs font-medium text-gray-400 uppercase">Cities</div>
              {results.map((city, idx) => (
                <Link
                  key={city.id}
                  href={`/city-guides/${city.id}`}
                  onClick={handleClose}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    idx === activeIdx ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <span className="text-lg">{getFlagForCountry(city.country)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900">{city.name}</div>
                    <div className="text-xs text-gray-500">{city.country}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* No query - show suggestions */}
          {!query && (
            <div className="p-3">
              <div className="px-2 py-1.5 text-xs font-medium text-gray-400 uppercase">Try searching</div>
              <div className="space-y-1">
                {SUGGESTED_QUERIES.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setQuery(item.text);
                      inputRef.current?.focus();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 text-left transition-colors"
                  >
                    {item.type === 'question' ? (
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                    <span className="text-sm text-gray-700">{item.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* No results for city search */}
          {query.length >= 2 && !isQuestion && results.length === 0 && (
            <div className="p-6 text-center">
              <p className="text-sm text-gray-500">No cities found for &ldquo;{query}&rdquo;</p>
              <button
                onClick={handleSubmit}
                className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Search all cities →
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-4 py-2.5 flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-medium">↵</kbd>
              <span>select</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-medium">esc</kbd>
              <span>close</span>
            </span>
          </div>
          <span>220 cities</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
