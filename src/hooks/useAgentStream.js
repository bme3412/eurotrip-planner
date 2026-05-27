'use client';

import { useState, useCallback, useRef } from 'react';
import { createSSEBuffer, feedSSE, flushSSE } from '@/lib/conversation/sseParser';

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

  /** Handle a tool call from the SSE stream (client-side dispatch). */
  const handleToolCall = useCallback((toolName, toolInput) => {
    switch (toolName) {
      case 'render_trip_card':
      case 'render_city_picker':
      case 'render_options':
      case 'render_date_picker':
      case 'render_nights_allocator':
      case 'confirm_changes':
        setPendingInput({ type: toolName, data: toolInput });
        break;

      case 'finalize_trip':
        if (onFinalize) {
          onFinalize(toolInput?.summary);
        } else {
          setIsFinalized(true);
        }
        break;

      // Data tools are handled server-side; ignore the client event
      case 'extract_trip_data':
      case 'resolve_cities':
      case 'get_route_options':
      case 'suggest_cities':
      case 'get_city_info':
      case 'optimize_route':
        break;

      default:
        console.warn('[agent] Unknown tool:', toolName);
    }
  }, [setPendingInput, setIsFinalized, onFinalize]);

  /** Dispatch a single parsed SSE data object. Returns updated fullContent. */
  const handleSSEData = useCallback((data, fullContent) => {
    switch (data.type) {
      case 'content':
      case 'content_delta':
        fullContent += data.content;
        updateLastAssistantMessage(fullContent);
        break;

      case 'tool_use':
        handleToolCall(data.name, data.input);
        if (onToolCall) onToolCall(data.name, data.input);
        break;

      case 'state_update':
        if (data.state) {
          setTripState(data.state);
        }
        break;

      case 'tool_result':
      case 'tool_error':
        // Informational; could surface in debug UI
        break;

      case 'error':
        throw new Error(data.error || 'Server error');

      case 'incomplete':
        // Server hit MAX_LOOPS or bailed early; surface the nudge to the user.
        if (data.message) {
          fullContent += (fullContent ? '\n\n' : '') + data.message;
          updateLastAssistantMessage(fullContent);
        }
        break;

      case 'done':
        break;
    }
    return fullContent;
  }, [updateLastAssistantMessage, handleToolCall, setTripState, onToolCall]);

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
