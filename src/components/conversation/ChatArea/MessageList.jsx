'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AIMessage from './AIMessage';
import UserMessage from './UserMessage';
import TypingIndicator from './TypingIndicator';

/**
 * MessageList - Scrollable list of conversation messages
 */
export default function MessageList({
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
  const containerRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, pendingInput]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
    >
      <AnimatePresence initial={false} mode="popLayout">
        {messages.map((message, index) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{
              type: 'spring',
              stiffness: 500,
              damping: 40,
              mass: 1,
            }}
            layout
          >
            {message.role === 'assistant' ? (
              <AIMessage
                content={message.content}
                richContent={message.richContent}
                isLatest={index === messages.length - 1}
                pendingInput={index === messages.length - 1 ? pendingInput : null}
                trip={trip}
                onOptionSelect={onOptionSelect}
                onCitySelect={onCitySelect}
                onDaysChange={onDaysChange}
                onDateSelect={onDateSelect}
                onParsedItineraryConfirm={onParsedItineraryConfirm}
                onParsedItineraryRefine={onParsedItineraryRefine}
              />
            ) : (
              <UserMessage content={message.content} />
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Typing indicator when streaming */}
      {isStreaming && messages.length > 0 && messages[messages.length - 1]?.content === '' && (
        <TypingIndicator />
      )}

      {/* Scroll anchor */}
      <div ref={bottomRef} />
    </div>
  );
}
