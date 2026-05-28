#!/usr/bin/env node
/**
 * Refresh CLI — regenerate one slice of one city.
 *
 * Subcommands:
 *
 *   refresh city <slug> --section <name> [--dry-run] [--source <override>]
 *     Refresh a single section for a single city.
 *
 *   refresh city <slug> --all [--dry-run]
 *     Refresh every section listed in the registry for one city.
 *
 *   refresh section <name> [--country <slug>] [--dry-run]
 *     Refresh one section across all cities (optionally one country only).
 *
 *   refresh stale --older-than <duration> [--section <name>] [--dry-run]
 *     Refresh any section whose `_meta.json` updatedAt is older than the
 *     supplied duration (e.g. 90d, 4h, 30m). Defaults to scanning every
 *     section in the registry; pass --section to narrow.
 *
 * Per (city, section) the flow is:
 *   1. Read current section file under /content/cities/.
 *   2. Call generator from registry.mjs.
 *   3. Atomically write new payload back to /content (skipped on dry-run).
 *   4. Bump _meta.json[sections][section].
 *   5. Rebuild downstream /public/data via scripts/content/build.mjs.
 *
 * Exits non-zero if any (city, section) pair errored.
 */
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { discoverContentCities } from '../content/lib/discover.mjs';
import { canonicalCity } from '../content/lib/slugs.mjs';
import { makeLogger, parseArgs } from '../content/lib/cli.mjs';
import { readJsonOrNull, writeJsonAtomic } from '../content/lib/fs.mjs';
import { getGeneratorMeta, listSections, REGISTRY } from './registry.mjs';
import { sectionFilePath, isKnownSection } from './lib/sectionFile.mjs';
import { updateSectionMeta } from './lib/meta.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..', '..');

function parseDuration(str) {
  const m = /^(\d+)(ms|s|m|h|d)$/.exec(String(str).trim());
  if (!m) throw new Error(`Invalid duration: ${str} (expected e.g. 90d, 4h, 30m)`);
  const n = Number(m[1]);
  const unit = m[2];
  const mult = { ms: 1, s: 1e3, m: 60e3, h: 3600e3, d: 86400e3 }[unit];
  return n * mult;
}

function help() {
  // eslint-disable-next-line no-console
  console.log(
    `refresh — regenerate one slice of city data\n\n` +
    `Usage:\n` +
    `  refresh city <slug> --section <name> [--dry-run] [--source <override>]\n` +
    `  refresh city <slug> --all [--dry-run]\n` +
    `  refresh section <name> [--country <slug>] [--dry-run]\n` +
    `  refresh stale --older-than <90d|4h|30m> [--section <name>] [--dry-run]\n\n` +
    `Sections wired in registry:\n` +
    listSections().map((s) => `  - ${s}`).join('\n') + '\n'
  );
}

async function loadGenerator(meta) {
  const mod = await import(new URL(meta.module, import.meta.url));
  if (typeof mod.generate !== 'function') {
    throw new Error(`Generator ${meta.module} is missing exported generate()`);
  }
  return mod;
}

async function runOne({ city, section, dryRun, sourceOverride, logger }) {
  const meta = getGeneratorMeta(section);
  if (!meta) throw new Error(`No generator registered for section "${section}"`);

  const sectionFile = sectionFilePath(city.contentPath, section);
  const current = await readJsonOrNull(sectionFile);
  const generator = await loadGenerator(meta);

  const payload = await generator.generate({
    city,
    current,
    ctx: { repoRoot: REPO_ROOT, logger },
  });

  if (payload == null) {
    logger.warn(`${city.citySlug}/${section}: generator returned null — skipping`);
    return { city: city.citySlug, section, status: 'skipped' };
  }

  if (dryRun) {
    logger.info(`[dry-run] ${city.citySlug}/${section}: would write ${sectionFile}`);
    return { city: city.citySlug, section, status: 'dry-run' };
  }

  const write = await writeJsonAtomic(sectionFile, payload);
  const entry = await updateSectionMeta(city.contentPath, section, payload, {
    source: sourceOverride || meta.source,
  });

  logger.ok(
    `${city.citySlug}/${section}: ${write.written ? 'wrote' : 'unchanged'} (v${entry.version}, ${entry.source})`
  );
  return { city: city.citySlug, section, status: write.written ? 'updated' : 'unchanged' };
}

