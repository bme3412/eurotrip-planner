/**
 * Data Versioning Utilities
 *
 * Handles data version management using YYYY.MM format.
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

/**
 * Get current version string (YYYY.MM format).
 */
export function getCurrentVersion() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}.${month}`;
}

/**
 * Parse a version string into components.
 */
export function parseVersion(versionStr) {
  if (!versionStr) return null;

  const match = versionStr.match(/^(\d{4})\.(\d{2})(?:\.(\d+))?$/);
  if (!match) return null;

  return {
    year: parseInt(match[1], 10),
    month: parseInt(match[2], 10),
    patch: match[3] ? parseInt(match[3], 10) : 0,
  };
}

/**
 * Compare two versions.
 * Returns: -1 if a < b, 0 if equal, 1 if a > b
 */
export function compareVersions(a, b) {
  const vA = parseVersion(a);
  const vB = parseVersion(b);

  if (!vA || !vB) return 0;

  if (vA.year !== vB.year) return vA.year - vB.year;
  if (vA.month !== vB.month) return vA.month - vB.month;
  return vA.patch - vB.patch;
}

/**
 * Bump version based on type.
 */
export function bumpVersion(currentVersion, bumpType = 'patch') {
  const parsed = parseVersion(currentVersion);
  if (!parsed) return getCurrentVersion();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  switch (bumpType) {
    case 'major':
      // Major = new year.01
      return `${currentYear + 1}.01`;

    case 'minor':
      // Minor = current year.next month (or next year if December)
      if (parsed.month === 12) {
        return `${parsed.year + 1}.01`;
      }
      return `${parsed.year}.${String(parsed.month + 1).padStart(2, '0')}`;

    case 'patch':
    default:
      // Patch = same year.month.incrementedPatch
      return `${parsed.year}.${String(parsed.month).padStart(2, '0')}.${parsed.patch + 1}`;
  }
}

/**
 * Calculate content hash for change detection.
 */
export function calculateContentHash(content) {
  const data = typeof content === 'string' ? content : JSON.stringify(content);
  return `sha256:${crypto.createHash('sha256').update(data).digest('hex').slice(0, 12)}`;
}

/**
 * Generate meta block for data files.
 */
export function generateMeta(options = {}) {
  return {
    schemaVersion: options.schemaVersion || 2,
    dataVersion: options.dataVersion || getCurrentVersion(),
    generatedAt: new Date().toISOString(),
    source: options.source || 'pipeline',
    qualityScore: options.qualityScore ?? null,
    contentHash: options.contentHash || null,
  };
}

/**
 * Update meta block in a data file.
 */
export async function updateFileMeta(filePath, updates = {}) {
  const content = await fs.readFile(filePath, 'utf-8');
  const data = JSON.parse(content);

  // Calculate content hash (excluding meta)
  const dataWithoutMeta = { ...data };
  delete dataWithoutMeta._meta;
  const contentHash = calculateContentHash(dataWithoutMeta);

  // Update or create meta
  data._meta = {
    ...(data._meta || {}),
    dataVersion: updates.dataVersion || data._meta?.dataVersion || getCurrentVersion(),
    generatedAt: new Date().toISOString(),
    contentHash,
    ...updates,
  };

  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  return data._meta;
}

/**
 * Generate changelog entry.
 */
export function generateChangelogEntry(version, changes) {
  const now = new Date();
  const monthName = now.toLocaleString('en', { month: 'long' });
  const year = now.getFullYear();

  let entry = `## ${version} (${monthName} ${year})\n\n`;

  if (changes.added?.length > 0) {
    entry += `### Added\n`;
    for (const item of changes.added) {
      entry += `- ${item}\n`;
    }
    entry += '\n';
  }

  if (changes.changed?.length > 0) {
    entry += `### Changed\n`;
    for (const item of changes.changed) {
      entry += `- ${item}\n`;
    }
    entry += '\n';
  }

  if (changes.fixed?.length > 0) {
    entry += `### Fixed\n`;
    for (const item of changes.fixed) {
      entry += `- ${item}\n`;
    }
    entry += '\n';
  }

  if (changes.stats) {
    entry += `### Stats\n`;
    entry += `- Total cities: ${changes.stats.totalCities || 'N/A'}\n`;
    entry += `- Average quality score: ${changes.stats.avgQualityScore || 'N/A'}\n`;
    entry += '\n';
  }

  return entry;
}

/**
 * Prepend changelog entry to changelog file.
 */
export async function updateChangelog(changelogPath, entry) {
  let existing = '';

  try {
    existing = await fs.readFile(changelogPath, 'utf-8');
  } catch {
    // File doesn't exist, create with header
    existing = '# Data Changelog\n\nAll notable changes to the city data will be documented in this file.\n\n';
  }

  // Insert entry after header
  const headerEnd = existing.indexOf('\n\n', existing.indexOf('#')) + 2;
  const header = existing.slice(0, headerEnd);
  const body = existing.slice(headerEnd);

  const updated = header + entry + body;
  await fs.writeFile(changelogPath, updated);
}
