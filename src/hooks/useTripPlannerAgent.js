'use client';

import { useState, useCallback, useRef } from 'react';
import { initialTripState } from '@/lib/conversation/tripState';
import { useMessages } from './useMessages';
import { useTripState } from './useTripState';
import { useDirectManipulation } from './useDirectManipulation';
import { useAgentStream } from './useAgentStream';
import { useItineraryGeneration } from './useItineraryGeneration';

/**
 * Coordinator hook for the agentic trip planner V2.
 * Composes focused sub-hooks and wires them together.
 */
/**
 * Summarize a tool call for inclusion in the tool history context.
 * Include key input args for data tools so Claude doesn't repeat them
 * with identical arguments on the next turn.
 */
function summarizeToolCall(name, input) {
  switch (name) {
    case 'extract_trip_data': {
      const fields = Object.keys(input || {}).filter((k) => input[k] != null);
      return `Extracted trip data (${fields.join(', ') || 'no new fields'})`;
    }
    case 'resolve_cities':
      return `Resolved cities: ${(input?.names || []).join(', ')}`;
    case 'get_route_options':
      return `Looked up route: ${input?.fromCityId} → ${input?.toCityId}`;
    case 'suggest_cities':
      return `Suggested cities near ${input?.fromCityId}${input?.toCityId ? ` → ${input.toCityId}` : ''}`;
    case 'get_city_info':
      return `Fetched city info: ${input?.cityId}`;
    case 'optimize_route':
      return `Optimized route: [${(input?.cityIds || []).join(', ')}]`;
    case 'render_options':
      return `Showed options: ${(input?.options || []).map((o) => o.label).join(', ')}`;
    case 'render_city_picker':
      return `Showed city picker (${input?.purpose || 'add_city'})`;
    case 'render_trip_card':
      return 'Showed trip summary card';
    case 'render_date_picker':
      return `Showed date picker (${input?.mode || 'range'})`;
    case 'render_nights_allocator':
      return 'Showed nights allocator';
    case 'confirm_changes':
      return `Asked to confirm: ${input?.summary || 'changes'}`;
    case 'finalize_trip':
      return 'Finalized trip';
    default:
      return `Called ${name}`;
  }
}

