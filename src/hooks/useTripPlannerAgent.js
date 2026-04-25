'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { initialTripState } from '@/lib/conversation/tripState';
import { useAuth } from '@/contexts/AuthContext';
import { canPersistTripDraft, deriveTripTitle, normalizeTripState } from '@/lib/trips/tripLifecycle';
import { getLocalTripDraft, upsertLocalTripDraft } from '@/lib/trips/localTripDrafts';
import { hydrateRoutePreset } from '@/lib/planning/routePresets';
import { useMessages } from './useMessages';
import { useTripState } from './useTripState';
import { useDirectManipulation } from './useDirectManipulation';
import { useAgentStream } from './useAgentStream';
import { useItineraryGeneration } from './useItineraryGeneration';
import { buildCitySelectionMessage } from '@/lib/conversation/citySelectionMessage';

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

export function useTripPlannerAgent({ initialTripId = null, initialLocalTripId = null } = {}) {
  const { user, loading: authLoading, isSupabaseConfigured } = useAuth();
  const [pendingInput, setPendingInput] = useState(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [savedTripId, setSavedTripId] = useState(initialTripId);
  const [localTripId, setLocalTripId] = useState(initialLocalTripId);
  const [saveStatus, setSaveStatus] = useState(initialTripId || initialLocalTripId ? 'loading' : 'local');
  const [saveError, setSaveError] = useState(null);
  const [tripTitle, setTripTitle] = useState('');
  const [latestPlannerAction, setLatestPlannerAction] = useState(null);
  const startingRef = useRef(false);
  const toolHistoryRef = useRef([]);
  const sessionIdRef = useRef(makeSessionId());
  const tripIdRef = useRef(initialTripId);
  const loadedTripIdRef = useRef(null);
  const saveTimerRef = useRef(null);

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
  } = useItineraryGeneration({ tripStateRef, tripIdRef, user });

  useEffect(() => {
    tripIdRef.current = savedTripId;
  }, [savedTripId]);

  useEffect(() => {
    if (!initialTripId) return;
    if (authLoading) return;
    if (loadedTripIdRef.current === initialTripId) return;
    loadedTripIdRef.current = initialTripId;

    let cancelled = false;
    setSaveStatus('loading');
    const params = new URLSearchParams();
    if (user?.id) params.set('userId', user.id);
    if (user?.email) params.set('userEmail', user.email);
    const url = params.toString() ? `/api/trips/${initialTripId}?${params}` : `/api/trips/${initialTripId}`;
    fetch(url)
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then((trip) => {
        if (cancelled) return;
        if (trip?.trip_state) {
          setTripState(normalizeTripState(trip.trip_state));
        }
        setTripTitle(trip.title || '');
        setSavedTripId(trip.id);
        setSaveStatus('saved');
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('[agent] Failed to load trip draft:', error);
        setSaveError('Unable to load saved trip.');
        setSaveStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, initialTripId, setTripState, user?.email, user?.id]);

  useEffect(() => {
    if (!initialLocalTripId || initialTripId) return;

    const draft = getLocalTripDraft(initialLocalTripId);
    if (!draft?.trip_state) {
      setSaveError('Unable to load local trip draft.');
      setSaveStatus('error');
      return;
    }

    setTripState(normalizeTripState(draft.trip_state));
    setTripTitle(draft.title || '');
    setLocalTripId(draft.id);
    setSaveStatus('saved_local');
  }, [initialLocalTripId, initialTripId, setTripState]);

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

  const applyRoutePreset = useCallback((preset) => {
    const hydrated = hydrateRoutePreset(preset);
    if (!hydrated.cities?.length) return;

    setTripState((current) => ({
      ...current,
      route: {
        ...current.route,
        cities: hydrated.cities,
        routeShape: 'one-way',
      },
      dates: {
        ...current.dates,
        totalNights: current.dates.totalNights || hydrated.nights,
      },
      preferences: {
        ...current.preferences,
        pace: current.preferences.pace || hydrated.pace || 'balanced',
      },
      brief: {
        ...current.brief,
        intent: current.brief.intent || 'classic first Europe trip',
        assumptions: [
          ...(current.brief.assumptions || []),
          `${hydrated.title}: ${hydrated.subtitle}, ${hydrated.nights} nights total.`,
        ],
      },
    }));

    postSystemEvent(`Selected ${hydrated.title}: ${hydrated.subtitle}.`);
    setPendingInput(null);
  }, [postSystemEvent, setTripState]);

  const persistDraft = useCallback(async ({ manual = false, tripStateOverride = null } = {}) => {
    const draftTripState = tripStateOverride || tripState;
    if (!canPersistTripDraft(draftTripState)) {
      setSaveStatus(savedTripId ? 'saved' : localTripId ? 'saved_local' : 'local');
      if (manual) {
        setSaveError('Add at least one city and a time range before saving.');
      }
      return null;
    }

    const title = tripTitle.trim() || deriveTripTitle(draftTripState);
    const shouldSyncToAccount = isSupabaseConfigured && Boolean(user?.id || user?.email);

    if (!shouldSyncToAccount) {
      const draft = upsertLocalTripDraft({
        id: localTripId,
        tripState: draftTripState,
        title,
      });
      setLocalTripId(draft.id);
      setSaveStatus('saved_local');
      setSaveError(null);
      return draft;
    }

    try {
      setSaveStatus('saving');
      setSaveError(null);
      const method = savedTripId ? 'PUT' : 'POST';
      const url = savedTripId ? `/api/trips/${savedTripId}` : '/api/trips/drafts';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripState: draftTripState,
          title,
          userId: user?.id || null,
          userEmail: user?.email || null,
        }),
      });

      if (!res.ok) {
        const fallback = manual ? 'Save failed.' : 'Autosave failed.';
        const body = await res.clone().json().catch(async () => {
          const text = await res.text().catch(() => '');
          return { error: text || fallback };
        });
        setSaveError(body.error || fallback);
        setSaveStatus(res.status === 503 ? 'local' : 'error');
        return null;
      }

      const saved = await res.json();
      setSavedTripId(saved.id);
      setTripTitle(saved.title || title);
      setSaveStatus('saved');
      return saved;
    } catch (error) {
      console.warn('[agent] Failed to save trip:', error);
      setSaveError(manual ? 'Save failed.' : 'Autosave failed.');
      setSaveStatus('error');
      return null;
    }
  }, [isSupabaseConfigured, localTripId, savedTripId, tripState, tripTitle, user?.email, user?.id]);

  const handlePlannerAction = useCallback((action, nextTripState) => {
    if (!action) return;
    setLatestPlannerAction({
      ...action,
      savedAt: null,
      saveStatus: action.shouldSave ? 'saving' : 'idle',
    });
    if (action.confirmation) {
      postSystemEvent(action.confirmation);
    }
    if (action.shouldSave) {
      persistDraft({ tripStateOverride: nextTripState }).then((saved) => {
        setLatestPlannerAction((current) => {
          if (!current || current.type !== action.type || current.confirmation !== action.confirmation) {
            return current;
          }
          return {
            ...current,
            saveStatus: saved ? 'saved' : 'error',
            savedAt: saved ? new Date().toISOString() : null,
          };
        });
      });
    }
  }, [persistDraft, postSystemEvent]);

  const {
    assignDaysToCity, unassignDays, setCityNights, setTripDates, addCity, acceptSuggestedAllocation,
  } = useDirectManipulation({ tripStateRef, setTripState, onPlannerAction: handlePlannerAction });

  useEffect(() => {
    if (isStreaming) return;
    if (authLoading) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      persistDraft();
    }, 900);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [authLoading, isStreaming, persistDraft]);

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
    sendMessage(buildCitySelectionMessage(city, purpose, tripStateRef.current));
  }, [sendMessage, tripStateRef]);

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
    setSavedTripId(null);
    setLocalTripId(null);
    setTripTitle('');
    setLatestPlannerAction(null);
    setSaveStatus('local');
    setSaveError(null);
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
    savedTripId,
    localTripId,
    saveStatus,
    saveError,
    tripTitle,
    latestPlannerAction,

    // Actions
    sendMessage,
    startConversation,
    handleOptionSelect,
    handleCitySelect,
    handleDaysChange,
    handleDateSelect,
    applyRoutePreset,
    reset,
    dismissError,
    setPendingInput,
    setTripState,
    setTripTitle,
    saveNow: () => persistDraft({ manual: true }),

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
    acceptSuggestedAllocation,
    setTripDates,
    postSystemEvent,
  };
}
