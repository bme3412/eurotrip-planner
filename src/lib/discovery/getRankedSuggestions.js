import { scoreCitiesV2 } from '@/lib/scoring/cityScoreV2';
import { normalizeRankedCandidate } from '@/lib/discovery/rankedCandidate';
import scoringConfig from '@/lib/scoring/v4/config/scoringConfig.json';
import {
  getPrecomputedMonthlyScores,
  getCachedSuggestions,
  setCachedSuggestions,
  buildCacheKey,
  isSingleMonthQuery,
} from '@/lib/cache/suggestions';

// Bump-on-config-change cache namespace: cached suggestions are keyed by the
// scoring config version, so regenerating scores or changing weights/thresholds
// invalidates stale cached rankings instead of serving them for up to an hour.
const V4_CACHE_VERSION = `v4-${scoringConfig.version}`;

// Flatten precomputed tier buckets into a single ranked list. Tiers are already
// ordered (tier1 best) and cities within a tier are score-sorted, so concatenating
// in tier order preserves the overall ranking.
function flattenPrecomputedTiers(tiers) {
  const ordered = ['tier1', 'tier2', 'tier3', 'tier4'];
  const out = [];
  for (const key of ordered) {
    if (tiers[key]?.cities?.length) out.push(...tiers[key].cities);
  }
  for (const [key, tier] of Object.entries(tiers)) {
    if (!ordered.includes(key) && tier?.cities?.length) out.push(...tier.cities);
  }
  return out;
}

/**
 * Compute ranked city suggestions for a date range.
 *
 * Framework-agnostic core shared by the /api/suggestions route (which wraps the
 * result in NextResponse) and React Server Components (which consume the data
 * directly, with no HTTP round-trip). All scoring, precomputed/Redis caching and
 * normalization live here so both callers stay in lockstep.
 *
 * @param {Object} args
 * @param {string} args.startDate - ISO date (YYYY-MM-DD)
 * @param {string} args.endDate - ISO date (YYYY-MM-DD)
 * @param {Object} [args.preferences] - { travelerType, budget, originCity }
 * @param {number} [args.limit=20]
 * @param {number} [args.version=2] - 2 (legacy) or 4 (current)
 * @param {boolean} [args.debug=false]
 * @param {boolean} [args.flat=false] - Flat item list vs. tiered object (V4)
 * @param {boolean} [args.useLLM=true]
 * @returns {Promise<{ ok: boolean, status: number, data?: object, error?: string, headers?: object }>}
 */
