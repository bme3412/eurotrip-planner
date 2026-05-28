'use client';

import { motion, AnimatePresence } from 'framer-motion';

import {
  CompactAIMessage,
  CompactUserMessage,
  CompactSystemEvent,
} from './components/MessageComponents.jsx';
import { StepDivider, TypingIndicator } from './components/WidgetComponents.jsx';
import useAutoScroll from './hooks/useAutoScroll.js';
import usePendingInputRenderer from './hooks/usePendingInputRenderer.jsx';
import { buildMentionCities } from './lib/mentions.js';

function shouldShowDivider(msg, prevMsg) {
  if (!prevMsg) return false;
  return prevMsg.role === 'user' && msg.role === 'assistant';
}

/**
 * Compact chat-style message list used inside the planner-v2 chat column.
 * The orchestrator owns:
 *   - scroll behavior (delegated to `useAutoScroll`)
 *   - choosing which message bubble to render per role
 *   - rendering the active pending-input widget (delegated to `usePendingInputRenderer`)
 */
export default function CompactMessageList({
  messages,
  isStreaming,
  pendingInput,
  interaction,
  trip,
  onOptionSelect,
  onCitySelect,
  onRoutePresetSelect,
  onDatesPick,
  onFlexibleMonth,
  onFlexible,
  onParsedItineraryConfirm,
  onParsedItineraryRefine,
  scrollContainerRef,
}) {
  const mentionCities = buildMentionCities(trip);
  const { bottomRef } = useAutoScroll({
    scrollContainerRef,
    messages,
    pendingInput,
    isStreaming,
  });

  const pendingInputNode = usePendingInputRenderer({
    pendingInput,
    interaction,
    trip,
    onOptionSelect,
    onCitySelect,
    onRoutePresetSelect,
    onDatesPick,
    onFlexibleMonth,
    onFlexible,
    onParsedItineraryConfirm,
    onParsedItineraryRefine,
  });

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
                <CompactAIMessage content={message.content} mentionCities={mentionCities} />
              ) : message.role === 'system_event' ? (
                <CompactSystemEvent content={message.content} mentionCities={mentionCities} />
              ) : (
                <CompactUserMessage content={message.content} mentionCities={mentionCities} />
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
          {pendingInputNode}
        </motion.div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
