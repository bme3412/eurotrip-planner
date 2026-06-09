/** Olivier's identity mark — a small monogram so the concierge feels like a person. */
export default function OlivierMark({ size = 40, className = '' }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1e63e9] to-[#5b8def] font-display font-semibold text-white shadow-sm ring-1 ring-black/5 ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden="true"
    >
      O
    </span>
  );
}