export async function getRankedSuggestions({
  startDate,
  endDate,
  preferences = {},
  limit = 20,
  version = 2,
  debug = false,
  flat = false,
  useLLM = true,
}) {
  if (!startDate || !endDate) {
    return { ok: false, status: 400, error: 'startDate and endDate are required' };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { ok: false, status: 400, error: 'Invalid date format. Use ISO dates (YYYY-MM-DD).' };
  }

  if (end <= start) {
    return { ok: false, status: 400, error: 'endDate must be after startDate' };
  }

  try {
    let results;
    let scoringVersion;

    if (version === 4) {
      // V4: Simplified 6-factor scoring with tiered results.
      // `flat` allows backwards-compatible flat-list responses.

      // Fast path for the /results page: a flat single-month query is served
      // straight from the precomputed monthly scores — no live scoring of ~222
      // cities and no per-request LLM (the prose is baked in at build time). This
      // takes the page from ~30s to instant on a cache miss. Falls through to live
      // scoring for multi-month ranges or when the precomputed file is missing.
      if (flat && !debug && isSingleMonthQuery(startDate, endDate)) {
        const precomputed = await getPrecomputedMonthlyScores(startDate, endDate);
        const flatCities = precomputed?.tiers ? flattenPrecomputedTiers(precomputed.tiers) : [];
        if (flatCities.length) {
          const items = flatCities.slice(0, limit).map((item, index) => ({
            ...item,
            rankedCandidate: normalizeRankedCandidate(item, { rank: index + 1, startDate, endDate }),
          }));
          return {
            ok: true,
            status: 200,
            data: {
              items,
              meta: {
                startDate,
                endDate,
                totalScored: items.length,
                scoringVersion: 'v4.1-precomputed-flat',
                cached: true,
                cacheSource: 'precomputed',
                month: precomputed.month,
              },
            },
            headers: {
              'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
              'Vary': 'Accept-Encoding',
              'X-Cache': 'HIT-PRECOMPUTED-FLAT',
            },
          };
        }
      }

      // Check for pre-computed monthly scores first (fastest path)
      if (!flat && !debug && isSingleMonthQuery(startDate, endDate)) {
        const precomputed = await getPrecomputedMonthlyScores(startDate, endDate);
        if (precomputed) {
          const totalScored = Object.values(precomputed.tiers).reduce(
            (sum, tier) => sum + (tier.cities?.length || 0),
            0
          );

          return {
            ok: true,
            status: 200,
            data: {
              tiers: precomputed.tiers,
              meta: {
                startDate,
                endDate,
                travelerType: preferences.travelerType,
                budget: preferences.budget,
                originCity: preferences.originCity,
                totalScored,
                scoringVersion: 'v4.1-precomputed',
                cached: true,
                cacheSource: 'precomputed',
                month: precomputed.month,
              },
            },
            headers: {
              'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
              'Vary': 'Accept-Encoding',
              'X-Cache': 'HIT-PRECOMPUTED',
            },
          };
        }
      }

      // Check Redis cache for custom queries. `flat` is part of the key because
      // the flat list and tiered object are different response shapes.
      const cacheKey = buildCacheKey({ startDate, endDate, ...preferences, version: V4_CACHE_VERSION, flat });
      const cachedResult = await getCachedSuggestions(cacheKey);
      if (cachedResult && !debug) {
        return {
          ok: true,
          status: 200,
          data: cachedResult.data,
          headers: {
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
            'Vary': 'Accept-Encoding',
            'X-Cache': 'HIT-REDIS',
          },
        };
      }

      // Fall back to live computation
      const tieredResults = await scoreWithV4(start, end, preferences, limit, debug, flat, useLLM);
      scoringVersion = 'v4.1';

      // If flat list requested, return in old format with CDN caching
      if (flat) {
        const items = tieredResults.map((item, index) => ({
          ...item,
          rankedCandidate: normalizeRankedCandidate(item, {
            rank: index + 1,
            startDate,
            endDate,
          }),
        }));
        const flatResponse = {
          items,
          meta: {
            startDate,
            endDate,
            travelerType: preferences.travelerType,
            budget: preferences.budget,
            originCity: preferences.originCity,
            totalScored: items.length,
            scoringVersion,
          },
        };
        // Cache the flat response under the flat-shaped key (async, don't wait).
        if (!debug) {
          setCachedSuggestions(cacheKey, flatResponse).catch(() => {});
        }
        return {
          ok: true,
          status: 200,
          data: flatResponse,
          headers: {
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
            'Vary': 'Accept-Encoding',
          },
        };
      }

      // Extract meta info and remove from response
      const llmUsed = tieredResults._meta?.llmUsed || false;
      delete tieredResults._meta;

      const totalScored = Object.values(tieredResults).reduce(
        (sum, tier) => sum + (tier.cities?.length || 0),
        0
      );

      const responseData = {
        tiers: tieredResults,
        meta: {
          startDate,
          endDate,
          travelerType: preferences.travelerType,
          budget: preferences.budget,
          originCity: preferences.originCity,
          totalScored,
          scoringVersion,
          llmDescriptions: llmUsed,
        },
      };

      // Cache the result in Redis for future requests (async, don't wait)
      if (!debug) {
        setCachedSuggestions(cacheKey, responseData).catch(() => {});
      }

      return {
        ok: true,
        status: 200,
        data: responseData,
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
          'Vary': 'Accept-Encoding',
          'X-Cache': 'MISS',
        },
      };
    } else {
      // V2: Weighted multi-factor scoring with enrichment (default)
      results = await scoreCitiesV2({
        startDate: start,
        endDate: end,
        travelerType: preferences.travelerType,
        preferences: {
          budget: preferences.budget,
        },
        limit,
        includeEnrichment: true,
      });
      scoringVersion = 'v2';
    }

    // Return in the shape the homepage ResultsGrid / ResultCard expects.
    const items = results.map((item, index) => ({
      ...item,
      rankedCandidate: normalizeRankedCandidate(item, {
        rank: index + 1,
        startDate,
        endDate,
      }),
    }));

    return {
      ok: true,
      status: 200,
      data: {
        items,
        meta: {
          startDate,
          endDate,
          travelerType: preferences.travelerType,
          budget: preferences.budget,
          totalScored: items.length,
          scoringVersion,
        },
      },
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        'Vary': 'Accept-Encoding',
      },
    };
  } catch (error) {
    console.error('getRankedSuggestions error:', error);
    return { ok: false, status: 500, error: 'Failed to generate suggestions' };
  }
}

/**
 * Load city manifest.
 */
async function loadManifest() {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const manifestPath = path.join(process.cwd(), 'public/data/manifest.json');
    const data = await fs.readFile(manifestPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to load manifest:', error);
    return { cities: {} };
  }
}

/**
 * Score cities using the V4 simplified 6-factor system.
 * Returns tiered results (or a flat list when flatList is true).
 */
async function scoreWithV4(startDate, endDate, preferences, limit, debug, flatList = false, useLLM = true) {
  const { getFactorClasses } = await import('@/lib/scoring/v4/factors/index.js');

  const engine = new (await import('@/lib/scoring/v4/core/ScoreEngine.js')).ScoreEngine(
    null,
    getFactorClasses()
  );

  const manifest = await loadManifest();
  const cityIds = Object.keys(manifest.cities || {});

  // Pre-load all city data in parallel (avoids sequential await in ScoreEngine loop)
  const cityDataMap = new Map();
  await Promise.all(
    cityIds.map(id =>
      loadFullCityData(manifest, id)
        .then(data => { if (data) cityDataMap.set(id, data); })
        .catch(() => {})
    )
  );

  return engine.scoreCitiesForAPI({
    cityIds: [...cityDataMap.keys()],
    startDate,
    endDate,
    originCity: preferences.originCity,
    getCityData: (cityId) => Promise.resolve(cityDataMap.get(cityId)),
    limit,
    includeDebug: debug,
    flatList,
    useLLM,
  });
}

/**
 * Load full city data from index.json file.
 */
async function loadFullCityData(manifest, cityId) {
  const cityInfo = manifest.cities?.[cityId];
  if (!cityInfo) return null;

  try {
    const fs = await import('fs/promises');
    const path = await import('path');

    const cityPath = path.join(
      process.cwd(),
      'public/data',
      cityInfo.country,
      cityInfo.directoryName,
      'index.json'
    );

    const data = await fs.readFile(cityPath, 'utf-8');
    const cityData = JSON.parse(data);

    return {
      ...cityData,
      cityId,
      city: cityId,
    };
  } catch (error) {
    console.warn(`Failed to load city data for ${cityId}:`, error.message);
    return null;
  }
}
