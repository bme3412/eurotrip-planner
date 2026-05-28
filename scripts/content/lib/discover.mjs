/**
 * Discover all cities currently present under /public/data using the legacy
 * cased-country folder layout.
 *
 * A "city" is any directory under a country folder that contains an
 * `index.json` file. Auxiliary directories (e.g. `_scoreboard`,
 * `sample-itineraries`, `schema`) are ignored.
 */
import { join } from 'node:path';
import { canonicalCountry, canonicalCity } from './slugs.mjs';
import { listDir, pathExists } from './fs.mjs';

const PUBLIC_DATA = 'public/data';
const CONTENT_ROOT = 'content/cities';
const COUNTRY_BLOCKLIST = new Set(['_scoreboard', 'sample-itineraries', 'schema']);

export async function discoverLegacyCities(repoRoot = process.cwd()) {
  const dataRoot = join(repoRoot, PUBLIC_DATA);
  const countries = await listDir(dataRoot);
  const cities = [];

  for (const country of countries) {
    if (!country.isDirectory) continue;
    if (COUNTRY_BLOCKLIST.has(country.name)) continue;

    const countrySlug = canonicalCountry(country.name);
    const cityDirs = await listDir(country.path);

    for (const city of cityDirs) {
      if (!city.isDirectory) continue;
      const indexPath = join(city.path, 'index.json');
      if (!(await pathExists(indexPath))) continue;

      cities.push({
        legacyCountry: country.name,
        legacyCityDir: city.name,
        legacyPath: city.path,
        countrySlug,
        citySlug: canonicalCity(city.name),
      });
    }
  }

  // Stable order for deterministic builds.
  cities.sort((a, b) => {
    const c = a.countrySlug.localeCompare(b.countrySlug);
    return c !== 0 ? c : a.citySlug.localeCompare(b.citySlug);
  });

  return cities;
}

/**
 * Discover all cities under /content/cities/{country-slug}/{city-slug}/.
 * A "city" is any directory that contains a `city.json` file.
 */
export async function discoverContentCities(repoRoot = process.cwd()) {
  const contentRoot = join(repoRoot, CONTENT_ROOT);
  if (!(await pathExists(contentRoot))) return [];
  const countries = await listDir(contentRoot);
  const cities = [];

  for (const country of countries) {
    if (!country.isDirectory) continue;
    const countrySlug = canonicalCountry(country.name);
    const cityDirs = await listDir(country.path);

    for (const city of cityDirs) {
      if (!city.isDirectory) continue;
      const cityJsonPath = join(city.path, 'city.json');
      if (!(await pathExists(cityJsonPath))) continue;

      cities.push({
        countrySlug,
        citySlug: canonicalCity(city.name),
        contentPath: city.path,
      });
    }
  }

  cities.sort((a, b) => {
    const c = a.countrySlug.localeCompare(b.countrySlug);
    return c !== 0 ? c : a.citySlug.localeCompare(b.citySlug);
  });

  return cities;
}
