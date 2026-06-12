/**
 * Display helper for authored event date strings.
 *
 * Monthly JSON ships prose dates that sometimes include a hardcoded year
 * ("May 26 - June 8, 2025") that goes stale — the guides are evergreen, so
 * we drop the year for display. Only comma-prefixed or trailing years are
 * stripped, so ISO-style dates ("2025-06-21") are left untouched rather than
 * mangled.
 */
export function stripEventYear(dateLabel) {
  if (typeof dateLabel !== 'string') return dateLabel;
  return dateLabel
    .replace(/,\s*(19|20)\d{2}\b/g, '')
    .replace(/\s+(19|20)\d{2}$/, '')
    .trim();
}
