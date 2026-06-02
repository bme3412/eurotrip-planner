'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check, SlidersHorizontal } from 'lucide-react';

/**
 * Compact dropdown used for each filter. Multi-select (checkboxes) or single
 * (radio-like) depending on `multi`. Closes on outside click / Escape.
 */
function FilterDropdown({ label, options, selected, onToggle, multi = true, align = 'left' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const count = multi ? selected.length : 0;
  const activeLabel = !multi
    ? options.find((o) => o.id === selected[0])?.label
    : null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
          count > 0
            ? 'border-hero-ink bg-hero-ink text-white'
            : 'border-hero-line bg-white text-hero-ink hover:border-hero-ink/40'
        }`}
      >
        <span>{label}{count > 0 ? ` · ${count}` : activeLabel ? `: ${activeLabel}` : ''}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className={`absolute z-30 mt-2 max-h-72 w-56 overflow-auto rounded-xl border border-hero-line bg-white p-1.5 shadow-xl ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
          role="listbox"
        >
          {options.map((opt) => {
            const isSel = selected.includes(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                role="option"
                aria-selected={isSel}
                onClick={() => { onToggle(opt.id); if (!multi) setOpen(false); }}
                className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  isSel ? 'bg-hero-ink/5 font-semibold text-hero-ink' : 'text-hero-ink-muted hover:bg-gray-50'
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSel && <Check className="h-4 w-4 shrink-0 text-hero-ink" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Results filter + sort bar. Replaces the old List/Plot/Compare tabs + the bare
 * sort pills with real filtering (region, vibe) and a live result count.
 */
export default function ResultsFilterBar({
  regionOptions,
  vibeOptions,
  sortOptions,
  selectedRegions,
  selectedVibes,
  sortBy,
  onToggleRegion,
  onToggleVibe,
  onSort,
  onClear,
  onChangeDates,
  shown,
  total,
}) {
  const hasFilters = selectedRegions.length > 0 || selectedVibes.length > 0;

  return (
    <div className="border-y border-hero-line py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-hero-ink-muted">
          <SlidersHorizontal className="h-3.5 w-3.5" /> Filter
        </span>

        {regionOptions.length > 1 && (
          <FilterDropdown
            label="Region"
            options={regionOptions}
            selected={selectedRegions}
            onToggle={onToggleRegion}
          />
        )}

        {vibeOptions.length > 0 && (
          <FilterDropdown
            label="Vibe"
            options={vibeOptions}
            selected={selectedVibes}
            onToggle={onToggleVibe}
          />
        )}

        <FilterDropdown
          label="Sort"
          options={sortOptions}
          selected={[sortBy]}
          onToggle={onSort}
          multi={false}
        />

        {hasFilters && (
          <button
            type="button"
            onClick={onClear}
            className="text-sm font-medium text-hero-ink-muted underline-offset-2 hover:text-hero-ink hover:underline"
          >
            Clear
          </button>
        )}

        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-hero-ink-muted tabular-nums">
            {shown === total ? `${total} cities` : `${shown} of ${total}`}
          </span>
          {onChangeDates && (
            <button
              onClick={onChangeDates}
              className="text-sm font-medium text-hero-accent transition-colors hover:text-blue-700"
            >
              ← Change dates
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