// Stable per-session id for log correlation. Regenerated on reset.
function makeSessionId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useTripPlannerAgent() {
  const [pendingInput, setPendingInput] = useState(null);
  const [hasStarted, setHasStarted] = useState(false);
  const startingRef = useRef(false);
  const toolHistoryRef = useRef([]);
  const sessionIdRef = useRef(makeSessionId());

  // ── Sub-hooks ────────────────────────────────────────────
  const {
    messages, messagesRef, addMessage, updateLastAssistantMessage,
    postSystemEvent, clearMessages, cleanupEmptyTrailing, buildApiMessages,
  } = useMessages();

  const {
    tripState, setTripState, tripStateRef,
    isFinalized, setIsFinalized, gaps, resetTripState,
  } = useTripState();

  const {
    generationPhase, itinerary, generationError,
    requestFinalization, confirmGeneration, cancelFinalization,
    retryGeneration, resetGeneration,
  } = useItineraryGeneration({ tripStateRef });

  // Track tool calls for multi-turn context
  const handleToolHistoryEntry = useCallback((name, input) => {
    toolHistoryRef.current.push({
      tool: name,
      summary: summarizeToolCall(name, input),
    });
    // Keep last 10 entries
    if (toolHistoryRef.current.length > 10) {
      toolHistoryRef.current = toolHistoryRef.current.slice(-10);
    }
  }, []);

  const {
    isStreaming, setIsStreaming, error, setError,
    processStream, abortStream, abortControllerRef, dismissError: rawDismissError,
  } = useAgentStream({
    updateLastAssistantMessage,
    setTripState,
    setPendingInput,
    setIsFinalized,
    onFinalize: requestFinalization,
    onToolCall: handleToolHistoryEntry,
  });

  const {
    assignDaysToCity, unassignDays, setCityNights, setTripDates, addCity,
  } = useDirectManipulation({ tripStateRef, setTripState, postSystemEvent });

  // ── Start conversation ─────────────────────────────────────
  const startConversation = useCallback(async () => {
    if (startingRef.current || hasStarted) return;
    startingRef.current = true;
    setHasStarted(true);

    if (messagesRef.current.length > 0) return;

    setIsStreaming(true);
    addMessage('assistant', '');

    const controller = new AbortController();
    abortControllerRef.current = controller;
    let hadError = false;

    try {
      const response = await fetch('/api/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [],
          tripState: initialTripState,
          isStart: true,
          sessionId: sessionIdRef.current,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`API error ${response.status}: ${body.slice(0, 200)}`);
      }

      await processStream(response);
    } catch (err) {
      if (err.name === 'AbortError') return;
      hadError = true;
      console.error('[agent] Start error:', err);
      setError(err.message);
      updateLastAssistantMessage('Something went wrong. Please reload the page.');
    } finally {
      setIsStreaming(false);
      if (!hadError) cleanupEmptyTrailing();
    }
  }, [hasStarted, messagesRef, addMessage, updateLastAssistantMessage, processStream, setIsStreaming, setError, cleanupEmptyTrailing, abortControllerRef]);

  // ── Send message ───────────────────────────────────────────
  const sendMessage = useCallback(async (userMessage, selectedOption = null) => {
    setError(null);
    setPendingInput(null);

    const content = selectedOption?.label || userMessage;
    const apiMessages = buildApiMessages(content);

    // Add to UI
    addMessage('user', content);
    setIsStreaming(true);
    addMessage('assistant', '');

    const controller = new AbortController();
    abortControllerRef.current = controller;
    let hadError = false;

    try {
      const response = await fetch('/api/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          tripState: tripStateRef.current,
          recentToolHistory: toolHistoryRef.current.slice(-10),
          sessionId: sessionIdRef.current,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`API error ${response.status}: ${body.slice(0, 200)}`);
      }

      await processStream(response);
    } catch (err) {
      if (err.name === 'AbortError') return;
      hadError = true;
      console.error('[agent] Send error:', err);
      setError(err.message);
      updateLastAssistantMessage('I had trouble responding. Please try again or rephrase your message.');
    } finally {
      setIsStreaming(false);
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      if (!hadError) cleanupEmptyTrailing();
    }
  }, [addMessage, updateLastAssistantMessage, processStream, buildApiMessages, tripStateRef, setIsStreaming, setError, cleanupEmptyTrailing, abortControllerRef]);

  // ── Option / city / days / date handlers ─────────────────
  const handleOptionSelect = useCallback((option) => {
    sendMessage('', option);
  }, [sendMessage]);

  const handleCitySelect = useCallback((city, purpose) => {
    if (!city) {
      sendMessage("I'll skip adding more cities for now");
      return;
    }
    const verb = purpose === 'start' ? 'start in' : purpose === 'end' ? 'end in' : 'add';
    sendMessage(`I'll ${verb} ${city.name}`);
  }, [sendMessage]);

  const handleDaysChange = useCallback((daysMap) => {
    const entries = Object.entries(daysMap);
    const summary = entries.map(([, days]) => `${days}d`).join(', ');
    sendMessage(`I'll go with: ${summary}`);
  }, [sendMessage]);

  const handleDateSelect = useCallback((dates) => {
    if (dates.start && dates.end) {
      sendMessage(`I'll travel from ${dates.start} to ${dates.end}`);
    } else if (dates.month) {
      sendMessage(`I'll travel in ${dates.month}`);
    } else {
      sendMessage("I'm flexible on dates");
    }
  }, [sendMessage]);

  // ── Dismiss error ──────────────────────────────────────────
  const dismissError = useCallback(() => {
    rawDismissError();
    cleanupEmptyTrailing();
  }, [rawDismissError, cleanupEmptyTrailing]);

  // ── Reset ──────────────────────────────────────────────────
  const reset = useCallback(() => {
    abortStream();
    clearMessages();
    resetTripState();
    setPendingInput(null);
    setHasStarted(false);
    startingRef.current = false;
    toolHistoryRef.current = [];
    sessionIdRef.current = makeSessionId();
    resetGeneration();
  }, [abortStream, clearMessages, resetTripState, resetGeneration]);

  return {
    // State
    messages,
    tripState,
    isStreaming,
    pendingInput,
    error,
    hasStarted,
    isFinalized,
    gaps,

    // Generation state
    generationPhase,
    itinerary,
    generationError,

    // Actions
    sendMessage,
    startConversation,
    handleOptionSelect,
    handleCitySelect,
    handleDaysChange,
    handleDateSelect,
    reset,
    dismissError,
    setPendingInput,
    setTripState,

    // Generation actions
    confirmGeneration,
    cancelFinalization,
    retryGeneration,
    resetGeneration,

    // Direct-manipulation mutators (used by TripScheduleHeader)
    assignDaysToCity,
    unassignDays,
    setCityNights,
    addCity,
    setTripDates,
    postSystemEvent,
  };
}
