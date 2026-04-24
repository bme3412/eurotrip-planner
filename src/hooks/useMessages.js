'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';

const INITIAL_USER_MESSAGE = 'I want to plan a European trip.';

function generateId() {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Hook for message state management.
 * Handles CRUD, system events, and API message derivation.
 */
export function useMessages() {
  const [messages, setMessages] = useState([]);
  const messagesRef = useRef([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

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

  const postSystemEvent = useCallback((text) => {
    if (!text) return;
    const msg = {
      id: generateId(),
      role: 'system_event',
      content: text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, msg]);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  /** Remove trailing empty assistant message (cleanup after stream error). */
  const cleanupEmptyTrailing = useCallback(() => {
    setMessages(prev => {
      const last = prev[prev.length - 1];
      return last?.role === 'assistant' && !last.content ? prev.slice(0, -1) : prev;
    });
  }, []);

  /**
   * Build API-ready messages from the current message list.
   * - Prepends the initial user message
   * - Converts system_event to user notes
   * - Merges consecutive same-role messages (Anthropic requirement)
   */
  const buildApiMessages = useCallback((userContent) => {
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
      ...(userContent ? [{ role: 'user', content: userContent }] : []),
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
    return apiMessages;
  }, []);

  return {
    messages,
    messagesRef,
    addMessage,
    updateLastAssistantMessage,
    postSystemEvent,
    clearMessages,
    cleanupEmptyTrailing,
    buildApiMessages,
  };
}
