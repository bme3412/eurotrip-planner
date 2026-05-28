/**
 * Compute the "iconic" attraction names shown on first load.
 *
 * Score = (cultural_significance × 2) + typeScore + small ordering tiebreaker.
 * Returns a Set<string> of the top-N names (default 12), suitable for fast
 * lookup in marker visibility checks.
 */
const TYPE_PRIORITY = new Map([
  ['Monument', 8],
  ['Landmark', 8],
  ['Cathedral', 7],
  ['Basilica', 7],
  ['Museum', 6],
  ['Chapel', 6],
  ['Historic District', 5],
  ['District', 4],
]);

export function computeIconicAttractionNames(attractions, limit = 12) {
  if (!Array.isArray(attractions) || attractions.length === 0) return new Set();

  const scored = attractions
    .map((site, index) => {
      const cultural = Number(site?.ratings?.cultural_significance ?? 0);
      const type = String(site?.type || site?.category || 'Other');
      const typeScore = TYPE_PRIORITY.get(type) ?? 0;
      // Slight bonus for earlier items for deterministic ties.
      const totalScore = cultural * 2 + typeScore + Math.max(0, 5 - (index % 5));
      return { name: site?.name, score: totalScore };
    })
    .filter((it) => it.name);

  scored.sort((a, b) => b.score - a.score);
  return new Set(scored.slice(0, limit).map((it) => it.name));
}
