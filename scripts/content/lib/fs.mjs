/**
 * Filesystem helpers for the content build pipeline.
 *
 * Notes:
 *   - All writes are atomic (write-temp + rename) to avoid half-written files.
 *   - JSON is written with stable 2-space indentation and a trailing newline
 *     so git diffs stay readable and reproducible.
 *   - All helpers are async and use node:fs/promises.
 */
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rename, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export async function readJson(path) {
  const raw = await readFile(path, 'utf8');
  return JSON.parse(raw);
}

export async function readJsonOrNull(path) {
  try {
    return await readJson(path);
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

/**
 * Like readJsonOrNull, but also tolerates malformed JSON: returns null and
 * (optionally) reports the parse error via the supplied logger. Useful for
 * migrations and audits that should not abort an entire city when a single
 * source file has pre-existing data corruption.
 */
export async function readJsonTolerant(path, logger) {
  try {
    return await readJson(path);
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    if (logger) logger.warn(`skip malformed ${path}: ${err.message}`);
    return null;
  }
}

const STABLE_JSON = (data) => `${JSON.stringify(data, null, 2)}\n`;

/**
 * Atomically write a JSON file. Creates parent dirs as needed.
 * Skips the write if the on-disk content is byte-identical (idempotency).
 * Returns { written: boolean, path }.
 */
export async function writeJsonAtomic(path, data) {
  const next = STABLE_JSON(data);
  if (existsSync(path)) {
    try {
      const current = await readFile(path, 'utf8');
      if (current === next) return { written: false, path };
    } catch {
      // fall through to write
    }
  }
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.tmp.${process.pid}.${Date.now()}`;
  await writeFile(tmp, next, 'utf8');
  await rename(tmp, path);
  return { written: true, path };
}

/** Async existence check. */
export async function pathExists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

/** Recursively list directory entries (returns absolute paths). */
export async function listDir(path) {
  try {
    const entries = await readdir(path, { withFileTypes: true });
    return entries.map((e) => ({
      name: e.name,
      path: join(path, e.name),
      isDirectory: e.isDirectory(),
      isFile: e.isFile(),
    }));
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

/** SHA-256 hex digest of a JSON-stringified value (stable key order). */
export function checksum(data) {
  const stable = STABLE_JSON(data);
  return `sha256:${createHash('sha256').update(stable).digest('hex')}`;
}

/** Ensure a directory exists. */
export async function ensureDir(path) {
  await mkdir(path, { recursive: true });
}
