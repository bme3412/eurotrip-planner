#!/usr/bin/env node
/**
 * Migrate legacy city imagery into the per-city folder layout.
 *
 * From:
 *   public/images/city-thumbnail/{Country}/{slug}-thumbnail.{jpeg,jpg}
 *   public/images/city-page/{Country}/{slug}-hero.jpeg
 *
 * To:
 *   public/images/cities/{Country}/{slug}/thumbnail.jpeg
 *   public/images/cities/{Country}/{slug}/hero.jpeg
 *   public/images/cities/{Country}/{slug}/hero-2x.jpeg   (when source is big enough)
 *
 * Standard sizes:
 *   thumbnail  800 × 600   (4:3, centre-cropped)
 *   hero      1600 × 900   (16:9, centre-cropped)
 *   hero-2x   3200 × 1800  (16:9, centre-cropped; only when source ≥ 3200 × 1800)
 *
 * Special case:
 *   Paris uses paris-montmartre-hero-2x.jpeg as its hero source when present.
 *
 * Flags:
 *   --dry-run   Print actions without touching disk.
 *   --force     Re-emit even when destination already exists and is newer.
 *
 * Requires: macOS `sips` (preinstalled). No npm deps.
 */

import { execFileSync } from 'node:child_process';
import { promises as fs, existsSync, statSync, mkdirSync, copyFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PUBLIC_IMAGES = path.join(ROOT, 'public', 'images');
const SRC_THUMB_DIR = path.join(PUBLIC_IMAGES, 'city-thumbnail');
const SRC_HERO_DIR = path.join(PUBLIC_IMAGES, 'city-page');
const DEST_DIR = path.join(PUBLIC_IMAGES, 'cities');

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');

const THUMB = { w: 800, h: 600 };
const HERO_1X = { w: 1600, h: 900 };
const HERO_2X = { w: 3200, h: 1800 };

const PARIS_SPECIAL_SOURCE = path.join(
  SRC_HERO_DIR,
  'France',
  'paris-montmartre-hero-2x.jpeg',
);

// ── tiny utils ──────────────────────────────────────────────────────

function log(...args) {
  console.log(...args);
}

function imgDims(file) {
  try {
    const out = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', file], {
      encoding: 'utf-8',
    });
    const w = Number(out.match(/pixelWidth:\s*(\d+)/)?.[1]);
    const h = Number(out.match(/pixelHeight:\s*(\d+)/)?.[1]);
    return Number.isFinite(w) && Number.isFinite(h) ? { w, h } : null;
  } catch {
    return null;
  }
}

function ensureDir(dir) {
  if (DRY_RUN) return;
  mkdirSync(dir, { recursive: true });
}

function needsWrite(srcPath, destPath) {
  if (FORCE) return true;
  if (!existsSync(destPath)) return true;
  try {
    const s = statSync(srcPath).mtimeMs;
    const d = statSync(destPath).mtimeMs;
    return s > d;
  } catch {
    return true;
  }
}

/**
 * Centre-crop `srcPath` to the largest rectangle matching the target aspect,
 * then resize down to (targetW, targetH). Never upscales. Writes JPEG.
 *
 * Returns the actual output { w, h } or null if `sips` failed.
 */
