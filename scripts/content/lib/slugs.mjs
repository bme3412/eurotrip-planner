/**
 * Canonical slug helpers — single source of truth for country/city folder names.
 *
 * Canonical form:
 *   - All lowercase
 *   - Hyphenated (no spaces, no underscores)
 *   - ASCII-folded (no diacritics)
 *
 * Aliases handle the legacy /public/data layout that mixes:
 *   - Title-case folders (France, Germany, Italy)
 *   - Hyphenated multi-word (Bosnia-and-Herzegovina, North-Macedonia, San-Marino)
 *   - Short forms (UK, Czechia)
 */

// Country aliases: every value that has ever appeared as a country string in
// the codebase or filesystem -> canonical lowercase-hyphen slug.
const COUNTRY_ALIASES = {
  // Legacy full names <-> canonical short form
  'united kingdom': 'uk',
  'czech republic': 'czechia',

  // Direct folder names (current /public/data)
  'uk': 'uk',
  'czechia': 'czechia',
  'bosnia-and-herzegovina': 'bosnia-and-herzegovina',
  'bosnia and herzegovina': 'bosnia-and-herzegovina',
  'north-macedonia': 'north-macedonia',
  'north macedonia': 'north-macedonia',
  'san-marino': 'san-marino',
  'san marino': 'san-marino',
};

const FOLD = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .trim()
    .toLowerCase();

const HYPHENATE = (s) => FOLD(s).replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, '');

/**
 * Convert any country reference (display name, current folder, alias) to the
 * canonical lowercase-hyphen slug.
 *   canonicalCountry('France')            -> 'france'
 *   canonicalCountry('United Kingdom')    -> 'uk'
 *   canonicalCountry('UK')                -> 'uk'
 *   canonicalCountry('Czech Republic')    -> 'czechia'
 *   canonicalCountry('Bosnia-and-Herzegovina') -> 'bosnia-and-herzegovina'
 */
export function canonicalCountry(input) {
  if (!input) return 'unknown';
  const folded = FOLD(input);
  if (COUNTRY_ALIASES[folded]) return COUNTRY_ALIASES[folded];
  const hyphenated = HYPHENATE(input);
  if (COUNTRY_ALIASES[hyphenated]) return COUNTRY_ALIASES[hyphenated];
  return hyphenated || 'unknown';
}

/**
 * Convert any city reference to a canonical lowercase-hyphen slug.
 *   canonicalCity('Paris')         -> 'paris'
 *   canonicalCity('San Sebastian') -> 'san-sebastian'
 *   canonicalCity('Reykjavík')     -> 'reykjavik'
 */
export function canonicalCity(input) {
  if (!input) return 'unknown';
  return HYPHENATE(input) || 'unknown';
}

/**
 * Reverse lookup: canonical slug -> existing /public/data folder name (which
 * may still be cased differently). Used during the Phase A/B dual-write
 * window so the new build can read from the legacy layout.
 *
 * Returns the canonical slug itself if no legacy mapping exists.
 */
const LEGACY_COUNTRY_FOLDER = {
  'uk': 'UK',
  'czechia': 'Czechia',
  'bosnia-and-herzegovina': 'Bosnia-and-Herzegovina',
  'north-macedonia': 'North-Macedonia',
  'san-marino': 'San-Marino',
  'albania': 'Albania',
  'austria': 'Austria',
  'belgium': 'Belgium',
  'bulgaria': 'Bulgaria',
  'croatia': 'Croatia',
  'cyprus': 'Cyprus',
  'denmark': 'Denmark',
  'estonia': 'Estonia',
  'finland': 'Finland',
  'france': 'France',
  'germany': 'Germany',
  'greece': 'Greece',
  'hungary': 'Hungary',
  'iceland': 'Iceland',
  'ireland': 'Ireland',
  'italy': 'Italy',
  'kosovo': 'Kosovo',
  'latvia': 'Latvia',
  'liechtenstein': 'Liechtenstein',
  'lithuania': 'Lithuania',
  'luxembourg': 'Luxembourg',
  'malta': 'Malta',
  'monaco': 'Monaco',
  'montenegro': 'Montenegro',
  'netherlands': 'Netherlands',
  'norway': 'Norway',
  'poland': 'Poland',
  'portugal': 'Portugal',
  'romania': 'Romania',
  'serbia': 'Serbia',
  'slovakia': 'Slovakia',
  'slovenia': 'Slovenia',
  'spain': 'Spain',
  'sweden': 'Sweden',
  'switzerland': 'Switzerland',
};

export function legacyCountryFolder(canonical) {
  return LEGACY_COUNTRY_FOLDER[canonical] || canonical;
}
