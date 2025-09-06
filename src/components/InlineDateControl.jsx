"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import DateSelector from "./DateSelector";

function formatDate(str) {
  if (!str) return null;
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return str;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function summarizeDates(value) {
  if (!value || !value.mode) return "Any time";
  if (value.mode === "month" && value.month) {
    const [y, m] = value.month.split("-");
    const date = new Date(Number(y), Number(m) - 1, 1);
    return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }
  const start = formatDate(value.start);
  const end = formatDate(value.end);
  if (start && end) return `${start} – ${end}`;
  if (start) return `${start}`;
  if (end) return `${end}`;
  return "Any time";
}

export default function InlineDateControl({ value, onChange, placeholder = "Add dates" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const label = useMemo(() => {
    const s = summarizeDates(value);
    return (!value || !value.mode) ? placeholder : s;
  }, [value, placeholder]);

  useEffect(() => {
    function onDocClick(e) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const handleChange = (next) => {
    onChange?.(next);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="tab bg-white/70 ring-1 ring-black/5 inline-flex items-center gap-2"
        aria-expanded={open}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-zinc-600">
          <path fillRule="evenodd" d="M6.75 3a.75.75 0 01.75.75V5h9V3.75a.75.75 0 011.5 0V5h.75A2.25 2.25 0 0121 7.25v11A2.25 2.25 0 0118.75 20.5H5.25A2.25 2.25 0 013 18.25v-11A2.25 2.25 0 015.25 5H6V3.75A.75.75 0 016.75 3zm-1.5 6A.75.75 0 006 9.75h12a.75.75 0 000-1.5H5.25z" clipRule="evenodd" />
        </svg>
        {label}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-[min(92vw,560px)] z-50">
          <div className="card p-4">
            <DateSelector onChange={handleChange} />
          </div>
        </div>
      )}
    </div>
  );
}


