"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Pencil } from "lucide-react";

const EXAMPLES = [
  "5 days in Paris over Christmas",
  "Lisbon to Rome by train in late April",
  "Family trip with kids 8 and 11, Amsterdam area",
  "10 nights in Spain, beach + tapas, no cities I've already been",
];

export default function DescribeTripInput({ value, onChange }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const taRef = useRef(null);

  const autoSize = useCallback(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, []);

  useEffect(() => { autoSize(); }, [text, autoSize]);

  const handleSubmit = (e) => {
    e?.preventDefault?.();
    const trimmed = text.trim();
    const target = trimmed
      ? `/plan?q=${encodeURIComponent(trimmed)}`
      : "/plan";
    router.push(target);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSubmit(e);
    }
  };

  const useExample = (example) => {
    setText(example);
    requestAnimationFrame(() => taRef.current?.focus());
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col">
      {/* Textarea */}
      <div className="relative rounded-2xl border border-gray-200 bg-white focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-200/60 transition-all">
        <textarea
          ref={taRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          placeholder="I'm going to Rome in June for a week, want food and ancient history..."
          className="w-full resize-none bg-transparent px-4 pt-3.5 pb-2 text-[15px] leading-relaxed text-gray-900 placeholder:text-gray-400 focus:outline-none"
          style={{ maxHeight: "220px" }}
        />
        <div className="flex items-center justify-between px-3 pb-2.5 pt-1">
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-gray-400">
            <Pencil className="w-3 h-3" />
            Cities, dates, who you're going with — anything goes
          </span>
          <span className="sm:hidden" />
          <span className="text-[10px] text-gray-400 hidden md:inline">
            <kbd className="px-1 py-0.5 rounded border border-gray-200 bg-gray-50 text-[10px] font-semibold text-gray-500">⌘ ↵</kbd> to send
          </span>
        </div>
      </div>

      {/* Example chips */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="text-[11px] font-medium uppercase tracking-wider text-gray-400 self-center mr-1">
          Try
        </span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => useExample(ex)}
            className="px-2.5 py-1 rounded-full text-xs text-gray-600 bg-gray-50 border border-gray-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
          >
            {ex}
          </button>
        ))}
      </div>

      {/* Submit */}
      <button
        type="submit"
        className="mt-4 w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-base font-bold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5 active:translate-y-0"
      >
        {text.trim() ? "Plan this trip" : "Start a conversation"}
        <ArrowRight className="w-5 h-5" />
      </button>

      <p className="mt-3 text-center text-xs text-gray-500">
        Free · No signup · 220 cities across 41 countries
      </p>
    </form>
  );
}
