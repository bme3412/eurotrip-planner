/**
 * Structural diffing for tripState.route.cities.
 *
 * The agent prompt used to rely on prose ("look at the Route: line before
 * claiming a city was removed"). That's brittle — a future prompt rewrite
 * can silently regress it. Instead we deterministically compute what changed
 * after every tool turn on the server, and surface it to the model as a
 * trusted "Recent State Changes" block.
 *
 * Pure module: no IO, no logging, no global state. Safe to unit-test.
 */

function normalizeKey(value) {
  return String(value || '').trim().toLowerCase();
}

function cityKey(city) {
  if (!city) return '';
  return normalizeKey(city.id) || normalizeKey(city.name);
}

function indexCities(cities) {
  const byKey = new Map();
  const order = [];
  for (const c of Array.isArray(cities) ? cities : []) {
    const key = cityKey(c);
    if (!key) continue;
    byKey.set(key, c);
    order.push(key);
  }
  return { byKey, order };
}

/**
 * Compute a structural diff between two trip states' route.cities arrays.
 *
 * @param {object|null|undefined} prev
 * @param {object|null|undefined} next
 * @returns {{
 *   added: Array<{id?: string, name?: string}>,
 *   removed: Array<{id?: string, name?: string}>,
 *   nightsChanged: Array<{id?: string, name?: string, from: number|null, to: number|null}>,
 *   reordered: boolean,
 *   hasChanges: boolean,
 * }}
 */
export function diffRoute(prev, next) {
  const prevCities = prev?.route?.cities;
  const nextCities = next?.route?.cities;
  const a = indexCities(prevCities);
  const b = indexCities(nextCities);

  const added = [];
  const removed = [];
  const nightsChanged = [];

  for (const [key, city] of b.byKey) {
    if (!a.byKey.has(key)) {
      added.push({ id: city.id, name: city.name });
    } else {
      const before = a.byKey.get(key);
      const fromNights = Number.isFinite(before?.nights) ? before.nights : null;
      const toNights = Number.isFinite(city?.nights) ? city.nights : null;
      if (fromNights !== toNights) {
        nightsChanged.push({
          id: city.id,
          name: city.name,
          from: fromNights,
          to: toNights,
        });
      }
    }
  }

  for (const [key, city] of a.byKey) {
    if (!b.byKey.has(key)) {
      removed.push({ id: city.id, name: city.name });
    }
  }

  // Reorder: only meaningful when both sides have the same set of keys.
  const sameSet =
    added.length === 0 &&
    removed.length === 0 &&
    a.order.length === b.order.length;
  const reordered = sameSet && a.order.some((k, i) => k !== b.order[i]);

  const hasChanges =
    added.length > 0 ||
    removed.length > 0 ||
    nightsChanged.length > 0 ||
    reordered;

  return { added, removed, nightsChanged, reordered, hasChanges };
}

/**
 * Merge two diffs in chronological order. Used to accumulate diffs across
 * multiple tool calls within a single agent turn so the model sees the
 * net effect, not just the last sub-step.
 *
 * @param {ReturnType<typeof diffRoute>|null} acc
 * @param {ReturnType<typeof diffRoute>|null} next
 * @returns {ReturnType<typeof diffRoute>}
 */
export function mergeDiffs(acc, next) {
  const base = acc || { added: [], removed: [], nightsChanged: [], reordered: false, hasChanges: false };
  if (!next || !next.hasChanges) return base;

  const removedKeys = new Set(base.removed.map((c) => cityKey(c)));
  const addedKeys = new Set(base.added.map((c) => cityKey(c)));
  const added = [...base.added];
  const removed = [...base.removed];

  for (const c of next.added) {
    const k = cityKey(c);
    if (removedKeys.has(k)) {
      // Was removed earlier this turn, now re-added: net no-op for this key.
      const i = removed.findIndex((r) => cityKey(r) === k);
      if (i >= 0) removed.splice(i, 1);
      removedKeys.delete(k);
    } else if (!addedKeys.has(k)) {
      added.push(c);
      addedKeys.add(k);
    }
  }

  for (const c of next.removed) {
    const k = cityKey(c);
    if (addedKeys.has(k)) {
      const i = added.findIndex((a) => cityKey(a) === k);
      if (i >= 0) added.splice(i, 1);
      addedKeys.delete(k);
    } else if (!removedKeys.has(k)) {
      removed.push(c);
      removedKeys.add(k);
    }
  }

  // For nights: latest value wins.
  const nightsByKey = new Map();
  for (const n of base.nightsChanged) nightsByKey.set(cityKey(n), n);
  for (const n of next.nightsChanged) {
    const k = cityKey(n);
    const prior = nightsByKey.get(k);
    nightsByKey.set(k, {
      id: n.id,
      name: n.name,
      from: prior ? prior.from : n.from,
      to: n.to,
    });
  }
  const nightsChanged = [...nightsByKey.values()].filter((n) => n.from !== n.to);

  const reordered = base.reordered || next.reordered;
  const hasChanges =
    added.length > 0 ||
    removed.length > 0 ||
    nightsChanged.length > 0 ||
    reordered;

  return { added, removed, nightsChanged, reordered, hasChanges };
}

/**
 * Render a diff as a compact, model-readable block. Returns empty string
 * when there's nothing to report, so callers can append unconditionally.
 *
 * Format is deliberately short and uses an explicit "(server)" tag so the
 * model can distinguish server-derived ground truth from its own prose.
 *
 * @param {ReturnType<typeof diffRoute>|null} diff
 * @returns {string}
 */
export function renderStateChangesBlock(diff) {
  if (!diff || !diff.hasChanges) return '';
  const lines = ['## Recent State Changes (server-derived; trust this over your own prose)'];

  if (diff.removed.length > 0) {
    const names = diff.removed.map((c) => c.name || c.id).join(', ');
    lines.push(`Cities removed this turn: ${names}`);
  }
  if (diff.added.length > 0) {
    const names = diff.added.map((c) => c.name || c.id).join(', ');
    lines.push(`Cities added this turn: ${names}`);
  }
  if (diff.nightsChanged.length > 0) {
    const parts = diff.nightsChanged.map((n) => {
      const label = n.name || n.id;
      const from = n.from ?? '?';
      const to = n.to ?? '?';
      return `${label} ${from}→${to}`;
    });
    lines.push(`Nights changed: ${parts.join(', ')}`);
  }
  if (diff.reordered) {
    lines.push('Route reordered this turn.');
  }
  lines.push(
    'If you previously claimed a removal that is not listed here, it did NOT happen — call remove_cities now.',
  );
  return lines.join('\n');
}
