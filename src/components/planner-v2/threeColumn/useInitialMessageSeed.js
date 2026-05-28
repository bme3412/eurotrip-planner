'use client';

import { useEffect, useRef } from 'react';

/**
 * Once the conversation has started and the welcome message has rendered,
 * send the user's initial message (e.g. the prompt typed on the landing page
 * before navigation) exactly once.
 */
export function useInitialMessageSeed({
  initialUserMessage,
  hasStarted,
  isStreaming,
  messagesLength,
  sendMessage,
}) {
  const seededRef = useRef(false);

  useEffect(() => {
    if (!initialUserMessage) return;
    if (seededRef.current) return;
    if (!hasStarted) return;
    if (isStreaming) return;
    if (messagesLength === 0) return;
    seededRef.current = true;
    sendMessage(initialUserMessage);
  }, [initialUserMessage, hasStarted, isStreaming, messagesLength, sendMessage]);
}
