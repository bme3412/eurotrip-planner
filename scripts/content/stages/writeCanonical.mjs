/**
 * Emit a city's canonical-layout *additions* alongside the legacy files.
 *
 * Phase A constraint: this build runs alongside the live site and must NOT
 * modify any file the running site reads. The set of files this stage may
 * write is therefore strictly:
 *
 *   {citySlug}/sections/{section}.json
 *   {citySlug}/sections/prose/{name}.json
 *   {citySlug}/_meta.json
 *
 * Anything else is left untouched. In Phase B, when the loader is switched
 * to canonical URLs, this stage will additionally own index.json and
 * monthly/*.json; until then, the legacy files remain the source of truth
 * served to users.
 *
 * Writes are atomic and idempotent (skip when content is byte-identical).
 */
import { join } from 'node:path';
import { checksum, readJsonOrNull, writeJsonAtomic } from '../lib/fs.mjs';

/**
 * Map from internal section key -> filename under `sections/`.
 * Order is preserved in metadata output for stable diffs.
 */
const SECTION_FILENAMES = {
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

/**
 * @param {*} cityData — output of readLegacyCity()
 * @param {{ repoRoot: string, buildId: string, dryRun?: boolean, logger: any }} opts
 * @returns {Promise<{ written: number, skipped: number, files: string[] }>}
 */
export async function writeCanonicalCity(cityData, opts) {
  const { repoRoot, buildId, dryRun = false, logger } = opts;
  // Write next to the legacy files using the legacy cased country folder
  // (e.g. `France/paris`). This is identical to the lowercase canonical
  // path on macOS APFS (case-insensitive) but is the *only* path that
  // resolves on Linux/Vercel until Phase D performs the bulk rename to
  // lowercase. Keeping the output here means served URLs do not change.
  const legacyCountry = cityData.legacy?.legacyCountry || cityData.countrySlug;
  const legacyCityDir = cityData.legacy?.legacyCityDir || cityData.citySlug;
  const base = join(repoRoot, 'public', 'data', legacyCountry, legacyCityDir);

  let written = 0;
  let skipped = 0;
  const touched = [];

  const queue = async (path, data) => {
    if (data == null) return;
    if (dryRun) {
      touched.push(path);
      logger.debug(`[dry-run] would write ${path}`);
      return;
    }
    const res = await writeJsonAtomic(path, data);
    if (res.written) {
      written += 1;
      touched.push(path);
      logger.debug(`wrote ${path}`);
    } else {
      skipped += 1;
    }
  };

  // Read prior _meta so we can preserve unchanged section timestamps. This
  // makes the build idempotent — re-running with no source changes produces
  // zero writes.
  const priorMeta = await readJsonOrNull(join(base, '_meta.json'));
  const priorSections = priorMeta?.sections ?? {};

  const sectionMeta = (key, data, source = 'import:legacy') => {
    const next = checksum(data);
    const prev = priorSections[key];
    if (prev && prev.checksum === next) {
      return prev; // unchanged — keep the prior updatedAt/version verbatim
    }
    return {
      updatedAt: buildId,
      source,
      version: (prev?.version ?? 0) + 1,
      checksum: next,
    };
  };

  // ── Per-section split files (new additions only) ─────────────────────
  const metaSections = {};
  const writes = [];
  for (const [key, filename] of Object.entries(SECTION_FILENAMES)) {
    const data = cityData.sections[key];
    if (data == null) continue;
    writes.push(queue(join(base, 'sections', filename), data));
    metaSections[key] = sectionMeta(key, data);
  }

  // Record monthly freshness even though the build does not (yet) own
  // monthly/*.json files — the per-month checksums let future refresh runs
  // detect drift between source and served content.
  for (const [month, data] of Object.entries(cityData.monthly.perMonth)) {
    if (!data) continue;
    metaSections[`monthly.${month}`] = sectionMeta(`monthly.${month}`, data);
  }

  // ── _meta.json (per-section freshness map) ───────────────────────────
  // builtAt advances only when any section actually changed; otherwise we
  // preserve the prior value so the file is byte-stable across rebuilds.
  const anyChanged = Object.entries(metaSections).some(
    ([k, v]) => v !== priorSections[k]
  );
  const builtAt = anyChanged ? buildId : priorMeta?.builtAt ?? buildId;

  const meta = {
    city: cityData.citySlug,
    country: cityData.countrySlug,
    builtAt,
    legacy: {
      country: cityData.legacy.legacyCountry,
      dir: cityData.legacy.legacyCityDir,
    },
    sections: metaSections,
  };
  writes.push(queue(join(base, '_meta.json'), meta));

  await Promise.all(writes);

  return { written, skipped, files: touched };
}
