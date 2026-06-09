'use client';

import { useState } from 'react';
import { Sparkles, Check } from 'lucide-react';
import OlivierMark from './OlivierMark';

/**
 * One rich brief — time-of-day themed header, body prose, and optional structured
 * extras: a "one small delight" callout, an actionable decision that confirms when
 * tapped, a tomorrow tease, a sign-off, a status meta line, and a slot (children)
 * for a photo / map / weather strip.
 */
const THEME = {
  evening: { chip: 'bg-indigo-50 text-indigo-600', edge: 'border-t-indigo-200' },
  morning: { chip: 'bg-amber-50 text-amber-600', edge: 'border-t-amber-200' },
  'wind-down': { chip: 'bg-slate-100 text-slate-600', edge: 'border-t-slate-300' },
};

export default function BriefCard({
  icon: Icon,
  label,
  when,
  body,
  delight,
  decision,
  tomorrowTease,
  signoff,
  meta,
  timeOfDay = 'evening',
  children,
}) {
  const [held, setHeld] = useState(false);
  const t = THEME[timeOfDay] || THEME.evening;

  return (
    <article className={`rounded-2xl border border-gray-200/80 border-t-2 ${t.edge} bg-white p-6 shadow-sm md:p-7`}>
      <header className="flex items-center gap-3">
        <span className={`flex h-9 w-9 items-center justify-center rounded-full ${t.chip}`}>
          {Icon && <Icon className="h-5 w-5" />}
        </span>
        <div className="min-w-0">
          <p className="font-bold leading-tight text-gray-900">{label}</p>
          {when && <p className="text-xs uppercase tracking-wide text-gray-400">{when}</p>}
        </div>
      </header>

      {children && <div className="mt-4">{children}</div>}

      <p className="mt-4 text-lg leading-relaxed text-gray-800">{body}</p>

      {delight && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-100 bg-amber-50/70 px-3.5 py-2.5">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <p className="text-sm leading-snug text-amber-900">{delight}</p>
        </div>
      )}

      {tomorrowTease && (
        <p className="mt-4 border-l-2 border-blue-200 pl-3 text-sm italic text-gray-500">{tomorrowTease}</p>
      )}

      {decision && (
        <div className="mt-4 rounded-xl bg-gray-50 px-3.5 py-3">
          <p className="text-sm font-medium text-gray-800">{decision}</p>
          {held ? (
            <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
              <Check className="h-4 w-4" /> Done — I’ll confirm and text you when it’s held.
            </p>
          ) : (
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setHeld(true)}
                className="rounded-full bg-[#1e63e9] px-3 py-1 text-xs font-semibold text-white transition hover:bg-[#174fc2]"
              >
                Yes, hold it
              </button>
              <button
                type="button"
                onClick={() => setHeld(false)}
                className="rounded-full border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-600 transition hover:bg-gray-100"
              >
                Skip
              </button>
            </div>
          )}
        </div>
      )}

      {signoff && (
        <div className="mt-5 flex items-center gap-2 text-sm font-medium text-gray-500">
          <OlivierMark size={22} />
          <span className="font-display italic text-gray-600">{signoff}</span>
        </div>
      )}

      {meta && (
        <p className="mt-4 border-t border-gray-100 pt-3 text-sm font-medium text-gray-500">{meta}</p>
      )}
    </article>
  );
}
