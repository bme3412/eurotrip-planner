/**
 * SectionHeading — the single source of truth for landing-page section intros.
 *
 * Enforces one cohesive type + eyebrow language across every section so headings
 * never drift (font, size, eyebrow treatment, subhead gray). Section H2s sit one
 * step below the hero H1: hero is text-4xl…6xl, sections are text-3xl…4xl.
 *
 * Props:
 *  - eyebrow:  small uppercase kicker (blue-600)
 *  - title:    the H2 text (rendered in font-display / EB Garamond)
 *  - subtitle: optional supporting line
 *  - align:    'left' (default) | 'center'
 *  - icon:     optional leading icon element for the eyebrow
 */
export default function SectionHeading({
  eyebrow,
  title,
  subtitle = null,
  align = 'left',
  icon = null,
  className = '',
}) {
  const centered = align === 'center';
  return (
    <div className={`max-w-2xl ${centered ? 'mx-auto text-center' : ''} ${className}`}>
      {eyebrow && (
        <div
          className={`inline-flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest mb-4 ${
            centered ? 'justify-center' : ''
          }`}
        >
          {icon}
          {eyebrow}
        </div>
      )}
      <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight leading-tight text-gray-900">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 text-lg text-gray-600 leading-relaxed">{subtitle}</p>
      )}
    </div>
  );
}
