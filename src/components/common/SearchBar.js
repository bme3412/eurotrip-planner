'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';

// Lazy-load CommandBar — removes ~81 KB from every page's critical JS
const CommandBar = dynamic(() => import('./CommandBar'), {
  ssr: false,
  loading: () => null,
});

export default function SearchBar() {
  const [open, setOpen] = useState(false);
  const [preloaded, setPreloaded] = useState(false);

  // Preload CommandBar chunk on hover or ⌘K to keep UX instantaneous
  const preloadCommandBar = useCallback(() => {
    if (!preloaded) {
      import('./CommandBar');
      setPreloaded(true);
    }
  }, [preloaded]);

  // Global keyboard shortcut: ⌘K or Ctrl+K
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        preloadCommandBar();
        setOpen(true);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [preloadCommandBar]);

  return (
    <>
      {/* Search trigger button */}
      <button
        onClick={() => setOpen(true)}
        onMouseEnter={preloadCommandBar}
        onFocus={preloadCommandBar}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 text-sm transition-colors"
        aria-label="Search cities or ask a question"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="hidden lg:inline text-xs text-gray-500">Search or ask</span>
        <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-white/80 rounded text-[10px] font-medium text-gray-400 border border-gray-200">
          <span className="text-[9px]">⌘</span>K
        </kbd>
      </button>

      {/* Command bar modal — only rendered when open */}
      {open && <CommandBar open={open} onClose={() => setOpen(false)} />}
    </>
  );
}
