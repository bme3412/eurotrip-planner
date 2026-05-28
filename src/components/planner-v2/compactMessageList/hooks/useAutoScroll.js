import { useCallback, useEffect, useRef } from 'react';

/**
 * Tracks whether the user has scrolled up away from the bottom and auto-scrolls
 * back when new messages arrive (unless they're actively reading earlier ones).
 *
 * @param {object} args
 * @param {{current: HTMLElement|null}} args.scrollContainerRef - the parent scrollable element
 * @param {Array} args.messages - chat messages (used as a dep to trigger re-scroll)
 * @param {*} args.pendingInput - widget state that can also push new content in
 * @param {boolean} args.isStreaming - whether the AI is mid-stream
 * @returns {{bottomRef, scrollToBottom}}
 */
export default function useAutoScroll({ scrollContainerRef, messages, pendingInput, isStreaming }) {
  const bottomRef = useRef(null);
  const userScrolledUpRef = useRef(false);

  // Track if user has manually scrolled up
  useEffect(() => {
    const container = scrollContainerRef?.current;
    if (!container) return;

    const handleScroll = () => {
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      userScrolledUpRef.current = distanceFromBottom > 200;
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [scrollContainerRef]);

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

  return { bottomRef, scrollToBottom };
}
