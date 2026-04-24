'use client';

import { useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import { CitySearchInput } from '../conversation/InputArea';
import { RouteSummaryWithData } from '../conversation/RouteSummary';
import ParsedItineraryCard from '../conversation/ParsedItineraryCard';

// ── Compact AI message — card style with directional bubble ──────
function CompactAIMessage({ content }) {
  if (!content) return null;
  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      className="py-1.5 max-w-[92%]"
    >
      <div className="rounded-2xl rounded-tl-md bg-[#faf8f5] border border-[#e5e0d8]/60 px-3.5 py-2.5">
        <p className="text-[13px] text-[#4a4540] leading-relaxed whitespace-pre-wrap">{content}</p>
      </div>
    </motion.div>
  );
}

// ── User message — right-aligned pill with directional corner ────
function CompactUserMessage({ content }) {
  if (!content) return null;
  return (
    <div className="flex justify-end py-1">
      <div className="bg-[#2a2520] text-white text-[12px] rounded-2xl rounded-tr-md px-3.5 py-2 max-w-[85%] leading-snug whitespace-pre-wrap">
        {content}
      </div>
    </div>
  );
}

// ── System event — centered pill style ───────────────────────────
function CompactSystemEvent({ content }) {
  if (!content) return null;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="py-1.5 flex justify-center"
    >
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f0ede6] text-[11px] text-[#6a6459] italic border border-[#e5e0d8]/50">
        <ArrowUp className="w-3 h-3 text-[#b5b0a8]" aria-hidden="true" />
        {content}
      </span>
    </motion.div>
  );
}

// ── Hint pointing at the trip schedule header ────────────────────
function HeaderHint({ label }) {
  return (
    <div className="py-1.5 px-3 rounded-xl border border-dashed border-[#d5d0c8] bg-[#faf8f5] text-[12px] text-[#6a6459] flex items-center gap-2">
      <ArrowUp className="w-3.5 h-3.5 text-[#8a8578] shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

// ── Styled option cards ──────────────────────────────────────────
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

// ── Section divider ──────────────────────────────────────────────
function StepDivider({ label }) {
  return (
    <div className="flex items-center gap-2 py-2">
      <div className="flex-1 h-px bg-[#e5e0d8]" />
      {label && <span className="text-[8px] font-semibold uppercase tracking-[0.2em] text-[#b5b0a8]">{label}</span>}
      <div className="flex-1 h-px bg-[#e5e0d8]" />
    </div>
  );
}

// ── Bouncing typing indicator ────────────────────────────────────
function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      role="status"
      aria-live="polite"
      aria-label="Trip planner is typing"
      className="py-2 max-w-[92%]"
    >
      <div className="rounded-2xl rounded-tl-md bg-[#faf8f5] border border-[#e5e0d8]/60 px-4 py-3 inline-flex items-center gap-1.5">
        {[0, 1, 2].map(i => (
          <motion.span
            key={i}
            aria-hidden="true"
            className="w-1.5 h-1.5 rounded-full bg-[#c9a227]"
            animate={{ y: [0, -4, 0] }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.15,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
    </motion.div>
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
  onParsedItineraryConfirm,
  onParsedItineraryRefine,
  scrollContainerRef: externalScrollRef,
}) {
  const bottomRef = useRef(null);
  const userScrolledUpRef = useRef(false);

  // Track if user has manually scrolled up
  useEffect(() => {
    const container = externalScrollRef?.current;
    if (!container) return;

    const handleScroll = () => {
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      userScrolledUpRef.current = distanceFromBottom > 200;
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [externalScrollRef]);

  // Auto-scroll to bottom when messages or streaming state change
  // (unless the user has scrolled up to read earlier messages).
  useEffect(() => {
    if (userScrolledUpRef.current) return;
    // Use requestAnimationFrame to ensure DOM has updated.
    // 'auto' is the spec-defined instant option; 'instant' is non-standard.
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({
        behavior: messages.length <= 2 ? 'auto' : 'smooth',
        block: 'end',
      });
    });
  }, [messages, pendingInput, isStreaming]);

  const scrollToBottom = useCallback(() => {
    userScrolledUpRef.current = false;
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const renderPendingInput = () => {
    if (!pendingInput) return null;

    switch (pendingInput.type) {
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
      case 'confirm_changes':
        return (
          <div className="py-1 space-y-2">
            <div className="px-3 py-2.5 rounded-xl border border-amber-200 bg-amber-50">
              <p className="text-[12px] font-medium text-amber-900 mb-1.5">
                {pendingInput.data?.summary || 'Confirm these changes?'}
              </p>
              {pendingInput.data?.changes?.map((change, i) => (
                <div key={i} className="text-[11px] text-amber-800 flex gap-2">
                  <span className="font-medium">{change.field}:</span>
                  {change.from && <span className="line-through text-amber-600">{change.from}</span>}
                  <span>{change.to}</span>
                </div>
              ))}
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => onOptionSelect({ id: 'confirm', label: 'Yes, apply those changes' })}
                  className="px-3 py-1 text-[11px] font-medium rounded-full bg-amber-600 text-white hover:bg-amber-700 transition-colors"
                >
                  Apply
                </button>
                <button
                  onClick={() => onOptionSelect({ id: 'reject', label: 'No, keep it as is' })}
                  className="px-3 py-1 text-[11px] font-medium rounded-full border border-amber-300 text-amber-700 hover:bg-amber-100 transition-colors"
                >
                  Keep as is
                </button>
              </div>
            </div>
          </div>
        );
      case 'render_trip_card':
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

  const shouldShowDivider = (msg, prevMsg) => {
    if (!prevMsg) return false;
    return prevMsg.role === 'user' && msg.role === 'assistant';
  };

  return (
    <div className="px-3 py-3 space-y-1 relative">
      <AnimatePresence mode="popLayout">
        {messages.map((message, index) => {
          if (message.role === 'assistant' && !message.content) return null;
          const prevMsg = index > 0 ? messages[index - 1] : null;
          return (
            <motion.div
              key={message.id}
              layout
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

      {/* Streaming typing indicator — only show before content arrives */}
      {isStreaming && (!messages.length || !messages[messages.length - 1]?.content) && (
        <TypingIndicator />
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
