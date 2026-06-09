import OlivierMark from './OlivierMark';

/**
 * Phone lock-screen mock showing a brief as it would actually arrive — a push
 * notification. Sells "this is a real service" better than a plain card.
 */
export default function PushMock({ body, time = '8:02 PM', label = 'now' }) {
  return (
    <div className="mx-auto w-full max-w-[280px]">
      <div className="relative rounded-[2.25rem] bg-gradient-to-b from-slate-800 to-slate-900 p-2.5 shadow-2xl ring-1 ring-black/20">
        {/* notch */}
        <div className="absolute left-1/2 top-2.5 h-5 w-24 -translate-x-1/2 rounded-full bg-black/60" />
        <div className="overflow-hidden rounded-[1.9rem] bg-[radial-gradient(120%_80%_at_50%_0%,#3b4a6b_0%,#1e2436_70%)] px-3 pb-5 pt-10">
          {/* clock */}
          <div className="mb-6 text-center">
            <div className="text-5xl font-light tracking-tight text-white/95">{time.split(' ')[0]}</div>
            <div className="text-xs font-medium text-white/55">Tonight · the night before</div>
          </div>

          {/* notification */}
          <div className="rounded-2xl bg-white/12 p-3 backdrop-blur-md ring-1 ring-white/10">
            <div className="mb-1.5 flex items-center gap-2">
              <OlivierMark size={20} />
              <span className="text-[11px] font-semibold uppercase tracking-wide text-white/80">Olivier</span>
              <span className="ml-auto text-[10px] text-white/45">{label}</span>
            </div>
            <p className="text-[12.5px] leading-snug text-white/90 line-clamp-5">{body}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
