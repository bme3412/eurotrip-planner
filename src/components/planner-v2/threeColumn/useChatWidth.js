'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export const DEFAULT_CHAT_WIDTH = 60;
export const ROUTE_CHAT_WIDTH = 42;
export const MIN_CHAT_WIDTH = 34;
export const MAX_CHAT_WIDTH = 76;

const STORAGE_KEY = 'plannerChatWidthPct';

/**
 * Split-pane width state for the chat/map divider.
 *
 * - Hydrates from `localStorage` on mount (clamped to [MIN, MAX]).
 * - Auto-shrinks to `ROUTE_CHAT_WIDTH` the first time the trip gains cities,
 *   unless the user has already chosen a custom width.
 * - Returns handlers for pointer-drag resize and keyboard adjustment
 *   (Arrow keys ±5, Home/End → MIN/MAX).
 *
 * @param {{ tripHasCities: boolean, splitPaneRef: React.RefObject<HTMLElement> }} args
 */
export function useChatWidth({ tripHasCities, splitPaneRef }) {
  const [chatWidthPct, setChatWidthPct] = useState(DEFAULT_CHAT_WIDTH);
  const hasCustomChatWidthRef = useRef(false);

  // Hydrate from localStorage once.
  useEffect(() => {
    const stored = Number(window.localStorage.getItem(STORAGE_KEY));
    if (Number.isFinite(stored)) {
      hasCustomChatWidthRef.current = true;
      setChatWidthPct(Math.min(MAX_CHAT_WIDTH, Math.max(MIN_CHAT_WIDTH, stored)));
    }
  }, []);

  // Auto-shrink to make room for the route map.
  useEffect(() => {
    if (!tripHasCities || hasCustomChatWidthRef.current) return;
    setChatWidthPct(ROUTE_CHAT_WIDTH);
  }, [tripHasCities]);

  const commitChatWidth = useCallback((nextWidth) => {
    const bounded = Math.min(MAX_CHAT_WIDTH, Math.max(MIN_CHAT_WIDTH, nextWidth));
    hasCustomChatWidthRef.current = true;
    setChatWidthPct(bounded);
    window.localStorage.setItem(STORAGE_KEY, String(Math.round(bounded)));
  }, []);

  const handleDividerPointerDown = useCallback((event) => {
    event.preventDefault();
    const container = splitPaneRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handlePointerMove = (moveEvent) => {
      const next = ((moveEvent.clientX - rect.left) / rect.width) * 100;
      commitChatWidth(next);
    };

    const handlePointerUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }, [commitChatWidth, splitPaneRef]);

  const handleDividerKeyDown = useCallback((event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      commitChatWidth(chatWidthPct - 5);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      commitChatWidth(chatWidthPct + 5);
    } else if (event.key === 'Home') {
      event.preventDefault();
      commitChatWidth(MIN_CHAT_WIDTH);
    } else if (event.key === 'End') {
      event.preventDefault();
      commitChatWidth(MAX_CHAT_WIDTH);
    }
  }, [chatWidthPct, commitChatWidth]);

  return {
    chatWidthPct,
    handleDividerPointerDown,
    handleDividerKeyDown,
  };
}
