'use client';

import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * ChatInput - Text input for sending messages
 */
export default function ChatInput({ onSend, disabled, placeholder }) {
  const [value, setValue] = useState('');
  const inputRef = useRef(null);

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current && !disabled) {
      inputRef.current.focus();
    }
  }, [disabled]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!value.trim() || disabled) return;

    onSend(value.trim());
    setValue('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-2 focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "Type your message..."}
          disabled={disabled}
          className="flex-1 text-[15px] text-slate-700 placeholder-slate-400 bg-transparent outline-none disabled:opacity-50"
        />

        <motion.button
          type="submit"
          disabled={!value.trim() || disabled}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`
            p-2 rounded-lg transition-all
            ${value.trim() && !disabled
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-slate-100 text-slate-400'
            }
          `}
        >
          <Send className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Helper text */}
      <p className="text-xs text-slate-400 mt-1.5 ml-1">
        Press Enter to send or choose an option above
      </p>
    </form>
  );
}