function cropAndResize(srcPath, destPath, targetW, targetH) {
  const src = imgDims(srcPath);
  if (!src) return null;

  const targetRatio = targetW / targetH;
  const srcRatio = src.w / src.h;

  // Aspect-crop dims at source resolution.
  let cropW;
  let cropH;
  if (srcRatio > targetRatio) {
    cropH = src.h;
    cropW = Math.round(src.h * targetRatio);
  } else {
    cropW = src.w;
    cropH = Math.round(src.w / targetRatio);
  }

  // Don't upscale: clamp final size to source crop dims.
  const finalW = Math.min(targetW, cropW);
  const finalH = Math.min(targetH, cropH);

  if (DRY_RUN) {
    log(`    would crop ${src.w}×${src.h} → ${cropW}×${cropH} → resize ${finalW}×${finalH}`);
    return { w: finalW, h: finalH };
  }

  // sips overwrites in place, so copy first then transform.
  // NOTE: a single sips invocation that combines `-c` and `-z` produces
  // surprising dims (sips re-orders the ops and distorts). Run them as two
  // separate invocations: crop first, then resize.
  ensureDir(path.dirname(destPath));
  copyFileSync(srcPath, destPath);
  try {
    execFileSync('sips', [
      '-c', String(cropH), String(cropW),
      destPath,
    ], { stdio: 'ignore' });
    execFileSync('sips', [
      '-z', String(finalH), String(finalW),
      '-s', 'format', 'jpeg',
      destPath,
    ], { stdio: 'ignore' });
    return { w: finalW, h: finalH };
  } catch (err) {
    log(`    ! sips failed for ${destPath}: ${err.message}`);
    return null;
  }
}

// ── walkers ─────────────────────────────────────────────────────────

