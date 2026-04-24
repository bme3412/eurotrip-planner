'use client';

import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import { CitySearchInput } from '../conversation/InputArea';
import { RouteSummaryWithData } from '../conversation/RouteSummary';
import ParsedItineraryCard from '../conversation/ParsedItineraryCard';

// ── Compact AI message — editorial style, no avatar ──────────────
function CompactAIMessage({ content }) {
  if (!content) return null;
  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      className="py-1.5"
    >
      <p className="text-[13px] text-[#4a4540] leading-relaxed">{content}</p>
    </motion.div>
  );
}

// ── User message — right-aligned pill ────────────────────────────
function CompactUserMessage({ content }) {
  if (!content) return null;
  return (
    <div className="flex justify-end py-1">
      <span className="bg-[#2a2520] text-white text-[12px] rounded-full px-3.5 py-1.5 max-w-[85%] leading-snug">
        {content}
      </span>
    </div>
  );
}

// ── System event — direct-manipulation echo from the schedule header ────
function CompactSystemEvent({ content }) {
  if (!content) return null;
  return (
    <div className="py-1 flex items-center gap-1.5 text-[11px] text-[#8a8578] italic">
      <ArrowUp className="w-3 h-3 text-[#b5b0a8] shrink-0" aria-hidden="true" />
      <span>{content}</span>
    </div>
  );
}

// ── Hint pointing at the trip schedule header for replaced inline UIs ────
function HeaderHint({ label }) {
  return (
    <div className="py-1.5 px-3 rounded-xl border border-dashed border-[#d5d0c8] bg-[#faf8f5] text-[12px] text-[#6a6459] flex items-center gap-2">
      <ArrowUp className="w-3.5 h-3.5 text-[#8a8578] shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

// ── Styled option cards — replaces generic QuickReplies ──────────
function PlannerOptions({ options = [], onSelect }) {
  return (
    <div className="grid grid-cols-1 gap-1.5 py-1">
      {options.map((option, i) => (
        <motion.button
          key={option.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect(option)}
          className="group flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-[#e5e0d8] bg-white hover:border-[#c9a227]/50 hover:bg-[#faf6eb] text-left transition-all"
        >
          {option.emoji && (
            <span className="text-base shrink-0 w-6 text-center">{option.emoji}</span>
          )}
          <div className="flex-1 min-w-0">
            <span className="text-[13px] font-medium text-[#2a2520] group-hover:text-[#2a2520]">
              {option.label}
            </span>
            {option.description && (
              <span className="text-[11px] text-[#8a8578] ml-1.5">{option.description}</span>
            )}
          </div>
          <span className="text-[#c9a227] opacity-0 group-hover:opacity-100 transition-opacity text-xs shrink-0">
            &rarr;
          </span>
        </motion.button>
      ))}
    </div>
  );
}

// ── Section divider with label ───────────────────────────────────
function StepDivider({ label }) {
  return (
    <div className="flex items-center gap-2 py-2">
      <div className="flex-1 h-px bg-[#e5e0d8]" />
      <span className="text-[8px] font-semibold uppercase tracking-[0.2em] text-[#b5b0a8]">{label}</span>
      <div className="flex-1 h-px bg-[#e5e0d8]" />
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────
export default function CompactMessageList({
  messages,
  isStreaming,
  pendingInput,
  trip,
  onOptionSelect,
  onCitySelect,
  onDaysChange,
  onDateSelect,
  onParsedItineraryConfirm,
  onParsedItineraryRefine,
}) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, pendingInput]);

  const renderPendingInput = () => {
    if (!pendingInput) return null;

    switch (pendingInput.type) {
      // V2 tool types
      case 'render_options':
      case 'show_options':
        return (
          <PlannerOptions
            options={pendingInput.data.options}
            onSelect={onOptionSelect}
          />
        );
      case 'render_city_picker':
      case 'show_city_search':
        return (
          <div className="py-1">
            <CitySearchInput
              purpose={pendingInput.data.purpose}
              suggestions={pendingInput.data.suggestions}
              onSelect={onCitySelect}
            />
          </div>
        );
      case 'show_city_cards':
        return (
          <HeaderHint label="Tap a day in the trip schedule above and pick the city you want." />
        );
      case 'render_nights_allocator':
      case 'show_days_allocation':
        return (
          <HeaderHint label="Use the +/- nights buttons in the schedule header above to allocate days." />
        );
      case 'render_date_picker':
      case 'show_date_picker':
        return (
          <HeaderHint label="Pick your dates in the trip schedule header above, or tell me when you want to travel." />
        );
      case 'show_route_summary':
        return (
          <div className="py-1">
            <RouteSummaryWithData
              trip={trip}
              showDays={pendingInput.data.showDays}
              showDates={pendingInput.data.showDates}
              confirmable={pendingInput.data.confirmable}
              onConfirm={() => onOptionSelect({ id: 'confirm', label: 'Looks good!' })}
              onEdit={() => onOptionSelect({ id: 'edit', label: 'Make changes' })}
            />
          </div>
        );
      case 'parse_itinerary':
        return (
          <div className="py-1">
            <ParsedItineraryCard
              data={pendingInput.data}
              onConfirm={onParsedItineraryConfirm}
              onRefine={onParsedItineraryRefine}
            />
          </div>
        );
      case 'render_trip_card':
        // Simple inline trip card — shows what's been captured
        return (
          <div className="py-1 px-3 rounded-xl border border-[#e5e0d8] bg-[#faf8f5] text-[12px] text-[#4a4540]">
            <p className="font-medium text-[#2a2520] mb-1">Trip updated</p>
            {pendingInput.data?.highlightChanges?.map((field, i) => (
              <span key={i} className="inline-block mr-1.5 px-2 py-0.5 rounded-full bg-[#e5e0d8] text-[10px]">{field}</span>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  // Group consecutive messages by role for visual separation
  const shouldShowDivider = (msg, prevMsg) => {
    if (!prevMsg) return false;
    return prevMsg.role === 'user' && msg.role === 'assistant';
  };

  return (
    <div className="px-3 py-3 space-y-1">
      <AnimatePresence mode="popLayout">
        {messages.map((message, index) => {
          if (message.role === 'assistant' && !message.content) return null;
          const prevMsg = index > 0 ? messages[index - 1] : null;
          return (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
            >
              {shouldShowDivider(message, prevMsg) && <StepDivider label="" />}
              {message.role === 'assistant' ? (
                <CompactAIMessage content={message.content} />
              ) : message.role === 'system_event' ? (
                <CompactSystemEvent content={message.content} />
              ) : (
                <CompactUserMessage content={message.content} />
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Streaming indicator */}
      {isStreaming && (
        <div className="py-2 flex items-center gap-1.5">
          <span className="w-1 h-1 rounded-full bg-[#c9a227] animate-pulse" />
          <span className="w-1 h-1 rounded-full bg-[#c9a227] animate-pulse" style={{ animationDelay: '0.15s' }} />
          <span className="w-1 h-1 rounded-full bg-[#c9a227] animate-pulse" style={{ animationDelay: '0.3s' }} />
        </div>
      )}

      {/* Pending input UI */}
      {pendingInput && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {renderPendingInput()}
        </motion.div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
