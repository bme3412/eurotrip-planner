/**
 * Small shared text helpers. Pure functions, no imports.
 */

/** Capitalize the first letter of a single word/token. */
export function capitalize(str) {
  if (!str || typeof str !== 'string') return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Convert a hyphenated slug (e.g. "saint-malo") to Title Case ("Saint Malo"). */
export function titleCaseFromSlug(slug) {
  if (!slug || typeof slug !== 'string') return '';
  return slug
    .split('-')
    .map((word) => capitalize(word))
    .join(' ');
}
