/**
 * The single visit-quality band scale shared by every calendar surface in the
 * city guides (12-month overview grid, single-month calendar, tooltips).
 *
 * Bands are keyed by the 1-5 range score in visitCalendar data. Cells render
 * as a tinted background with dark text (WCAG-friendly); the saturated `dot`
 * colour is reserved for legend swatches and small accents — never for full
 * cell fills.
 *
 * Pure data + helpers, no React.
 */

export const VISIT_BANDS = {
  5: { label: 'Excellent', bg: '#a7f3d0', text: '#064e3b', dot: '#10b981' },
  4: { label: 'Good', bg: '#d1fae5', text: '#065f46', dot: '#34d399' },
  3: { label: 'Average', bg: '#fef3c7', text: '#78350f', dot: '#f59e0b' },
  2: { label: 'Below average', bg: '#ffedd5', text: '#7c2d12', dot: '#fb923c' },
  1: { label: 'Avoid', bg: '#fee2e2', text: '#7f1d1d', dot: '#ef4444' },
};

/** Band order for legends, best first. */
export const BAND_ORDER = [5, 4, 3, 2, 1];

/** Resolve a (possibly fractional / out-of-range) rating to its band. */
export function bandFor(rating) {
  const r = Math.max(1, Math.min(5, Math.round(typeof rating === 'number' ? rating : 3)));
  return VISIT_BANDS[r];
}

/**
 * Qualitative crowd label for a 1-10 tourismLevel. Used instead of raw
 * "9/10" scores (qualitative bands, never raw scores).
 */
export function crowdLabel(tourismLevel) {
  const lvl = typeof tourismLevel === 'number' ? tourismLevel : null;
  if (lvl == null) return null;
  if (lvl >= 9) return 'Very busy';
  if (lvl >= 7) return 'Busy';
  if (lvl >= 4) return 'Moderate crowds';
  return 'Quiet';
}
