'use client';

import React from 'react';
import { MIN_CHAT_WIDTH, MAX_CHAT_WIDTH } from './useChatWidth';

/**
 * Vertical drag handle between the chat column and the map column.
 *
 * Hidden on mobile (`lg:flex`). Acts as an ARIA separator with the current
 * width percentage exposed via `aria-valuenow`.
 */
export default function ChatMapDivider({ chatWidthPct, onPointerDown, onKeyDown }) {
  return (
    <button
      type="button"
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize chat and map panels"
      aria-valuemin={MIN_CHAT_WIDTH}
      aria-valuemax={MAX_CHAT_WIDTH}
      aria-valuenow={Math.round(chatWidthPct)}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      className="group hidden w-2 shrink-0 cursor-col-resize items-center justify-center bg-[#efe9de] outline-none transition-colors hover:bg-[#dfd3c0] focus-visible:bg-[#dfd3c0] lg:flex"
    >
      <span className="h-14 w-1 rounded-full bg-[#c8bba7] transition-colors group-hover:bg-[#8a765c] group-focus-visible:bg-[#8a765c]" />
    </button>
  );
}