function runBuild({ filterCity, logger }) {
  // Rebuild downstream /public/data via the content build. Scoped to the
  // affected city when possible so a single-section refresh stays cheap.
  return new Promise((resolveProm, rejectProm) => {
    const args = ['scripts/content/build.mjs', '--source', 'content'];
    if (filterCity) args.push('--city', filterCity);
    const proc = spawn(process.execPath, args, { cwd: REPO_ROOT, stdio: 'inherit' });
    proc.on('exit', (code) => {
      if (code === 0) resolveProm();
      else rejectProm(new Error(`content build exited ${code}`));
    });
    proc.on('error', rejectProm);
  });
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h') {
    help();
    process.exit(0);
  }
  const sub = argv.shift();
  const args = parseArgs(argv);
  const logger = makeLogger({ verbose: !!args.verbose, quiet: !!args.quiet });
  const dryRun = !!args['dry-run'] || !!args.dryRun;
  const sourceOverride = args.source ? String(args.source) : null;

  const allCities = await discoverContentCities(REPO_ROOT);
  const cityByKey = new Map(allCities.map((c) => [c.citySlug, c]));

  const jobs = [];

  if (sub === 'city') {
    const slug = canonicalCity(String(args._[0] || ''));
    if (!slug) throw new Error('Missing city slug. Usage: refresh city <slug> --section <name>');
    const city = cityByKey.get(slug);
    if (!city) throw new Error(`City not found in /content: ${slug}`);
    const sections = args.all ? listSections() : [String(args.section || '')];
    if (sections.some((s) => !s)) throw new Error('Pass --section <name> or --all');
    for (const s of sections) {
      if (!isKnownSection(s)) throw new Error(`Unknown section: ${s}`);
      if (!getGeneratorMeta(s)) {
        logger.warn(`skip ${slug}/${s}: no generator registered`);
        continue;
      }
      jobs.push({ city, section: s });
    }
  } else if (sub === 'section') {
    const section = String(args._[0] || '');
    if (!section) throw new Error('Missing section name. Usage: refresh section <name>');
    if (!getGeneratorMeta(section)) throw new Error(`No generator registered for "${section}"`);
    const country = args.country ? String(args.country).toLowerCase() : null;
    for (const c of allCities) {
      if (country && c.countrySlug !== country) continue;
      jobs.push({ city: c, section });
    }
  } else if (sub === 'stale') {
    const olderThan = args['older-than'] || args.olderThan;
    if (!olderThan) throw new Error('Pass --older-than <e.g. 90d>');
    const cutoff = Date.now() - parseDuration(olderThan);
    const filterSection = args.section ? String(args.section) : null;
    const sections = filterSection ? [filterSection] : Object.keys(REGISTRY);
    for (const c of allCities) {
      const meta = await readJsonOrNull(join(c.contentPath, '_meta.json'));
      const map = meta?.sections ?? {};
      for (const s of sections) {
        const entry = map[s];
        const t = entry?.updatedAt ? Date.parse(entry.updatedAt) : 0;
        if (!Number.isFinite(t) || t < cutoff) jobs.push({ city: c, section: s });
      }
    }
    logger.info(`stale scan: ${jobs.length} (city, section) pairs older than ${olderThan}`);
  } else {
    help();
    process.exit(2);
  }

  if (jobs.length === 0) {
    logger.info('nothing to do');
    process.exit(0);
  }

  const results = [];
  for (const job of jobs) {
    try {
      const r = await runOne({ ...job, dryRun, sourceOverride, logger });
      results.push(r);
    } catch (err) {
      logger.error(`${job.city.citySlug}/${job.section}: ${err.message}`);
      results.push({ city: job.city.citySlug, section: job.section, status: 'error', error: err.message });
    }
  }

  const touchedCities = new Set(results.filter((r) => r.status === 'updated').map((r) => r.city));
  if (!dryRun && touchedCities.size > 0) {
    // Single city -> scoped build; multiple -> one global build.
    const single = touchedCities.size === 1 ? [...touchedCities][0] : null;
    try {
      await runBuild({ filterCity: single, logger });
    } catch (err) {
      logger.error(`downstream build failed: ${err.message}`);
      process.exit(1);
    }
  }

  const errors = results.filter((r) => r.status === 'error').length;
  const updated = results.filter((r) => r.status === 'updated').length;
  const unchanged = results.filter((r) => r.status === 'unchanged').length;
  const skipped = results.filter((r) => r.status === 'skipped' || r.status === 'dry-run').length;
  logger.info(`done: ${updated} updated, ${unchanged} unchanged, ${skipped} skipped, ${errors} errors`);
  process.exit(errors > 0 ? 1 : 0);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('fatal:', err.message);
  if (process.env.DEBUG) console.error(err.stack);
  process.exit(2);
});