async function listCountryDirs(root) {
  if (!existsSync(root)) return [];
  const entries = await fs.readdir(root, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

async function listFiles(dir) {
  if (!existsSync(dir)) return [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries.filter((e) => e.isFile()).map((e) => e.name);
}

// ── main ────────────────────────────────────────────────────────────

const report = []; // { slug, country, thumbnail, hero, hero2x }

async function migrateThumbnails() {
  const countries = await listCountryDirs(SRC_THUMB_DIR);
  for (const country of countries) {
    const dir = path.join(SRC_THUMB_DIR, country);
    const files = await listFiles(dir);
    for (const file of files) {
      const m = file.match(/^(.+)-thumbnail\.(jpeg|jpg)$/i);
      if (!m) continue;
      const slug = m[1];
      const srcPath = path.join(dir, file);
      const destDir = path.join(DEST_DIR, country, slug);
      const destPath = path.join(destDir, 'thumbnail.jpeg');

      const row = report.find((r) => r.slug === slug && r.country === country)
        || (() => { const r = { slug, country, thumbnail: '', hero: '', hero2x: '' }; report.push(r); return r; })();

      if (!needsWrite(srcPath, destPath)) {
        row.thumbnail = 'skipped (up-to-date)';
        continue;
      }

      log(`  thumb ${country}/${slug}`);
      const src = imgDims(srcPath);
      if (!src) { row.thumbnail = 'missing-dims'; continue; }

      if (src.w <= THUMB.w && src.h <= THUMB.h) {
        // Source is at or below target — copy as-is.
        if (DRY_RUN) {
          log(`    would copy as-is (${src.w}×${src.h})`);
        } else {
          ensureDir(destDir);
          copyFileSync(srcPath, destPath);
        }
        row.thumbnail = `copied-as-is ${src.w}×${src.h}`;
        continue;
      }

      const out = cropAndResize(srcPath, destPath, THUMB.w, THUMB.h);
      row.thumbnail = out ? `ok ${out.w}×${out.h}` : 'failed';
    }
  }
}

async function migrateHeroes() {
  const countries = await listCountryDirs(SRC_HERO_DIR);
  for (const country of countries) {
    const dir = path.join(SRC_HERO_DIR, country);
    const files = await listFiles(dir);

    // Map slug → source file. Honour Paris special case.
    const slugToSrc = new Map();
    for (const file of files) {
      const m = file.match(/^(.+)-hero\.jpeg$/i);
      if (!m) continue;
      const slug = m[1];
      // Skip named variants like "paris-montmartre" — they're not their own city.
      if (slug.includes('-')) continue;
      slugToSrc.set(slug, path.join(dir, file));
    }
    if (country === 'France' && existsSync(PARIS_SPECIAL_SOURCE)) {
      slugToSrc.set('paris', PARIS_SPECIAL_SOURCE);
    }

    for (const [slug, srcPath] of slugToSrc) {
      const destDir = path.join(DEST_DIR, country, slug);
      const dest1x = path.join(destDir, 'hero.jpeg');
      const dest2x = path.join(destDir, 'hero-2x.jpeg');

      const row = report.find((r) => r.slug === slug && r.country === country)
        || (() => { const r = { slug, country, thumbnail: '', hero: '', hero2x: '' }; report.push(r); return r; })();

      const src = imgDims(srcPath);
      if (!src) { row.hero = 'missing-dims'; continue; }
      log(`  hero  ${country}/${slug}  (src ${src.w}×${src.h})`);

      // 1x
      if (needsWrite(srcPath, dest1x)) {
        if (src.w >= HERO_1X.w && src.h >= HERO_1X.h) {
          const out = cropAndResize(srcPath, dest1x, HERO_1X.w, HERO_1X.h);
          row.hero = out ? `ok ${out.w}×${out.h}` : 'failed';
        } else {
          // Source smaller than 1x target — crop to 16:9 at native size, no upscale.
          const out = cropAndResize(srcPath, dest1x, src.w, Math.round(src.w * 9 / 16));
          row.hero = out ? `copied-as-is ${out.w}×${out.h}` : 'failed';
        }
      } else {
        row.hero = 'skipped (up-to-date)';
      }

      // 2x — only when source resolution allows
      if (needsWrite(srcPath, dest2x)) {
        if (src.w >= HERO_2X.w && src.h >= HERO_2X.h) {
          const out = cropAndResize(srcPath, dest2x, HERO_2X.w, HERO_2X.h);
          row.hero2x = out ? `ok ${out.w}×${out.h}` : 'failed';
        } else if (src.w >= HERO_1X.w * 1.25 || src.h >= HERO_1X.h * 1.25) {
          // Source is meaningfully larger than 1x but smaller than 2x — emit the
          // largest 16:9 crop we can. Better than nothing on retina screens.
          const cropW = src.w;
          const cropH = Math.round(src.w * 9 / 16);
          const finalH = Math.min(cropH, src.h);
          const finalW = Math.round(finalH * 16 / 9);
          const out = cropAndResize(srcPath, dest2x, finalW, finalH);
          row.hero2x = out ? `best-effort ${out.w}×${out.h}` : 'failed';
        } else {
          row.hero2x = 'skipped-low-res';
        }
      } else {
        row.hero2x = 'skipped (up-to-date)';
      }
    }
  }
}

async function main() {
  log(`migrateCityImages — ${DRY_RUN ? 'DRY RUN' : 'WRITE'}${FORCE ? ' (force)' : ''}`);
  log(`  src thumbs : ${path.relative(ROOT, SRC_THUMB_DIR)}`);
  log(`  src heroes : ${path.relative(ROOT, SRC_HERO_DIR)}`);
  log(`  dest       : ${path.relative(ROOT, DEST_DIR)}`);
  log('');

  log('thumbnails ─────────────────────');
  await migrateThumbnails();

  log('\nheroes ─────────────────────────');
  await migrateHeroes();

  // Report
  report.sort((a, b) =>
    a.country.localeCompare(b.country) || a.slug.localeCompare(b.slug),
  );
  log('\nreport ─────────────────────────');
  log('slug,country,thumbnail,hero,hero-2x');
  for (const r of report) {
    log(`${r.slug},${r.country},"${r.thumbnail}","${r.hero}","${r.hero2x}"`);
  }
  log('');

  const counts = report.reduce(
    (acc, r) => {
      if (r.thumbnail.startsWith('ok') || r.thumbnail.startsWith('copied')) acc.thumb++;
      if (r.hero.startsWith('ok') || r.hero.startsWith('copied')) acc.hero++;
      if (r.hero2x.startsWith('ok') || r.hero2x.startsWith('best-effort')) acc.hero2x++;
      return acc;
    },
    { thumb: 0, hero: 0, hero2x: 0 },
  );
  log(
    `summary: ${counts.thumb} thumbnails, ${counts.hero} heroes (${counts.hero2x} with 2x) across ${report.length} cities`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
