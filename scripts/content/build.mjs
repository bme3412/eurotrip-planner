#!/usr/bin/env node
/**
 * Content build pipeline.
 *
 * Reads city source data and writes the canonical layout under
 * `/public/data/{country-slug}/{city-slug}/` alongside the legacy files.
 *
 * Source modes (--source flag):
 *
 *   auto     — prefer /content/cities/.../<city>/ when present, else fall
 *              back to the legacy /public/data/{Country}/{city}/ reader.
 *              (default)
 *   content  — read only from /content/cities/. Fail if missing.
 *   legacy   — read only from /public/data/{Country}/{city}/ (Phase A).
 *
 * Usage:
 *   node scripts/content/build.mjs                        # all cities (auto)
 *   node scripts/content/build.mjs --city paris           # one city
 *   node scripts/content/build.mjs --country france       # one country
 *   node scripts/content/build.mjs --dry-run              # nothing written
 *   node scripts/content/build.mjs --source content       # /content only
 *   node scripts/content/build.mjs --source legacy        # legacy only
 *   node scripts/content/build.mjs --verbose              # debug logs
 *   node scripts/content/build.mjs --limit 5              # first N cities
 *
 * Exits 0 on success, non-zero on fatal error. Per-city errors are logged
 * but do not abort the run.
 */
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { discoverContentCities, discoverLegacyCities } from './lib/discover.mjs';
import { canonicalCity } from './lib/slugs.mjs';
import { makeLogger, parseArgs } from './lib/cli.mjs';
import { readContentCity } from './stages/readContentCity.mjs';
import { readLegacyCity } from './stages/readLegacyCity.mjs';
import { writeCanonicalCity } from './stages/writeCanonical.mjs';
import { buildFreshness } from './stages/buildFreshness.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..', '..');

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const logger = makeLogger({ verbose: !!args.verbose, quiet: !!args.quiet });

  const dryRun = !!args['dry-run'] || !!args.dryRun;
  const sourceMode = args.source ? String(args.source) : 'auto';
  if (!['auto', 'content', 'legacy'].includes(sourceMode)) {
    logger.error(`unknown --source value: ${sourceMode} (expected auto|content|legacy)`);
    process.exit(2);
  }
  const buildId = new Date().toISOString();

  const filterCity = args.city ? canonicalCity(String(args.city)) : null;
  const filterCountry = args.country ? String(args.country).toLowerCase() : null;
  const limit = args.limit ? Number(args.limit) : Infinity;

  logger.info(`content-build start (buildId=${buildId}, source=${sourceMode}${dryRun ? ', dry-run' : ''})`);

  // Build the per-city work queue. We discover legacy + content cities
  // and merge by (country, city) — content wins when both exist, unless
  // sourceMode forces one side.
  const [legacyAll, contentAll] = await Promise.all([
    sourceMode === 'content' ? Promise.resolve([]) : discoverLegacyCities(REPO_ROOT),
    sourceMode === 'legacy' ? Promise.resolve([]) : discoverContentCities(REPO_ROOT),
  ]);

  const byKey = new Map();
  for (const c of legacyAll) byKey.set(`${c.countrySlug}/${c.citySlug}`, { legacy: c, source: 'legacy' });
  for (const c of contentAll) {
    const key = `${c.countrySlug}/${c.citySlug}`;
    const existing = byKey.get(key) || {};
    byKey.set(key, { ...existing, content: c, source: sourceMode === 'legacy' ? existing.source ?? 'legacy' : 'content' });
  }

  let queue = [...byKey.entries()].map(([key, v]) => ({ key, ...v }));
  queue.sort((a, b) => a.key.localeCompare(b.key));
  if (filterCountry) queue = queue.filter((e) => e.key.startsWith(`${filterCountry}/`));
  if (filterCity) queue = queue.filter((e) => e.key.endsWith(`/${filterCity}`));
  if (Number.isFinite(limit)) queue = queue.slice(0, limit);

  logger.info(
    `discovered ${legacyAll.length} legacy + ${contentAll.length} content; processing ${queue.length}`
  );

  const summary = {
    cities: 0,
    filesWritten: 0,
    filesSkipped: 0,
    errors: [],
  };

  for (const entry of queue) {
    const tag = entry.key;
    try {
      let data;
      let usedSource;
      if (entry.source === 'content' && entry.content) {
        data = await readContentCity(entry.content);
        usedSource = 'content';
      } else if (entry.legacy) {
        data = await readLegacyCity(entry.legacy);
        usedSource = 'legacy';
      } else {
        throw new Error(`no source available (mode=${sourceMode})`);
      }

      const result = await writeCanonicalCity(data, {
        repoRoot: REPO_ROOT,
        buildId,
        dryRun,
        logger,
      });
      summary.cities += 1;
      summary.filesWritten += result.written;
      summary.filesSkipped += result.skipped;
      logger.ok(
        `${tag} [${usedSource}]: ${result.written} written, ${result.skipped} unchanged${
          dryRun ? ' (dry-run)' : ''
        }`
      );
    } catch (err) {
      summary.errors.push({ city: tag, message: err.message });
      logger.error(`${tag}: ${err.message}`);
      if (args.verbose) logger.error(err.stack);
    }
  }

  // Emit freshness map for the admin UI / refresh CLI. Cheap to recompute,
  // skipped when filtering to a single city to avoid clobbering global state.
  if (!filterCity && !filterCountry) {
    const fr = await buildFreshness({ repoRoot: REPO_ROOT, dryRun, logger });
    logger.info(`freshness: ${fr.cities} cities ${fr.written ? 'updated' : 'unchanged'}`);
  }

  logger.info(
    `done: ${summary.cities} cities, ${summary.filesWritten} files written, ${summary.filesSkipped} unchanged, ${summary.errors.length} errors`
  );

  process.exit(summary.errors.length > 0 ? 1 : 0);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('fatal:', err);
  process.exit(2);
});
