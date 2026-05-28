/**
 * Connections generator (script — deterministic normalizer).
 *
 * Demonstrates the script-style generator path: no LLM call, no network. It
 * normalizes the existing payload so re-running the CLI is idempotent and
 * any drift introduced by hand-editing is corrected.
 *
 * Normalization rules:
 *   1. Top-level shape is `{ destinations: [...] }`. Anything else is left
 *      untouched and returned verbatim.
 *   2. `destinations[]` is sorted by destination city name (case-insensitive).
 *   3. For each destination, object keys are emitted in a stable order so the
 *      file diffs cleanly across runs:
 *        city, country, whyGo, directWithinCountryTrain,
 *        directInternationalTrain, intraEuropeFlight, bus, ferry, notes
 *   4. Unknown keys are preserved at the end of each destination in the
 *      order they appeared in the source.
 *
 * Real enrichment (Google Places lookups, transit API calls, etc.) would
 * slot in here in place of the no-op return path.
 */

const STABLE_KEYS = [
  'city',
  'country',
  'whyGo',
  'directWithinCountryTrain',
  'directInternationalTrain',
  'intraEuropeFlight',
  'bus',
  'ferry',
  'notes',
];

export const meta = {
  section: 'connections',
  kind: 'script',
  source: 'script:normalize',
};

function reorderKeys(obj) {
  if (obj == null || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const out = {};
  const seen = new Set();
  for (const k of STABLE_KEYS) {
    if (k in obj) {
      out[k] = obj[k];
      seen.add(k);
    }
  }
  for (const k of Object.keys(obj)) {
    if (!seen.has(k)) out[k] = obj[k];
  }
  return out;
}

export async function generate({ city, current, ctx }) {
  if (!current) {
    ctx.logger.warn(`${city.citySlug}/connections: no current payload`);
    return null;
  }
  if (!Array.isArray(current.destinations)) return current;

  const sorted = [...current.destinations]
    .filter((d) => d && typeof d === 'object')
    .map(reorderKeys)
    .sort((a, b) => String(a.city || '').toLowerCase().localeCompare(String(b.city || '').toLowerCase()));

  return { ...current, destinations: sorted };
}
