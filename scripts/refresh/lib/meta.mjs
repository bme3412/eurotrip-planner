/**
 * Read + update a city's `_meta.json` in /content for a single section.
 *
 * The schema mirrors the metadata produced by writeCanonical.mjs in the
 * content build:
 *
 *   {
 *     city, country,
 *     importedAt,
 *     source,
 *     sections: {
 *       [sectionKey]: { updatedAt, source, version, checksum }
 *     }
 *   }
 *
 * The refresh CLI uses this to bump the per-section metadata when a
 * generator produces fresh content. Writes are atomic and idempotent — if
 * the checksum is unchanged we still bump `updatedAt`/`version` because the
 * caller explicitly asked for a refresh.
 */
import { join } from 'node:path';
import { checksum, readJsonOrNull, writeJsonAtomic } from '../../content/lib/fs.mjs';

export function metaPath(contentDir) {
  return join(contentDir, '_meta.json');
}

/**
 * Update the metadata entry for one section. Returns the new entry.
 */
export async function updateSectionMeta(contentDir, sectionKey, payload, opts) {
  const { source, now = new Date().toISOString() } = opts;
  const path = metaPath(contentDir);
  const prior = (await readJsonOrNull(path)) ?? {};
  const sections = prior.sections ?? {};
  const prev = sections[sectionKey];
  const nextChecksum = checksum(payload);

  const entry = {
    updatedAt: now,
    source,
    version: (prev?.version ?? 0) + 1,
    checksum: nextChecksum,
  };

  const next = {
    ...prior,
    sections: { ...sections, [sectionKey]: entry },
  };
  await writeJsonAtomic(path, next);
  return entry;
}

export async function readSectionMeta(contentDir, sectionKey) {
  const path = metaPath(contentDir);
  const prior = (await readJsonOrNull(path)) ?? {};
  return prior.sections?.[sectionKey] ?? null;
}
