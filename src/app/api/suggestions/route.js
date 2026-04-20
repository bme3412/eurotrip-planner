import { NextResponse } from 'next/server';
import { scoreCitiesV2 } from '@/lib/scoring/cityScoreV2';
import {
  getPrecomputedMonthlyScores,
  getCachedSuggestions,
  setCachedSuggestions,
  buildCacheKey,
  isSingleMonthQuery,
} from '@/lib/cache/suggestions';

export const runtime = 'nodejs';

/**
 * GET /api/suggestions?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&limit=20
 * POST /api/suggestions  { dates: { start, end }, interests?, weights? }
 *
 * Query params:
 * - v=2|4: Scoring version (default: 2)
 * - v2=true: Legacy flag for V2 scoring
 * - travelerType: couples, families, solo, budget, luxury, culture, foodie, adventure
 * - budget: budget, moderate, luxury (for pricing preference)
 * - originCity: For ease-of-travel scoring (V4)
 * - debug=true: Include debug breakdown (V4 only)
 *
 * V4: Simplified 6-factor scoring (culture, beach, timing, crowds, value, logistics)
 * Returns scored city suggestions based on visit calendar data.
 */

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const travelerType = searchParams.get('travelerType');
  const budget = searchParams.get('budget');
  const originCity = searchParams.get('originCity');
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const debug = searchParams.get('debug') === 'true';
  const flat = searchParams.get('flat') === 'true'; // For backwards compat
  const useLLM = searchParams.get('llm') !== 'false'; // Enable LLM by default, disable with llm=false

  // Determine scoring version
  const vParam = searchParams.get('v');
  let version = 2; // Default to V2
  if (vParam === '4') version = 4;

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: 'startDate and endDate are required' },
      { status: 400 }
    );
  }

  return scoreAndRespond(
    startDate,
    endDate,
    { travelerType, budget, originCity },
    limit,
    version,
    debug,
    flat,
    useLLM
  );
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { dates, travelerType, budget, originCity, v, debug, flat, llm } = body;

    if (!dates?.start || !dates?.end) {
      return NextResponse.json(
        { error: 'dates.start and dates.end are required' },
        { status: 400 }
      );
    }

    // Determine version: only 2 (default) or 4 are supported
    const vNum = typeof v === 'string' ? parseInt(v, 10) : v;
    const version = vNum === 4 ? 4 : 2;

    // LLM is enabled by default for V4
    const useLLM = llm !== false;

    return scoreAndRespond(
      dates.start,
      dates.end,
      { travelerType, budget, originCity },
      body.limit || 20,
      version,
      debug,
      flat || false,
      useLLM
    );
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}

async function scoreAndRespond(startDate, endDate, preferences, limit, version = 2, debug = false, flat = false, useLLM = true) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return NextResponse.json(
      { error: 'Invalid date format. Use ISO dates (YYYY-MM-DD).' },
      { status: 400 }
    );
  }

  if (end <= start) {
    return NextResponse.json(
      { error: 'endDate must be after startDate' },
      { status: 400 }
    );
  }

  try {
    let results;
    let scoringVersion;

    if (version === 4) {
      // V4: Simplified 6-factor scoring with tiered results
      // `flat` parameter allows backwards compatibility with flat list response

      // Check for pre-computed monthly scores first (fastest path)
      if (!flat && !debug && isSingleMonthQuery(startDate, endDate)) {
        const precomputed = await getPrecomputedMonthlyScores(startDate, endDate);
        if (precomputed) {
          // Calculate total cities across all tiers
          const totalScored = Object.values(precomputed.tiers).reduce(
            (sum, tier) => sum + (tier.cities?.length || 0),
            0
          );

          return NextResponse.json({
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
          }, {
            headers: {
              'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
              'Vary': 'Accept-Encoding',
              'X-Cache': 'HIT-PRECOMPUTED',
            }
          });
        }
      }

      // Check Redis cache for custom queries
      const cacheKey = buildCacheKey({ startDate, endDate, ...preferences, version: 'v4' });
      const cachedResult = await getCachedSuggestions(cacheKey);
      if (cachedResult && !debug) {
        return NextResponse.json(cachedResult.data, {
          headers: {
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
            'Vary': 'Accept-Encoding',
            'X-Cache': 'HIT-REDIS',
          }
        });
      }

      // Fall back to live computation
      const tieredResults = await scoreWithV4(
        start,
        end,
        preferences,
        limit,
        debug,
        flat,
        useLLM
      );
      scoringVersion = 'v4.1';

      // If flat list requested, return in old format with CDN caching
      if (flat) {
        return NextResponse.json({
          items: tieredResults,
          meta: {
            startDate,
            endDate,
            travelerType: preferences.travelerType,
            budget: preferences.budget,
            originCity: preferences.originCity,
            totalScored: tieredResults.length,
            scoringVersion,
          },
        }, {
          headers: {
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
            'Vary': 'Accept-Encoding'
          }
        });
      }

      // Extract meta info and remove from response
      const llmUsed = tieredResults._meta?.llmUsed || false;
      delete tieredResults._meta;

      // Calculate total cities across all tiers
      const totalScored = Object.values(tieredResults).reduce(
        (sum, tier) => sum + (tier.cities?.length || 0),
        0
      );

      // Build the response
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

      // Return V4 tiered response with CDN caching
      return NextResponse.json(responseData, {
        headers: {
          // CDN cache for 1 hour, serve stale while revalidating for up to 24 hours
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
          'Vary': 'Accept-Encoding',
          'X-Cache': 'MISS',
        }
      });
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

    // Return in the shape the homepage ResultsGrid / ResultCard expects with CDN caching
    return NextResponse.json({
      items: results,
      meta: {
        startDate,
        endDate,
        travelerType: preferences.travelerType,
        budget: preferences.budget,
        totalScored: results.length,
        scoringVersion,
      },
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        'Vary': 'Accept-Encoding'
      }
    });
  } catch (error) {
    console.error('Suggestions API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    );
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
 * Score cities using V4 simplified 6-factor system.
 * Returns tiered results with contextual labels.
 *
 * @param {Date} startDate - Trip start date
 * @param {Date} endDate - Trip end date
 * @param {Object} preferences - User preferences
 * @param {number} limit - Max cities to return
 * @param {boolean} debug - Include debug info
 * @param {boolean} flatList - Return flat list instead of tiers (backwards compat)
 * @param {boolean} useLLM - Use LLM for generating descriptions
 * @returns {Object} - Tiered results or flat list
 */
async function scoreWithV4(startDate, endDate, preferences, limit, debug, flatList = false, useLLM = true) {
  // Dynamically import V4 scoring
  const { getFactorClasses } = await import('@/lib/scoring/v4/factors/index.js');

  // Create engine with all factors
  const engine = new (await import('@/lib/scoring/v4/core/ScoreEngine.js')).ScoreEngine(
    null,
    getFactorClasses()
  );

  // Get city IDs from manifest
  const manifest = await loadManifest();
  const cityIds = Object.keys(manifest.cities || {});

  // Score all cities with full data loading
  const results = await engine.scoreCitiesForAPI({
    cityIds,
    startDate,
    endDate,
    originCity: preferences.originCity,
    getCityData: async (cityId) => {
      return loadFullCityData(manifest, cityId);
    },
    limit,
    includeDebug: debug,
    flatList,
    useLLM,
  });

  return results;
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
