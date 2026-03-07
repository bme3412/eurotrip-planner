import { NextResponse } from 'next/server';
import { scoreCitiesForDates } from '@/lib/scoring/cityScorer';
import { scoreCitiesV2 } from '@/lib/scoring/cityScoreV2';
import { scoreCities as scoreCitiesV3, toV2Format } from '@/lib/scoring/v3/index.js';

export const runtime = 'nodejs';

/**
 * GET /api/suggestions?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&limit=20
 * POST /api/suggestions  { dates: { start, end }, interests?, weights? }
 *
 * Query params:
 * - v=1|2|3|4: Scoring version (default: 2)
 * - v2=true: Legacy flag for V2 scoring
 * - travelerType: couples, families, solo, budget, luxury, culture, foodie, adventure
 * - budget: budget, moderate, luxury (for pricing preference)
 * - originCity: For ease-of-travel scoring (V3/V4)
 * - debug=true: Include debug breakdown (V3/V4 only)
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

  // Determine scoring version
  const vParam = searchParams.get('v');
  const useV2Legacy = searchParams.get('v2') === 'true';
  let version = 2; // Default to V2
  if (vParam === '1') version = 1;
  else if (vParam === '2') version = 2;
  else if (vParam === '3') version = 3;
  else if (vParam === '4') version = 4;
  else if (useV2Legacy) version = 2;

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
    debug
  );
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { dates, travelerType, budget, originCity, v, v2, debug } = body;

    if (!dates?.start || !dates?.end) {
      return NextResponse.json(
        { error: 'dates.start and dates.end are required' },
        { status: 400 }
      );
    }

    // Determine version
    let version = v || (v2 ? 2 : 2);
    if (typeof version === 'string') version = parseInt(version, 10);

    return scoreAndRespond(
      dates.start,
      dates.end,
      { travelerType, budget, originCity },
      body.limit || 20,
      version,
      debug
    );
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}

async function scoreAndRespond(startDate, endDate, preferences, limit, version = 2, debug = false) {
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
      // V4: Simplified 6-factor scoring with ResultCard compatibility
      results = await scoreWithV4(
        start,
        end,
        preferences,
        limit,
        debug
      );
      scoringVersion = 'v4';

      // Return V4 response (ResultCard compatible with v4 additions)
      return NextResponse.json({
        items: results,
        meta: {
          startDate,
          endDate,
          travelerType: preferences.travelerType,
          budget: preferences.budget,
          originCity: preferences.originCity,
          totalScored: results.length,
          scoringVersion,
        },
      });
    } else if (version === 3) {
      // V3: New unified scoring with transparency
      const v3Results = await scoreWithV3(
        start,
        end,
        preferences,
        limit,
        debug
      );
      results = v3Results.items;
      scoringVersion = 'v3';

      // Return enhanced response for V3
      return NextResponse.json({
        items: results,
        meta: {
          startDate,
          endDate,
          travelerType: preferences.travelerType,
          budget: preferences.budget,
          originCity: preferences.originCity,
          totalScored: results.length,
          scoringVersion,
        },
      });
    } else if (version === 2) {
      // V2: Weighted multi-factor scoring with enrichment
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
    } else {
      // V1: Legacy scoring (simple +0.2/+0.3 boosts)
      results = await scoreCitiesForDates({
        startDate: start,
        endDate: end,
        travelerType: preferences.travelerType,
        limit,
      });
      scoringVersion = 'v1';
    }

    // Return in the shape the homepage ResultsGrid / ResultCard expects
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
 * Score cities using V3 unified scoring system.
 */
async function scoreWithV3(startDate, endDate, preferences, limit, debug) {
  // Get city IDs from manifest
  const manifest = await loadManifest();
  const cityIds = Object.keys(manifest.cities || {});

  // Build traveler profile
  const travelerProfile = {
    type: preferences.travelerType || 'everyone',
    budget: preferences.budget || 'medium',
  };

  // Score all cities
  const results = await scoreCitiesV3({
    cityIds,
    startDate,
    endDate,
    travelerProfile,
    originCity: preferences.originCity,
    getCityData: (cityId) => getCityDataFromManifest(manifest, cityId),
    options: {
      includeDebug: debug,
    },
  });

  // Transform to API response format
  const items = results.slice(0, limit).map((result, index) => ({
    id: result.cityId,
    cityId: result.cityId,
    score: result.finalScore,
    confidence: result.confidence,
    rank: index + 1,

    // Transparency: Full breakdown
    breakdown: result.breakdown,

    // Human-readable summary
    why: result.summary?.why || '',
    highlights: result.summary?.highlights || [],
    warnings: result.summary?.warnings || [],

    // Legacy compatibility (0-5 scale)
    legacyScore: Math.round((result.finalScore / 100) * 5 * 10) / 10,

    // Debug info if requested
    ...(debug && result.debug ? { debug: result.debug } : {}),
  }));

  return { items };
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
 * Get city data from manifest.
 */
function getCityDataFromManifest(manifest, cityId) {
  const cityInfo = manifest.cities?.[cityId];
  if (!cityInfo) return null;

  return {
    cityId,
    country: cityInfo.country,
    directoryName: cityInfo.directoryName,
    // The full city data would need to be loaded from the city's index.json
    // For now, return basic info from manifest
  };
}

/**
 * Score cities using V4 simplified 6-factor system.
 */
async function scoreWithV4(startDate, endDate, preferences, limit, debug) {
  // Dynamically import V4 scoring
  const { createV4Engine } = await import('@/lib/scoring/v4/core/ScoreEngine.js');
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
