/**
 * Read all source files for a single legacy city directory.
 *
 * Returns a normalized in-memory representation that the write stage can
 * project into the canonical layout. We treat `index.json` as the primary
 * source for structured sections (it consolidates the per-section legacy
 * files) and read the standalone editorial files independently.
 */
import { join } from 'node:path';
import { readJson, readJsonOrNull } from '../lib/fs.mjs';

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

/**
 * @param {{ legacyPath: string }} city — entry from discoverLegacyCities()
 */
export async function readLegacyCity(city) {
  const root = city.legacyPath;

  const index = await readJson(join(root, 'index.json'));

  // Editorial / standalone files (may be absent for some cities).
  const [startHere, foodGuide, seasonalProse, gettingIn] = await Promise.all([
    readJsonOrNull(join(root, 'start-here.json')),
    readJsonOrNull(join(root, 'food-guide.json')),
    readJsonOrNull(join(root, 'seasonal-prose.json')),
    readJsonOrNull(join(root, 'getting-in.json')),
  ]);

  // Monthly: prefer the consolidated monthly/index.json. Also pick up
  // individual month files so the canonical output can emit both.
  const monthlyDir = join(root, 'monthly');
  const monthlyIndex = await readJsonOrNull(join(monthlyDir, 'index.json'));
  // Read all month files in parallel for speed, but assign to the result
  // object in MONTHS order so iteration is deterministic across runs. This
  // matters for _meta.json byte-stability: Object.entries() reflects
  // insertion order, which would otherwise track IO-completion order.
  const monthlyResults = await Promise.all(
    MONTHS.map(async (m) => [m, await readJsonOrNull(join(monthlyDir, `${m}.json`))])
  );
  const monthlyMonths = {};
  for (const [m, data] of monthlyResults) {
    if (data) monthlyMonths[m] = data;
  }

  // index.json may also embed monthly under `monthly` key.
  const monthlyFromIndex = index.monthly && typeof index.monthly === 'object' ? index.monthly : null;

  return {
    citySlug: city.citySlug,
    countrySlug: city.countrySlug,
    legacy: city,
    sections: {
      // Structured sections (live inside index.json today).
      overview: index.overview ?? null,
      attractions: index.attractions ?? null,
      neighborhoods: index.neighborhoods ?? null,
      culinary: index.culinaryGuide ?? null,
      connections: index.connections ?? null,
      visitCalendar: index.visitCalendar ?? null,
      seasonalActivities: index.seasonalActivities ?? null,
      photos: index.photos ?? null,
      summary: index.summary ?? null,
      // Editorial / standalone files.
      'prose.startHere': startHere,
      'prose.foodGuide': foodGuide,
      'prose.seasonal': seasonalProse,
      'prose.gettingIn': gettingIn,
    },
    monthly: {
      // Prefer the dedicated monthly/index.json; fall back to per-month files
      // assembled into one object, then to the monthly key embedded in index.json.
      consolidated:
        monthlyIndex ??
        (Object.keys(monthlyMonths).length > 0 ? monthlyMonths : null) ??
        monthlyFromIndex,
      perMonth: monthlyMonths,
    },
    rawIndex: index,
  };
}
