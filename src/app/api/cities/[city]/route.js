import { NextResponse } from 'next/server';
import { getCityData } from '../../../../lib/data-utils.js';
import { enrichAttractionsForCity } from '../../../../lib/google-places/enrichment.js';

export const runtime = 'nodejs';
// City data changes rarely; let Next ISR cache the response for 1h.
export const revalidate = 3600;

const enrichCache = new Map();
const ENRICH_TTL = 24 * 60 * 60 * 1000;

export async function GET(request, { params }) {
  try {
    const { city } = await params;
    
    if (!city) {
      return NextResponse.json(
        { error: 'City parameter is required' },
        { status: 400 }
      );
    }

    const cityData = await getCityData(city);
    
    if (!cityData) {
      return NextResponse.json(
        { error: 'City not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const shouldEnrich = searchParams.get('enrich') === 'true';

    // data-utils returns attractions as a flat array; handle both shapes
    const attractionSites = Array.isArray(cityData.attractions)
      ? cityData.attractions
      : cityData.attractions?.sites;

    if (shouldEnrich && attractionSites?.length) {
      const cacheKey = `enrich:${city}`;
      const cached = enrichCache.get(cacheKey);

      if (cached && Date.now() < cached.expiresAt) {
        cityData.attractions = { sites: cached.data };
      } else {
        try {
          const enriched = await enrichAttractionsForCity(attractionSites, city);
          cityData.attractions = { sites: enriched };
          enrichCache.set(cacheKey, { data: enriched, expiresAt: Date.now() + ENRICH_TTL });
        } catch (err) {
          console.error(`[enrich] Failed for ${city}:`, err.message);
        }
      }
    }

    return NextResponse.json(cityData, {
      headers: {
        // CDN cache 1 hour, serve stale up to 24h while revalidating.
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        'Vary': 'Accept-Encoding',
      },
    });
  } catch (error) {
    console.error('Error fetching city data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
