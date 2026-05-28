import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import { getFlagForCountry } from '@/utils/countryFlags';
import { escapeRegExp, stripMarkdown } from '../lib/textFormatting.js';

// Inline JSX helper that injects 🇫🇷-style country flags before the first mention
// of each known city. Lives next to the message components since it's only
// used by them.
function FlaggedText({ content, mentionCities = [] }) {
  if (!content || mentionCities.length === 0) return content;

  const pattern = new RegExp(`\\b(${mentionCities.map((city) => escapeRegExp(city.name)).join('|')})\\b`, 'g');
  const cityByName = new Map(mentionCities.map((city) => [city.name, city]));
  const flaggedCities = new Set();
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }

    const matchedText = match[0];
    const city = cityByName.get(matchedText);
    const previous = content.slice(Math.max(0, match.index - 4), match.index);
    const alreadyFlagged = /[\u{1F1E6}-\u{1F1FF}]{2}\s*$/u.test(previous);
    const cityKey = matchedText.toLowerCase();
    const shouldShowFlag = !alreadyFlagged && !flaggedCities.has(cityKey);
    if (shouldShowFlag) flaggedCities.add(cityKey);

    parts.push(
      <span key={`${match.index}-${matchedText}`}>
        {shouldShowFlag && (
          <span aria-hidden="true">{getFlagForCountry(city.country)} </span>
        )}
        {matchedText}
      </span>
    );
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts;
}

// ── Compact AI message — card style with directional bubble ──────
export function CompactAIMessage({ content, mentionCities }) {
  if (!content) return null;
  const cleaned = stripMarkdown(content);
  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      className="py-1.5 max-w-[92%]"
    >
      <div className="rounded-2xl rounded-tl-md bg-[#faf8f5] border border-[#e5e0d8]/60 px-3.5 py-2.5">
        <p className="text-[13px] text-[#4a4540] leading-relaxed whitespace-pre-wrap">
          <FlaggedText content={cleaned} mentionCities={mentionCities} />
        </p>
      </div>
    </motion.div>
  );
}

// ── User message — right-aligned pill with directional corner ────
export function CompactUserMessage({ content, mentionCities }) {
  if (!content) return null;
  return (
    <div className="flex justify-end py-1">
      <div className="bg-[#2a2520] text-white text-[12px] rounded-2xl rounded-tr-md px-3.5 py-2 max-w-[85%] leading-snug whitespace-pre-wrap">
        <FlaggedText content={content} mentionCities={mentionCities} />
      </div>
    </div>
  );
}

// ── System event — centered pill style ───────────────────────────
export function CompactSystemEvent({ content, mentionCities }) {
  if (!content) return null;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="py-1.5 flex justify-center"
    >
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f0ede6] text-[11px] text-[#6a6459] italic border border-[#e5e0d8]/50">
        <ArrowUp className="w-3 h-3 text-[#b5b0a8]" aria-hidden="true" />
        <FlaggedText content={content} mentionCities={mentionCities} />
      </span>
    </motion.div>
  );
}

// ── Hint pointing at the trip schedule header ────────────────────
export function HeaderHint({ label }) {
  return (
    <div className="py-1.5 px-3 rounded-xl border border-dashed border-[#d5d0c8] bg-[#faf8f5] text-[12px] text-[#6a6459] flex items-center gap-2">
      <ArrowUp className="w-3.5 h-3.5 text-[#8a8578] shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
