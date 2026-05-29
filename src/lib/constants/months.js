/**
 * Canonical month-name constants.
 *
 * Single source of truth for the various month-name representations used
 * across the app (data file paths use lowercase, UI uses capitalized,
 * compact UI uses 3-letter abbreviations). Pure data, no imports.
 */

export const MONTHS_LOWER = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

export const MONTHS_CAPITALIZED = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
