'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { initialTripState, mergeTripData } from '@/lib/conversation/tripState';
import { analyzeGaps } from '@/lib/conversation/gapAnalysis';
import {
  assignDaysToCity as assignDaysToCityPure,
  unassignDays as unassignDaysPure,
  setCityNights as setCityNightsPure,
} from '@/lib/conversation/dayAssignments';

const INITIAL_USER_MESSAGE = 'I want to plan a European trip.';

function generateId() {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Hook for the agentic trip planner V2.
 * Manages trip state, messages, SSE streaming, and tool call handling.
 */
export function useTripPlannerAgent() {
  const [messages, setMessages] = useState([]);
  const [tripState, setTripState] = useState(initialTripState);
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingInput, setPendingInput] = useState(null);
  const [error, setError] = useState(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [isFinalized, setIsFinalized] = useState(false);

  // Refs for latest values (avoid stale closures)
  const messagesRef = useRef([]);
  const tripStateRef = useRef(initialTripState);
  const startingRef = useRef(false);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    tripStateRef.current = tripState;
  }, [tripState]);

  // Gap analysis (derived from tripState)
  const gaps = analyzeGaps(tripState);

  // ── Message helpers ────────────────────────────────────────
  const addMessage = useCallback((role, content) => {
    const msg = { id: generateId(), role, content, timestamp: new Date() };
    setMessages(prev => [...prev, msg]);
    return msg;
  }, []);

  const updateLastAssistantMessage = useCallback((content) => {
    setMessages(prev => {
      const arr = [...prev];
      const last = arr[arr.length - 1];
      if (last?.role === 'assistant') {
        arr[arr.length - 1] = { ...last, content };
      }
      return arr;
    });
  }, []);

  // ── Tool call handler (client-side) ────────────────────────
  const handleToolCall = useCallback((toolName, toolInput) => {
    // UI tools → set pendingInput for the component to render
    switch (toolName) {
      case 'render_trip_card':
      case 'render_city_picker':
      case 'render_options':
      case 'render_date_picker':
      case 'render_nights_allocator':
        setPendingInput({ type: toolName, data: toolInput });
        break;

      case 'finalize_trip':
        setIsFinalized(true);
        break;

      // Data tools are handled server-side; we just ignore the client event
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
  }, []);

  // ── SSE stream processor ───────────────────────────────────
  const processStream = useCallback(async (response) => {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr) continue;

        let data;
        try { data = JSON.parse(jsonStr); } catch { continue; }

        switch (data.type) {
          case 'content':
            fullContent += data.content;
            updateLastAssistantMessage(fullContent);
            break;

          case 'tool_use':
            handleToolCall(data.name, data.input);
            break;

          case 'state_update':
            // Server merged trip state — apply it
            if (data.state) {
              setTripState(data.state);
            }
            break;

          case 'tool_result':
            // Resolved cities or other server results — could update UI
            break;

          case 'error':
            throw new Error(data.error || 'Server error');

          case 'done':
            break;
        }
      }
    }
  }, [updateLastAssistantMessage, handleToolCall]);

  // ── Start conversation ─────────────────────────────────────
  const startConversation = useCallback(async () => {
    if (startingRef.current || hasStarted) return;
    startingRef.current = true;
    setHasStarted(true);

    if (messagesRef.current.length > 0) return;

    setIsStreaming(true);
    addMessage('assistant', '');

    try {
      const response = await fetch('/api/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [],
          tripState: initialTripState,
          isStart: true,
        }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`API error ${response.status}: ${body.slice(0, 200)}`);
      }

      await processStream(response);
    } catch (err) {
      console.error('[agent] Start error:', err);
      setError(err.message);
      updateLastAssistantMessage('Something went wrong. Please reload the page.');
    } finally {
      setIsStreaming(false);
      // Clean up empty trailing assistant messages
      setMessages(prev => {
        const last = prev[prev.length - 1];
        return last?.role === 'assistant' && !last.content ? prev.slice(0, -1) : prev;
      });
    }
  }, [hasStarted, addMessage, updateLastAssistantMessage, processStream]);

  // ── Send message ───────────────────────────────────────────
  const sendMessage = useCallback(async (userMessage, selectedOption = null) => {
    setError(null);
    setPendingInput(null);

    const content = selectedOption?.label || userMessage;

    // Build API messages from ref (always current)
    // system_event lines are surfaced to the model as user notes so it can
    // react to direct-manipulation edits, but they're never sent as a separate
    // role (the API only accepts user/assistant).
    const currentMessages = messagesRef.current
      .filter(m => m.content)
      .map(m => {
        if (m.role === 'system_event') {
          return { role: 'user', content: `[user edited the schedule] ${m.content}` };
        }
        return { role: m.role, content: m.content };
      });

    const rawApiMessages = [
      { role: 'user', content: INITIAL_USER_MESSAGE },
      ...currentMessages,
      { role: 'user', content },
    ];

    // Merge consecutive same-role
    const apiMessages = [];
    for (const msg of rawApiMessages) {
      const prev = apiMessages[apiMessages.length - 1];
      if (prev && prev.role === msg.role) {
        prev.content += '\n' + msg.content;
      } else {
        apiMessages.push({ ...msg });
      }
    }

    // Add to UI
    addMessage('user', content);
    setIsStreaming(true);
    addMessage('assistant', '');

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch('/api/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          tripState: tripStateRef.current,
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
      console.error('[agent] Send error:', err);
      setError(err.message);
      updateLastAssistantMessage('');
    } finally {
      setIsStreaming(false);
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setMessages(prev => {
        const last = prev[prev.length - 1];
        return last?.role === 'assistant' && !last.content ? prev.slice(0, -1) : prev;
      });
    }
  }, [addMessage, updateLastAssistantMessage, processStream]);

  // ── Option select handler ──────────────────────────────────
  const handleOptionSelect = useCallback((option) => {
    sendMessage('', option);
  }, [sendMessage]);

  // ── City select handler ────────────────────────────────────
  const handleCitySelect = useCallback((city, purpose) => {
    if (!city) {
      sendMessage("I'll skip adding more cities for now");
      return;
    }
    const verb = purpose === 'start' ? 'start in' : purpose === 'end' ? 'end in' : 'add';
    sendMessage(`I'll ${verb} ${city.name}`);
  }, [sendMessage]);

  // ── Days allocation handler ────────────────────────────────
  const handleDaysChange = useCallback((daysMap) => {
    const entries = Object.entries(daysMap);
    const summary = entries.map(([, days]) => `${days}d`).join(', ');
    sendMessage(`I'll go with: ${summary}`);
  }, [sendMessage]);

  // ── Date select handler ────────────────────────────────────
  const handleDateSelect = useCallback((dates) => {
    if (dates.start && dates.end) {
      sendMessage(`I'll travel from ${dates.start} to ${dates.end}`);
    } else if (dates.month) {
      sendMessage(`I'll travel in ${dates.month}`);
    } else {
      sendMessage("I'm flexible on dates");
    }
  }, [sendMessage]);

  // ── System event message helper ────────────────────────────
  // Adds a small italic "you moved 3 days to Rome" line in the chat to keep
  // direct-manipulation edits visible to the user (and to the agent on the
  // next turn since the line is preserved in the message log).
  const postSystemEvent = useCallback((text) => {
    if (!text) return;
    const msg = {
      id: generateId(),
      role: 'system_event',
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, msg]);
  }, []);

  // ── Direct-manipulation mutators (header) ──────────────────
  const assignDaysToCity = useCallback(
    (cityId, dayIndices, { notify = true } = {}) => {
      if (!cityId || !dayIndices?.length) return;
      const before = tripStateRef.current;
      const next = assignDaysToCityPure(before, dayIndices, cityId);
      if (next === before) return;
      setTripState(next);
      if (notify) {
        const city = next.route.cities.find(
          (c) => (c.id || c.name?.toLowerCase()) === cityId
        );
        const dayLabel =
          dayIndices.length === 1
            ? `day ${dayIndices[0] + 1}`
            : `${dayIndices.length} days`;
        postSystemEvent(`You assigned ${dayLabel} to ${city?.name || 'a city'}.`);
      }
    },
    [postSystemEvent]
  );

  const unassignDays = useCallback(
    (dayIndices, { notify = true } = {}) => {
      if (!dayIndices?.length) return;
      const before = tripStateRef.current;
      const next = unassignDaysPure(before, dayIndices);
      if (next === before) return;
      setTripState(next);
      if (notify) {
        const dayLabel =
          dayIndices.length === 1
            ? `day ${dayIndices[0] + 1}`
            : `${dayIndices.length} days`;
        postSystemEvent(`You freed up ${dayLabel}.`);
      }
    },
    [postSystemEvent]
  );

  const setCityNights = useCallback(
    (cityId, nights, { notify = true } = {}) => {
      if (!cityId || !Number.isFinite(nights)) return;
      const before = tripStateRef.current;
      const next = setCityNightsPure(before, cityId, nights);
      if (next === before) return;
      setTripState(next);
      if (notify) {
        const city = next.route.cities.find(
          (c) => (c.id || c.name?.toLowerCase()) === cityId
        );
        postSystemEvent(`You set ${city?.name || 'a city'} to ${nights} nights.`);
      }
    },
    [postSystemEvent]
  );

  /**
   * Set trip start/end dates from the schedule header (native date inputs).
   * Derives totalNights when both dates are present (exclusive end → nights count).
   */
  const setTripDates = useCallback(
    (partial = {}, { notify = true } = {}) => {
      if (!('startDate' in partial) && !('endDate' in partial)) return;
      const before = tripStateRef.current;
      const next = JSON.parse(JSON.stringify(before));
      if ('startDate' in partial) {
        next.dates.startDate = partial.startDate || null;
      }
      if ('endDate' in partial) {
        next.dates.endDate = partial.endDate || null;
      }
      const s = next.dates.startDate;
      const e = next.dates.endDate;
      if (s && e) {
        const sd = new Date(`${s}T00:00:00`);
        const ed = new Date(`${e}T00:00:00`);
        if (
          !Number.isNaN(sd.getTime()) &&
          !Number.isNaN(ed.getTime()) &&
          ed >= sd
        ) {
          const nights = Math.round((ed - sd) / (1000 * 60 * 60 * 24));
          if (nights > 0) next.dates.totalNights = nights;
        }
      }
      setTripState(next);
      if (notify && s && e) {
        const nights = next.dates.totalNights;
        postSystemEvent(
          `You set trip dates to ${s} through ${e}${nights != null ? ` (${nights} nights).` : '.'}`
        );
      }
    },
    [postSystemEvent]
  );

  const addCity = useCallback(
    ({ name, country = null } = {}, { notify = true } = {}) => {
      if (!name?.trim()) return null;
      const cleanName = name.trim();
      const before = tripStateRef.current;
      const next = mergeTripData(before, {
        cities: [{ name: cleanName, country, role: 'stop', nights: 0 }],
      });
      // Ensure the new city has an id we can address it by.
      const created = next.route.cities.find(
        (c) => (c.id || c.name?.toLowerCase()) === cleanName.toLowerCase()
      );
      if (created && !created.id) created.id = cleanName.toLowerCase();
      setTripState(next);
      if (notify) postSystemEvent(`You added ${cleanName} to the route.`);
      return created;
    },
    [postSystemEvent]
  );

  // ── Reset ──────────────────────────────────────────────────
  const reset = useCallback(() => {
    setMessages([]);
    setTripState(initialTripState);
    setIsStreaming(false);
    setPendingInput(null);
    setError(null);
    setHasStarted(false);
    setIsFinalized(false);
    startingRef.current = false;
    abortControllerRef.current = null;
  }, []);

  // ── Dismiss error ──────────────────────────────────────────
  const dismissError = useCallback(() => {
    setError(null);
    setMessages(prev => {
      const last = prev[prev.length - 1];
      return last?.role === 'assistant' && !last.content ? prev.slice(0, -1) : prev;
    });
  }, []);

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

    // Direct-manipulation mutators (used by TripScheduleHeader)
    assignDaysToCity,
    unassignDays,
    setCityNights,
    addCity,
    setTripDates,
    postSystemEvent,
  };
}
