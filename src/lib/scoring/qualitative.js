/**
 * Qualitative band mapping for the v4 city score.
 *
 * The engine computes a 0-100 `finalScore` used INTERNALLY for ordering/sorting.
 * Users never see the raw number (it reads as false precision). Instead we map
 * the score to a qualitative band that is 1:1 consistent with the v4 tier
 * thresholds (80 / 70 / 60) and the labels used by TierBadge.
 *
 * Display alias: tier 4 is shown as "Fair" (reads better than "Consider" in
 * demo/compare contexts).
 */

export const QUALITATIVE_BANDS = {
  1: { key: 'top',   label: 'Top Pick',     barClass: 'bg-emerald-500', color: '#10b981', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  2: { key: 'great', label: 'Great Option', barClass: 'bg-emerald-400', color: '#34d399', bg: 'bg-emerald-50',  text: 'text-emerald-700' },
  3: { key: 'good',  label: 'Good Option',  barClass: 'bg-amber-400',   color: '#fbbf24', bg: 'bg-amber-50',    text: 'text-amber-700' },
  4: { key: 'fair',  label: 'Fair',         barClass: 'bg-orange-400',  color: '#fb923c', bg: 'bg-orange-50',   text: 'text-orange-700' },
};

/**
 * Map an internal 0-100 finalScore to a qualitative band.
 * @param {number} finalScore
 * @returns {{key: string, label: string, barClass: string, color: string, bg: string, text: string}}
 */
export function scoreToBand(finalScore) {
  const s = Number(finalScore) || 0;
  if (s >= 80) return QUALITATIVE_BANDS[1];
  if (s >= 70) return QUALITATIVE_BANDS[2];
  if (s >= 60) return QUALITATIVE_BANDS[3];
  return QUALITATIVE_BANDS[4];
}

/**
 * Map a v4 tier (1-4) to its qualitative band.
 * @param {number} tier
 */
export function tierToBand(tier) {
  return QUALITATIVE_BANDS[tier] || QUALITATIVE_BANDS[4];
}
