/**
 * Map a section key -> filename inside a content city's directory.
 *
 * Mirrors the SECTION_FILENAMES table in scripts/content/stages/writeCanonical.mjs
 * but for the *source* layout under /content/cities (where prose is JSON, not
 * MDX — Phase B kept prose as JSON for byte-identical reproduction).
 */
import { join } from 'node:path';

const SECTION_FILES = {
  overview: 'overview.json',
  attractions: 'attractions.json',
  neighborhoods: 'neighborhoods.json',
  culinary: 'culinary.json',
  connections: 'connections.json',
  visitCalendar: 'visit-calendar.json',
  seasonalActivities: 'seasonal-activities.json',
  photos: 'photos.json',
  'prose.startHere': 'prose/start-here.json',
  'prose.foodGuide': 'prose/food-guide.json',
  'prose.seasonal': 'prose/seasonal.json',
  'prose.gettingIn': 'prose/getting-in.json',
};

const MONTHLY_PREFIX = 'monthly.';

export function sectionFilePath(contentDir, sectionKey) {
  if (sectionKey.startsWith(MONTHLY_PREFIX)) {
    const month = sectionKey.slice(MONTHLY_PREFIX.length).toLowerCase();
    return join(contentDir, 'monthly', `${month}.json`);
  }
  const file = SECTION_FILES[sectionKey];
  if (!file) throw new Error(`Unknown section key: ${sectionKey}`);
  return join(contentDir, file);
}

export function isKnownSection(sectionKey) {
  if (sectionKey.startsWith(MONTHLY_PREFIX)) return true;
  return Object.prototype.hasOwnProperty.call(SECTION_FILES, sectionKey);
}

export function listSectionKeys() {
  return [...Object.keys(SECTION_FILES), ...['january','february','march','april','may','june','july','august','september','october','november','december'].map((m) => `monthly.${m}`)];
}
