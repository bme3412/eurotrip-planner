'use client';

import { PenLine } from 'lucide-react';

const THEME = {
  evening: { chip: 'bg-indigo-50 text-indigo-400', edge: 'border-t-indigo-100' },
  morning: { chip: 'bg-amber-50 text-amber-400', edge: 'border-t-amber-100' },
  'wind-down': { chip: 'bg-slate-100 text-slate-400', edge: 'border-t-slate-200' },
};

/**
 * Placeholder for a BriefCard while its prose is being written. The day's
 * facts (schedule, hero, depart-by) already rendered from the deterministic
 * scaffold — this stands in only for the voice.
 */
export default function BriefSkeleton({ icon: Icon, label, when, timeOfDay = 'evening', writerLine = null }) {
  const t = THEME[timeOfDay] || THEME.evening;
  return (
    <article className={`rounded-2xl border border-gray-200/80 border-t-2 ${t.edge} bg-white p-6 shadow-sm md:p-7`} aria-busy="true">
      <header className="flex items-center gap-3">
        <span className={`flex h-9 w-9 items-center justify-center rounded-full ${t.chip}`}>
          {Icon && <Icon className="h-5 w-5" />}
        </span>
        <div className="min-w-0">
          <p className="font-bold leading-tight text-gray-900">{label}</p>
          {when && <p className="text-xs uppercase tracking-wide text-gray-400">{when}</p>}
        </div>
        {writerLine && (
          <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-gray-400">
            <PenLine className="h-3.5 w-3.5 animate-pulse" /> {writerLine}
          </span>
        )}
      </header>
      <div className="mt-5 space-y-2.5">
        <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
        <div className="h-4 w-11/12 animate-pulse rounded bg-gray-100" />
        <div className="h-4 w-3/5 animate-pulse rounded bg-gray-100" />
      </div>
    </article>
  );
}
