#!/usr/bin/env node
/**
 * One-shot migration: legacy `/public/data/{Country}/{city}/` → `/content/cities/{country-slug}/{city-slug}/`.
 *
 * Phase B step 1. After this runs, `/content/cities/` becomes the source of
 * truth; the build pipeline reads from there and emits to `/public/data/`.
 *
 * Source mapping (per city):
 *
 *   identity                                  -> city.json
 *   index.json#overview                       -> overview.json
 *   index.json#attractions                    -> attractions.json
 *   index.json#neighborhoods                  -> neighborhoods.json
 *   index.json#culinaryGuide                  -> culinary.json
 *   index.json#connections                    -> connections.json
 *   index.json#visitCalendar                  -> visit-calendar.json
 *   index.json#seasonalActivities             -> seasonal-activities.json
 *   index.json#photos (if present)            -> photos.json
 *   index.json#summary (if present)           -> summary.json
 *   start-here.json                           -> prose/start-here.json
 *   food-guide.json                           -> prose/food-guide.json
 *   seasonal-prose.json                       -> prose/seasonal.json
 *   getting-in.json                           -> prose/getting-in.json
 *   monthly/{month}.json                      -> monthly/{month}.json
 *   monthly/monthly-taglines.json (if any)    -> monthly/taglines.json
 *   monthly/things-to-do.json (if any)        -> monthly/things-to-do.json
 *   {slug}-experiences.json (if any)          -> experiences.json
 *                                                _meta.json
 *
 * Reading is via the existing legacy folder names (Title-case + hyphenated
 * multi-word). Writing is canonical (lowercase-hyphen). The script is fully
 * idempotent: re-running with no source changes produces zero writes.
 *
 * Legacy duplicate per-section files ({slug}_attractions.json etc.) are
 * intentionally NOT migrated — they are stale shadows of index.json and are
 * killed in Phase D.
 *
 * Usage:
 *   node scripts/content/migrate-to-content.mjs                  # all cities
 *   node scripts/content/migrate-to-content.mjs --city paris     # one city
 *   node scripts/content/migrate-to-content.mjs --country france # all in country
 *   node scripts/content/migrate-to-content.mjs --dry-run        # report only
 *   node scripts/content/migrate-to-content.mjs --limit 5        # first N
 *   node scripts/content/migrate-to-content.mjs --verbose
 */
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJsonOrNull, readJsonTolerant, writeJsonAtomic, pathExists } from './lib/fs.mjs';
import { canonicalCity, canonicalCountry, legacyCountryFolder } from './lib/slugs.mjs';
import { parseArgs, makeLogger } from './lib/cli.mjs';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const PUBLIC_DATA = join(REPO_ROOT, 'public', 'data');
const CONTENT_ROOT = join(REPO_ROOT, 'content', 'cities');
const CITIES_JSON = join(REPO_ROOT, 'src', 'generated', 'cities.json');

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

// Capitalized variants used by index.json#monthly when individual month
// files are missing or sparse.
const MONTH_KEY_VARIANTS = (m) => [m, m[0].toUpperCase() + m.slice(1)];

