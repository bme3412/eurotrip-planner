import React from 'react';
import { INDOOR_KW, OUTDOOR_KW } from './constants';

export function parseDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDayDate(dateStr) {
  if (!dateStr) return dateStr;
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC',
    }).format(d);
  }
  const d = parseDate(dateStr);
  return d
    ? new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(d)
    : dateStr;
}

export function fmtType(type) {
  if (!type) return null;
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function renderRich(text) {
  if (!text) return null;
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
    i % 2 === 1
      ? <strong key={i} className="font-semibold text-zinc-200">{part}</strong>
      : <span key={i}>{part}</span>
  );
}

export function inferIndoor(type, name) {
  const s = `${type || ''} ${name || ''}`.toLowerCase();
  if (INDOOR_KW.some(k => s.includes(k))) return true;
  if (OUTDOOR_KW.some(k => s.includes(k))) return false;
  return null;
}

// Pre-indexed Map gives O(1) lookups; fuzzy matches via word-level fallback
export function matchBadge(name, indexedScores) {
  if (!indexedScores || !name) return null;
  const key = name.toLowerCase().trim();

  let match = indexedScores.get(key);

  if (!match) {
    const words = key.split(/\s+/);
    for (const word of words) {
      if (word.length > 4) {
        match = indexedScores.get(word);
        if (match) break;
      }
    }
  }

  if (!match) return null;
  if (match.score >= 8.5) return { label: 'Must-see', cls: 'border border-[#c9963c60] text-[#c9963c]' };
  if (match.score >= 7.0) return { label: 'Top-rated', cls: 'border border-sky-800 text-sky-400' };
  return null;
}

export function buildExperienceScoreMap(experiences) {
  if (!experiences?.categories) return {};
  const map = {};
  for (const items of Object.values(experiences.categories)) {
    for (const item of items || []) {
      if (!item.name || !item.scores?.total_score) continue;
      map[item.name.toLowerCase().trim()] = {
        score: item.scores.total_score,
        pricingTier: item.pricing_tier || null,
      };
    }
  }
  return map;
}
