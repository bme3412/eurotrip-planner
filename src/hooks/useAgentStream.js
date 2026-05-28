'use client';

import { useState, useCallback, useRef } from 'react';
import { createSSEBuffer, feedSSE, flushSSE } from '@/lib/conversation/sseParser';
import { dispatchAgentEvent } from '@/lib/conversation/agentDispatcher';

/**
 * Hook for SSE streaming, tool call dispatch, and abort/cleanup.
 */
export function useAgentStream({
  updateLastAssistantMessage,
  setTripState,
  setPendingInput,
  setIsFinalized,
  onFinalize,
  onToolCall,
}) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  // Note: we intentionally do NOT abort on unmount here.
  // React strict mode double-mounts in development, and aborting on the first
  // unmount kills the initial conversation fetch before it completes.
  // Streams are cleaned up explicitly via abortStream() or reset() instead.

  /** Dispatch a single parsed SSE data object. Returns updated fullContent. */
  const handleSSEData = useCallback((data, fullContent) => {
    return dispatchAgentEvent(data, fullContent, {
      updateLastAssistantMessage,
      setTripState,
      setPendingInput,
      setIsFinalized,
      onFinalize,
      onToolCall,
      onUnknownTool: (name) => console.warn('[agent] Unknown tool:', name),
    });
  }, [updateLastAssistantMessage, setTripState, setPendingInput, setIsFinalized, onFinalize, onToolCall]);

  /** Process an SSE response stream from /api/conversation. */
  const processStream = useCallback(async (response) => {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const buffer = createSSEBuffer();
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      for (const data of feedSSE(buffer, chunk)) {
        fullContent = handleSSEData(data, fullContent);
      }
    }

    for (const data of flushSSE(buffer)) {
      fullContent = handleSSEData(data, fullContent);
    }
  }, [handleSSEData]);

  const abortStream = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const dismissError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isStreaming,
    setIsStreaming,
    error,
    setError,
    processStream,
    abortStream,
    abortControllerRef,
    dismissError,
  };
}