/** Build the per-city write plan; return { written, skipped, errors }. */
async function migrateCity(identity, opts) {
  const { dryRun, logger, buildId } = opts;
  const citySlug = canonicalCity(identity.id);
  const countrySlug = canonicalCountry(identity.country);
  const legacyCountryDir = legacyCountryFolder(countrySlug);
  const legacyDir = join(PUBLIC_DATA, legacyCountryDir, identity.id);
  const contentDir = join(CONTENT_ROOT, countrySlug, citySlug);

  if (!(await pathExists(legacyDir))) {
    logger.warn(`skip ${countrySlug}/${citySlug}: legacy dir not found at ${legacyDir}`);
    return { written: 0, skipped: 0, errors: 0, missing: true };
  }

  // ── Read all sources ────────────────────────────────────────────────
  const index = await readJsonOrNull(join(legacyDir, 'index.json'));
  if (!index) {
    logger.error(`${countrySlug}/${citySlug}: missing index.json`);
    return { written: 0, skipped: 0, errors: 1 };
  }

  // Tolerate malformed source files: log a warning and continue rather
  // than aborting the whole city. The migration is supposed to be
  // best-effort against legacy data; pre-existing corruption is
  // surfaced via warnings and tracked separately for cleanup.
  const [startHere, foodGuide, seasonalProse, gettingIn, experiences,
    taglines, thingsToDo] = await Promise.all([
    readJsonTolerant(join(legacyDir, 'start-here.json'), logger),
    readJsonTolerant(join(legacyDir, 'food-guide.json'), logger),
    readJsonTolerant(join(legacyDir, 'seasonal-prose.json'), logger),
    readJsonTolerant(join(legacyDir, 'getting-in.json'), logger),
    readJsonTolerant(join(legacyDir, `${identity.id}-experiences.json`), logger),
    readJsonTolerant(join(legacyDir, 'monthly', 'monthly-taglines.json'), logger),
    readJsonTolerant(join(legacyDir, 'monthly', 'things-to-do.json'), logger),
  ]);

  // Months: prefer per-file, fall back to index.monthly[Capitalized]
  const monthlyDir = join(legacyDir, 'monthly');
  const monthlyResults = await Promise.all(
    MONTHS.map(async (m) => [m, await readJsonTolerant(join(monthlyDir, `${m}.json`), logger)])
  );
  const indexMonthly = (index.monthly && typeof index.monthly === 'object') ? index.monthly : {};
  const monthlyOut = {};
  for (const [m, data] of monthlyResults) {
    if (data) {
      monthlyOut[m] = data;
      continue;
    }
    for (const k of MONTH_KEY_VARIANTS(m)) {
      if (indexMonthly[k] != null) {
        monthlyOut[m] = indexMonthly[k];
        break;
      }
    }
  }

  // ── Compose city.json identity ──────────────────────────────────────
  const cityJson = {
    citySlug,
    name: identity.name,
    country: identity.country,
    countrySlug,
    coords: (identity.latitude != null && identity.longitude != null)
      ? { latitude: identity.latitude, longitude: identity.longitude }
      : null,
    region: identity.region ?? null,
    thumbnail: identity.thumbnail ?? null,
    description: identity.description ?? null,
    tourismCategories: identity.tourismCategories ?? [],
    linguisticCategories: identity.linguisticCategories ?? [],
    legacy: {
      country: legacyCountryDir,
      dir: identity.id,
    },
  };

  // ── Map source -> destination relative paths ────────────────────────
  const writes = [];
  const queue = (relPath, data) => {
    if (data == null) return;
    writes.push({ relPath, data });
  };

  queue('city.json', cityJson);
  queue('overview.json', index.overview);
  queue('attractions.json', index.attractions);
  queue('neighborhoods.json', index.neighborhoods);
  queue('culinary.json', index.culinaryGuide);
  queue('connections.json', index.connections);
  queue('visit-calendar.json', index.visitCalendar);
  queue('seasonal-activities.json', index.seasonalActivities);
  if (index.photos) queue('photos.json', index.photos);
  if (index.summary) queue('summary.json', index.summary);
  if (experiences) queue('experiences.json', experiences);

  queue('prose/start-here.json', startHere);
  queue('prose/food-guide.json', foodGuide);
  queue('prose/seasonal.json', seasonalProse);
  queue('prose/getting-in.json', gettingIn);

  for (const [m, data] of Object.entries(monthlyOut)) {
    queue(`monthly/${m}.json`, data);
  }
  if (taglines) queue('monthly/taglines.json', taglines);
  if (thingsToDo) queue('monthly/things-to-do.json', thingsToDo);

  // _meta.json: stable initial scaffold. Generators (refresh CLI) bump
  // updatedAt/version/checksum per-section over time. Preserve the
  // existing importedAt timestamp so re-running the migration is a
  // no-op if sources are unchanged. The canonical build's _meta.json
  // under /public/data carries the live per-section checksums.
  const priorMeta = await readJsonOrNull(join(contentDir, '_meta.json'));
  const meta = {
    city: citySlug,
    country: countrySlug,
    sections: priorMeta?.sections ?? {},
    importedAt: priorMeta?.importedAt ?? buildId,
    source: 'import:legacy',
  };
  queue('_meta.json', meta);

  // ── Execute writes ──────────────────────────────────────────────────
  let written = 0;
  let skipped = 0;
  for (const w of writes) {
    const dest = join(contentDir, w.relPath);
    if (dryRun) {
      logger.debug(`[dry-run] ${countrySlug}/${citySlug}/${w.relPath}`);
      continue;
    }
    const res = await writeJsonAtomic(dest, w.data);
    if (res.written) {
      written += 1;
      logger.debug(`wrote ${countrySlug}/${citySlug}/${w.relPath}`);
    } else {
      skipped += 1;
    }
  }

  return { written, skipped, errors: 0, files: writes.length };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const logger = makeLogger({ verbose: !!args.verbose, quiet: !!args.quiet });
  const dryRun = !!args['dry-run'] || !!args.dryRun;
  const buildId = new Date().toISOString();

  const cities = JSON.parse(await (await import('node:fs/promises')).readFile(CITIES_JSON, 'utf8'));
  let filtered = cities;
  if (args.city) {
    filtered = filtered.filter((c) => canonicalCity(c.id) === canonicalCity(args.city));
  }
  if (args.country) {
    filtered = filtered.filter((c) => canonicalCountry(c.country) === canonicalCountry(args.country));
  }
  if (args.limit) {
    filtered = filtered.slice(0, Number(args.limit));
  }

  logger.info(`→ migrate start (buildId=${buildId})`);
  logger.info(`→ ${cities.length} cities known; migrating ${filtered.length}`);

  let totalWritten = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  let totalMissing = 0;

  for (const identity of filtered) {
    try {
      const res = await migrateCity(identity, { dryRun, logger, buildId });
      if (res.missing) {
        totalMissing += 1;
        continue;
      }
      totalWritten += res.written;
      totalSkipped += res.skipped;
      totalErrors += res.errors;
      const tag = res.errors > 0 ? '✗' : '✓';
      const country = canonicalCountry(identity.country);
      logger.info(`${tag} ${country}/${canonicalCity(identity.id)}: ${res.written} written, ${res.skipped} unchanged${res.errors ? `, ${res.errors} errors` : ''}`);
    } catch (err) {
      totalErrors += 1;
      logger.error(`✗ ${identity.country}/${identity.id}: ${err.message}`);
    }
  }

  logger.info(`→ done: ${filtered.length - totalMissing} cities, ${totalWritten} written, ${totalSkipped} unchanged, ${totalMissing} missing, ${totalErrors} errors`);
  process.exit(totalErrors > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
