'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles } from 'lucide-react';

export default function CompactChatInput({ onSend, disabled = false, placeholder }) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    if (!disabled) textareaRef.current?.focus();
  }, [disabled]);

  // Auto-resize textarea based on content
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [text]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  };

  const handleKeyDown = (e) => {
    // Enter sends, Shift+Enter inserts newline
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="flex items-end gap-2 rounded-2xl bg-[#f5f0e8]/50 border border-[#e5e0d8] px-3 py-2.5 focus-within:border-[#c9a227]/40 focus-within:ring-1 focus-within:ring-[#c9a227]/20 transition-all">
        <Sparkles className="w-3.5 h-3.5 text-[#8a8578] shrink-0 mb-1" />
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
          placeholder={placeholder || 'Ask anything \u2014 or type a city, a mood, a season...'}
          className="flex-1 bg-transparent text-[13px] text-[#2a2520] placeholder:text-[#8a8578]/60 outline-none min-w-0 resize-none overflow-y-auto leading-snug"
          style={{ minHeight: '20px', maxHeight: '120px' }}
        />
        <button
          type="submit"
          disabled={!text.trim() || disabled}
          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-[#2a2520] text-white disabled:opacity-20 transition-opacity mb-0.5"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </form>
  );
}
