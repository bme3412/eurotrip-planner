'use client';

import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

export default function CompactChatInput({ onSend, disabled = false, placeholder }) {
  const [text, setText] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (!disabled) inputRef.current?.focus();
  }, [disabled]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="flex items-center gap-2 rounded-2xl bg-[#f5f0e8]/50 border border-[#e5e0d8] px-3 py-2.5 focus-within:border-[#c9a227]/40 focus-within:ring-1 focus-within:ring-[#c9a227]/20 transition-all">
        <span className="text-[#8a8578] text-sm shrink-0 select-none">&#10022;</span>
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled}
          placeholder={placeholder || 'Ask anything \u2014 or type a city, a mood, a season...'}
          className="flex-1 bg-transparent text-[13px] text-[#2a2520] placeholder:text-[#8a8578]/60 outline-none min-w-0"
        />
        <button
          type="submit"
          disabled={!text.trim() || disabled}
          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-[#2a2520] text-white disabled:opacity-20 transition-opacity"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </form>
  );
}
