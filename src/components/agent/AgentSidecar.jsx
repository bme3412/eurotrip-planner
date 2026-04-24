'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { X, Send, Sparkles, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Routes where sidecar should be hidden
const HIDDEN_ROUTES = ['/plan'];

/**
 * MessageBubble - Renders a single message in the chat
 */
function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="mr-2 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500 text-xs text-white">
          <Sparkles className="h-3 w-3" />
        </div>
      )}
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'rounded-br-sm bg-blue-500 text-white'
            : 'rounded-bl-sm border border-slate-200 bg-white text-slate-700'
        }`}
      >
        {msg.content}
        {msg.isStreaming && (
          <span className="ml-1 inline-block h-3.5 w-0.5 animate-pulse rounded-sm bg-current opacity-70" />
        )}
      </div>
    </div>
  );
}

/**
 * AgentSidecar - Global floating chat panel
 *
 * Props:
 * - context: Object with page context (e.g., { page: 'city-guide', citySlug: 'paris' })
 * - agentUrl: API endpoint for the agent (default: '/api/conversation')
 * - starterPrompts: Array of suggested prompts to show in empty state
 * - onUpdate: Callback when agent emits update events
 */
export default function AgentSidecar({
  context = {},
  agentUrl = '/api/conversation',
  starterPrompts = [],
  onUpdate,
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [displayMessages, setDisplayMessages] = useState([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);
  const sessionIdRef = useRef(
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `s-${Date.now()}`
  );

  // Hide on specific routes
  const shouldHide = HIDDEN_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );

  // Auto-scroll on new messages
  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [displayMessages, open]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  // Prevent body scroll when mobile drawer is open
  useEffect(() => {
    if (open && window.innerWidth < 640) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const sendMessage = useCallback(
    async (text) => {
      const userText = text.trim();
      if (!userText || streaming) return;

      setInput('');
      setStreaming(true);

      const userMsg = { role: 'user', content: userText };
      const nextMessages = [...messages, userMsg];
      setMessages(nextMessages);

      const assistantPlaceholder = {
        role: 'assistant',
        content: '',
        isStreaming: true,
        _key: Date.now(),
      };
      setDisplayMessages((prev) => [...prev, { ...userMsg }, assistantPlaceholder]);

      let assistantText = '';

      const updateAssistant = (text, done = false) => {
        assistantText = text;
        setDisplayMessages((prev) =>
          prev.map((m) =>
            m._key === assistantPlaceholder._key
              ? { ...m, content: text, isStreaming: !done }
              : m
          )
        );
      };

      try {
        abortRef.current = new AbortController();
        const res = await fetch(agentUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: nextMessages,
            tripContext: context,
            sessionId: sessionIdRef.current,
          }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            let event;
            try {
              event = JSON.parse(line.slice(6));
            } catch {
              continue;
            }

            switch (event.type) {
              case 'delta':
              case 'content':
                updateAssistant(assistantText + (event.text || event.content || ''));
                break;
              case 'tool_use':
                // Tool calls are handled by the API, we just show progress
                break;
              case 'update':
                // Generic update callback for parent components
                onUpdate?.(event.data);
                break;
              case 'error':
                updateAssistant(`Sorry, something went wrong: ${event.message || event.error}`, true);
                break;
              case 'done':
                updateAssistant(assistantText, true);
                break;
            }
          }
        }

        updateAssistant(assistantText, true);
        setMessages((prev) => [...prev, { role: 'assistant', content: assistantText }]);
      } catch (err) {
        if (err.name !== 'AbortError') {
          updateAssistant("Sorry, I couldn't connect. Please try again.", true);
        }
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [messages, streaming, context, agentUrl, onUpdate]
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleAbort = () => {
    abortRef.current?.abort();
    setStreaming(false);
  };

  // Don't render if should be hidden
  if (shouldHide) return null;

  const isEmpty = displayMessages.length === 0;

  // Panel content (shared between desktop and mobile)
  const panelContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3.5 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-semibold text-slate-700">AI Assistant</span>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
              <Sparkles className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="font-semibold text-slate-700">How can I help?</p>
              <p className="mt-1 text-sm text-slate-500">
                Ask me anything about planning your trip
              </p>
            </div>
            {starterPrompts.length > 0 && (
              <div className="flex w-full flex-col gap-2">
                {starterPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-sm text-slate-600 transition hover:border-blue-300 hover:bg-blue-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {displayMessages.map((msg, i) => (
              <MessageBubble key={msg._key ?? i} msg={msg} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-slate-200 px-3 py-3 flex-shrink-0">
        <div className="flex items-end gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            rows={1}
            disabled={streaming}
            placeholder="Ask anything..."
            className="flex-1 resize-none bg-transparent text-sm text-slate-700 placeholder-slate-400 focus:outline-none disabled:opacity-50"
            style={{ maxHeight: '96px' }}
          />
          {streaming ? (
            <button
              type="button"
              onClick={handleAbort}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition hover:bg-slate-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-500 text-white transition hover:bg-blue-600 disabled:opacity-30"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </form>
    </div>
  );

  return (
    <>
      {/* Floating trigger button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4 text-base font-bold text-white shadow-2xl shadow-blue-500/25 transition-all hover:shadow-blue-500/40 hover:-translate-y-0.5 focus:outline-none"
          >
            <Sparkles className="h-5 w-5" />
            <span>Plan with AI</span>
            <span className="ml-1 flex h-2 w-2">
              <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-white opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Desktop: Slide-in panel */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop (mobile only) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-black/40 z-40 sm:hidden"
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="fixed z-50 bg-white shadow-2xl
                         bottom-0 inset-x-0 h-[85vh] rounded-t-2xl
                         sm:bottom-6 sm:right-6 sm:left-auto sm:inset-x-auto sm:h-[600px] sm:w-96 sm:rounded-2xl sm:border sm:border-slate-200"
            >
              {panelContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
