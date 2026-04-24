'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

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

      case 'done':
        break;
    }
    return fullContent;
  }, [updateLastAssistantMessage, handleToolCall, setTripState, onToolCall]);

  /** Process an SSE response stream from /api/conversation. */
  const processStream = useCallback(async (response) => {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let lineBuffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      lineBuffer += chunk;

      // Split on newlines; the last segment may be incomplete so keep it buffered
      const lines = lineBuffer.split('\n');
      lineBuffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr) continue;

        let data;
        try { data = JSON.parse(jsonStr); } catch { continue; }

        console.log('[sse]', data.type, data.type === 'tool_use' ? data.name : '');
        fullContent = handleSSEData(data, fullContent);
      }
    }

    console.log('[sse] Stream reader done. fullContent length:', fullContent.length);

    // Process any remaining data in the buffer after stream closes
    if (lineBuffer.trim()) {
      const line = lineBuffer.trim();
      if (line.startsWith('data: ')) {
        const jsonStr = line.slice(6).trim();
        if (jsonStr) {
          try {
            const data = JSON.parse(jsonStr);
            fullContent = handleSSEData(data, fullContent);
          } catch { /* incomplete final line */ }
        }
      }
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
