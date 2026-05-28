/**
 * Read a city's source files from `/content/cities/{country-slug}/{city-slug}/`.
 *
 * This is the Phase B successor to `readLegacyCity.mjs`. It produces the same
 * normalized in-memory shape so downstream stages (writeCanonical) are
 * agnostic to the source.
 *
 * Layout expected on disk (produced by `scripts/content/migrate-to-content.mjs`):
 *
 *   city.json                      identity + legacy mapping
 *   overview.json
 *   attractions.json
 *   neighborhoods.json
 *   culinary.json
 *   connections.json
 *   visit-calendar.json
 *   seasonal-activities.json
 *   photos.json                    optional
 *   summary.json                   optional
 *   experiences.json               optional
 *   prose/start-here.json          optional
 *   prose/food-guide.json          optional
 *   prose/seasonal.json            optional
 *   prose/getting-in.json          optional
 *   monthly/{january..december}.json
 *   monthly/taglines.json          optional
 *   monthly/things-to-do.json      optional
 *   _meta.json
 */
import { join } from 'node:path';
import { readJsonOrNull } from '../lib/fs.mjs';

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

/**
 * @param {{ contentPath: string, citySlug: string, countrySlug: string }} city
 */
export async function readContentCity(city) {
  const root = city.contentPath;

  const cityJson = await readJsonOrNull(join(root, 'city.json'));
  if (!cityJson) {
    throw new Error(`missing city.json at ${root}`);
  }

  const [overview, attractions, neighborhoods, culinary, connections,
    visitCalendar, seasonalActivities, photos, summary, experiences] = await Promise.all([
    readJsonOrNull(join(root, 'overview.json')),
    readJsonOrNull(join(root, 'attractions.json')),
    readJsonOrNull(join(root, 'neighborhoods.json')),
    readJsonOrNull(join(root, 'culinary.json')),
    readJsonOrNull(join(root, 'connections.json')),
    readJsonOrNull(join(root, 'visit-calendar.json')),
    readJsonOrNull(join(root, 'seasonal-activities.json')),
    readJsonOrNull(join(root, 'photos.json')),
    readJsonOrNull(join(root, 'summary.json')),
    readJsonOrNull(join(root, 'experiences.json')),
  ]);

  const [startHere, foodGuide, seasonalProse, gettingIn] = await Promise.all([
    readJsonOrNull(join(root, 'prose', 'start-here.json')),
    readJsonOrNull(join(root, 'prose', 'food-guide.json')),
    readJsonOrNull(join(root, 'prose', 'seasonal.json')),
    readJsonOrNull(join(root, 'prose', 'getting-in.json')),
  ]);

  // Read months in parallel; assign in MONTHS order so iteration is
  // deterministic across runs (matters for _meta.json byte-stability).
  const monthlyDir = join(root, 'monthly');
  const monthlyResults = await Promise.all(
    MONTHS.map(async (m) => [m, await readJsonOrNull(join(monthlyDir, `${m}.json`))])
  );
  const monthlyMonths = {};
  for (const [m, data] of monthlyResults) {
    if (data) monthlyMonths[m] = data;
  }

  const [taglines, thingsToDo] = await Promise.all([
    readJsonOrNull(join(monthlyDir, 'taglines.json')),
    readJsonOrNull(join(monthlyDir, 'things-to-do.json')),
  ]);

  // Normalize the legacy mapping to the shape that writeCanonical expects
  // (legacyCountry/legacyCityDir keys). content/city.json carries it as
  // { country, dir }; cope with both for robustness.
  const legacyMap = cityJson.legacy ?? {};
  const legacy = {
    legacyCountry: legacyMap.legacyCountry ?? legacyMap.country ?? cityJson.country ?? city.countrySlug,
    legacyCityDir: legacyMap.legacyCityDir ?? legacyMap.dir ?? city.citySlug,
  };

  return {
    citySlug: city.citySlug,
    countrySlug: city.countrySlug,
    identity: cityJson,
    legacy,
    sections: {
      overview,
      attractions,
      neighborhoods,
      culinary,
      connections,
      visitCalendar,
      seasonalActivities,
      photos,
      summary,
      experiences,
      'prose.startHere': startHere,
      'prose.foodGuide': foodGuide,
      'prose.seasonal': seasonalProse,
      'prose.gettingIn': gettingIn,
    },
    monthly: {
      perMonth: monthlyMonths,
      taglines,
      thingsToDo,
      consolidated: Object.keys(monthlyMonths).length > 0 ? monthlyMonths : null,
    },
  };
}
