import { OLIVIER } from '@/lib/concierge/personas';

/**
 * A persona's identity mark — a small monogram so each agent in Olivier's
 * network feels like a person. Accent colors are data-driven (per persona),
 * so the gradient is inline style rather than Tailwind classes.
 */
export default function AgentMark({ persona = OLIVIER, size = 40, className = '', title }) {
  const accent = persona?.accent || OLIVIER.accent;
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-display font-semibold text-white shadow-sm ring-1 ring-black/5 ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: `linear-gradient(to bottom right, ${accent.from}, ${accent.to})`,
      }}
      aria-hidden={title ? undefined : 'true'}
      title={title}
    >
      {persona?.initial || 'O'}
    </span>
  );
}
