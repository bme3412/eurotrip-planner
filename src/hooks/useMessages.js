'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { buildApiMessages as buildApiMessagesPure } from '@/lib/conversation/messageBuilder';

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
   * See buildApiMessages in @/lib/conversation/messageBuilder for the rules.
   */
  const buildApiMessages = useCallback((userContent) => {
    return buildApiMessagesPure(messagesRef.current, userContent);
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
