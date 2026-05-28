/**
 * Emit `src/generated/freshness.json` — a per-section freshness map for the
 * dev-only admin UI and the refresh CLI.
 *
 * Shape:
 *   {
 *     paris: {
 *       country: 'france',
 *       sections: {
 *         overview:        { updatedAt, source, version, checksum },
 *         attractions:     { ... },
 *         'prose.startHere': { ... },
 *         'monthly.october': { ... }
 *       }
 *     },
 *     ...
 *   }
 *
 * Reads each city's `_meta.json` under /content/cities/{country}/{city}/.
 * Cities without a `_meta.json` are skipped silently — the file is created
 * the first time a city is migrated or refreshed.
 */
import { join } from 'node:path';
import { discoverContentCities } from '../lib/discover.mjs';
import { readJsonOrNull, writeJsonAtomic } from '../lib/fs.mjs';

/**
 * @param {{ repoRoot: string, dryRun?: boolean, logger: any }} opts
 * @returns {Promise<{ written: boolean, cities: number, path: string }>}
 */
export async function buildFreshness(opts) {
  const { repoRoot, dryRun = false, logger } = opts;
  const cities = await discoverContentCities(repoRoot);

  const out = {};
  let count = 0;
  for (const c of cities) {
    const metaPath = join(c.contentPath, '_meta.json');
    const meta = await readJsonOrNull(metaPath);
    if (!meta) continue;
    out[c.citySlug] = {
      country: c.countrySlug,
      importedAt: meta.importedAt ?? null,
      sections: meta.sections ?? {},
    };
    count += 1;
  }

  const target = join(repoRoot, 'src', 'generated', 'freshness.json');
  if (dryRun) {
    logger.debug(`[dry-run] would write freshness.json with ${count} cities`);
    return { written: false, cities: count, path: target };
  }
  const res = await writeJsonAtomic(target, out);
  return { written: res.written, cities: count, path: target };
}
