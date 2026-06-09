import { Sparkles } from 'lucide-react';

/**
 * One rich brief — icon header, body prose, and optional structured extras:
 * a "one small delight" callout, a decision prompt, a tomorrow tease, a status
 * meta line, and a slot (children) for a photo / map / weather strip.
 */
export default function BriefCard({
  icon: Icon,
  label,
  when,
  body,
  delight,
  decision,
  tomorrowTease,
  meta,
  accent = 'blue',
  children,
}) {
  const ring = accent === 'amber' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600';
  return (
    <article className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm md:p-7">
      <header className="flex items-center gap-3">
        <span className={`flex h-9 w-9 items-center justify-center rounded-full ${ring}`}>
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
          <div className="mt-2 flex gap-2">
            <button type="button" className="rounded-full bg-[#1e63e9] px-3 py-1 text-xs font-semibold text-white transition hover:bg-[#174fc2]">
              Yes, hold it
            </button>
            <button type="button" className="rounded-full border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-600 transition hover:bg-gray-100">
              Skip
            </button>
          </div>
        </div>
      )}

      {meta && (
        <p className="mt-4 border-t border-gray-100 pt-3 text-sm font-medium text-gray-500">{meta}</p>
      )}
    </article>
  );
}
