'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

const STORAGE_KEY = 'eurotrip_conversation';

/**
 * Save conversation state to localStorage
 */
function saveToStorage(trip, messages, hasStarted) {
  if (typeof window === 'undefined') return;
  try {
    const data = {
      trip,
      messages: messages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      })),
      hasStarted,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save conversation:', e);
  }
}

/**
 * Load conversation state from localStorage
 */
function loadFromStorage() {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;

    const data = JSON.parse(saved);

    // Check if saved data is less than 24 hours old
    const savedAt = new Date(data.savedAt);
    const now = new Date();
    const hoursSinceSave = (now - savedAt) / (1000 * 60 * 60);

    if (hoursSinceSave > 24) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return data;
  } catch (e) {
    console.warn('Failed to load conversation:', e);
    return null;
  }
}

/**
 * Clear saved conversation from localStorage
 */
function clearStorage() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to clear conversation:', e);
  }
}

/**
 * Initial trip state
 */
const initialTripState = {
  startCity: null,
  endCity: null, // null = not set, undefined = flexible
  stops: [],
  totalDays: null,
  daysPerCity: {},
  dates: null,
  preferences: {
    interests: [],
    budget: null,
    pace: null,
  },
};

/**
 * Generate a unique ID for messages
 */
function generateId() {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Hook for managing conversational trip planning state
 */
export function useConversation() {
  // Message history
  const [messages, setMessages] = useState([]);

  // Trip state
  const [trip, setTrip] = useState(initialTripState);

  // UI state
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingInput, setPendingInput] = useState(null);
  const [error, setError] = useState(null);

  // Track if we've started the conversation
  const [hasStarted, setHasStarted] = useState(false);

  // Track if the trip is finalized
  const [isFinalized, setIsFinalized] = useState(false);

  // Store the last failed message for retry
  const lastFailedMessageRef = useRef(null);

  // Abort controller for canceling requests
  const abortControllerRef = useRef(null);

  // Track if we've loaded from storage (to avoid double-loading)
  const hasLoadedRef = useRef(false);

  // Load saved state on mount
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    const saved = loadFromStorage();
    if (saved && saved.messages?.length > 0) {
      setTrip(saved.trip);
      setMessages(saved.messages);
      setHasStarted(saved.hasStarted);
    }
  }, []);

  // Save state after changes (debounced via messages dependency)
  useEffect(() => {
    if (hasStarted && messages.length > 0 && !isFinalized) {
      saveToStorage(trip, messages, hasStarted);
    }
  }, [trip, messages, hasStarted, isFinalized]);

  /**
   * Add a message to the history
   */
  const addMessage = useCallback((role, content, richContent = null) => {
    const message = {
      id: generateId(),
      role,
      content,
      timestamp: new Date(),
      richContent,
    };
    setMessages(prev => [...prev, message]);
    return message;
  }, []);

  /**
   * Update the last assistant message (for streaming)
   */
  const updateLastAssistantMessage = useCallback((content, richContent = null) => {
    setMessages(prev => {
      const newMessages = [...prev];
      const lastIdx = newMessages.length - 1;
      if (lastIdx >= 0 && newMessages[lastIdx].role === 'assistant') {
        newMessages[lastIdx] = {
          ...newMessages[lastIdx],
          content,
          ...(richContent && { richContent }),
        };
      }
      return newMessages;
    });
  }, []);

  /**
   * Update trip state based on tool call
   */
  const updateTrip = useCallback((updates) => {
    setTrip(prev => {
      const newState = { ...prev };

      if (updates.startCity) {
        newState.startCity = updates.startCity;
      }

      if (updates.endCity) {
        newState.endCity = updates.endCity;
      }

      if (updates.endCityFlexible) {
        newState.endCity = undefined; // undefined = flexible
      }

      if (updates.addStops) {
        newState.stops = [...newState.stops, ...updates.addStops];
      }

      if (updates.removeStops) {
        newState.stops = newState.stops.filter(s => !updates.removeStops.includes(s.id));
      }

      if (updates.totalDays) {
        newState.totalDays = updates.totalDays;
      }

      if (updates.daysPerCity) {
        newState.daysPerCity = { ...newState.daysPerCity, ...updates.daysPerCity };
      }

      if (updates.dates) {
        newState.dates = { ...newState.dates, ...updates.dates };
      }

      if (updates.preferences) {
        newState.preferences = { ...newState.preferences, ...updates.preferences };
      }

      return newState;
    });
  }, []);

  /**
   * Handle tool calls from the AI
   */
  const handleToolCall = useCallback((toolName, toolInput) => {
    switch (toolName) {
      case 'show_options':
      case 'show_city_search':
      case 'show_city_cards':
      case 'show_days_allocation':
      case 'show_date_picker':
      case 'show_route_summary':
        // These are UI tools - set pending input for the component to render
        setPendingInput({ type: toolName, data: toolInput });
        break;

      case 'update_trip':
        updateTrip(toolInput);
        break;

      case 'finalize_trip':
        // Mark the trip as finalized and clear saved session
        setIsFinalized(true);
        clearStorage();
        break;

      case 'get_city_suggestions':
      case 'get_travel_info':
        // These return data - handled by the API
        break;

      default:
        console.warn('Unknown tool:', toolName);
    }
  }, [updateTrip]);

  /**
   * Send a message and get AI response
   */
  const sendMessage = useCallback(async (userMessage, selectedOption = null) => {
    setError(null);
    setPendingInput(null);

    // Add user message to history
    const content = selectedOption?.label || userMessage;
    addMessage('user', content);

    // Start streaming
    setIsStreaming(true);

    // Add placeholder for assistant response
    addMessage('assistant', '');

    try {
      // Cancel any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      // Build message history for API
      const apiMessages = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));
      apiMessages.push({ role: 'user', content });

      const response = await fetch('/api/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          tripContext: trip,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      // Handle streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let toolCalls = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'content') {
                fullContent += data.content;
                updateLastAssistantMessage(fullContent);
              } else if (data.type === 'tool_use') {
                toolCalls.push(data);
                handleToolCall(data.name, data.input);
              } else if (data.type === 'done') {
                // Stream complete
              } else if (data.type === 'error') {
                throw new Error(data.error);
              }
            } catch {
              // Skip invalid JSON lines
            }
          }
        }
      }

    } catch (err) {
      if (err.name === 'AbortError') {
        // Request was cancelled
        return;
      }
      console.error('Conversation error:', err);
      setError(err.message);
      // Store failed message for retry
      lastFailedMessageRef.current = { userMessage, selectedOption };
      updateLastAssistantMessage('');
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [messages, trip, addMessage, updateLastAssistantMessage, handleToolCall]);

  /**
   * Start the conversation
   */
  const startConversation = useCallback(async () => {
    if (hasStarted) return;

    setHasStarted(true);
    setIsStreaming(true);

    // Add initial assistant message
    addMessage('assistant', '');

    try {
      const response = await fetch('/api/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [],
          tripContext: trip,
          isStart: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'content') {
                fullContent += data.content;
                updateLastAssistantMessage(fullContent);
              } else if (data.type === 'tool_use') {
                handleToolCall(data.name, data.input);
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (err) {
      console.error('Start conversation error:', err);
      setError(err.message);
      updateLastAssistantMessage(
        "Hey! I'm having trouble connecting right now. Let me try again..."
      );
    } finally {
      setIsStreaming(false);
    }
  }, [hasStarted, trip, addMessage, updateLastAssistantMessage, handleToolCall]);

  /**
   * Handle user selecting an option from UI
   */
  const handleOptionSelect = useCallback((option) => {
    sendMessage('', option);
  }, [sendMessage]);

  /**
   * Handle city selection from search
   */
  const handleCitySelect = useCallback((city, purpose) => {
    // Update trip state directly
    if (purpose === 'start') {
      updateTrip({ startCity: city });
    } else if (purpose === 'end') {
      updateTrip({ endCity: city });
    } else {
      updateTrip({ addStops: [city] });
    }

    // Send message to AI
    sendMessage(`I'll ${purpose === 'start' ? 'start in' : purpose === 'end' ? 'end in' : 'add'} ${city.name}`);
  }, [updateTrip, sendMessage]);

  /**
   * Reset conversation
   */
  const reset = useCallback(() => {
    setMessages([]);
    setTrip(initialTripState);
    setIsStreaming(false);
    setPendingInput(null);
    setError(null);
    setHasStarted(false);
    setIsFinalized(false);
    lastFailedMessageRef.current = null;
    clearStorage();
  }, []);

  /**
   * Retry the last failed message
   */
  const retry = useCallback(() => {
    // Clear error first
    setError(null);

    // Remove the failed assistant message
    setMessages(prev => {
      const newMessages = [...prev];
      // Remove last assistant message (the empty/error one)
      if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === 'assistant') {
        newMessages.pop();
      }
      // Also remove the user message that triggered the error
      if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === 'user') {
        newMessages.pop();
      }
      return newMessages;
    });

    // Retry with stored message
    if (lastFailedMessageRef.current) {
      const { userMessage, selectedOption } = lastFailedMessageRef.current;
      lastFailedMessageRef.current = null;
      sendMessage(userMessage, selectedOption);
    } else if (!hasStarted || messages.length === 0) {
      // Retry starting the conversation
      setHasStarted(false);
      startConversation();
    }
  }, [sendMessage, hasStarted, messages.length, startConversation]);

  /**
   * Dismiss the error without retrying
   */
  const dismissError = useCallback(() => {
    setError(null);
    lastFailedMessageRef.current = null;
    // Remove empty assistant message
    setMessages(prev => {
      const newMessages = [...prev];
      if (newMessages.length > 0 &&
          newMessages[newMessages.length - 1].role === 'assistant' &&
          !newMessages[newMessages.length - 1].content) {
        newMessages.pop();
      }
      return newMessages;
    });
  }, []);

  return {
    // State
    messages,
    trip,
    isStreaming,
    pendingInput,
    error,
    hasStarted,
    isFinalized,

    // Actions
    sendMessage,
    startConversation,
    handleOptionSelect,
    handleCitySelect,
    updateTrip,
    reset,
    retry,
    dismissError,

    // UI helpers
    setPendingInput,
  };
}
