"use client";
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { MessageCircle } from 'lucide-react';

const ChatPanel = dynamic(() => import('./ChatPanel'), { ssr: false, loading: () => null });

export default function Chatbot() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onMouseEnter={() => ChatPanel?.preload?.()}
        onFocus={() => ChatPanel?.preload?.()}
        onClick={() => setOpen(true)}
        aria-label="Open Eurotrip Copilot"
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-3 text-white shadow-lg hover:bg-indigo-700 focus:outline-none"
      >
        <MessageCircle className="h-5 w-5" />
        <span className="hidden sm:inline">Ask Copilot</span>
      </button>

      {open && <ChatPanel onClose={() => setOpen(false)} />}
    </>
  );
}


