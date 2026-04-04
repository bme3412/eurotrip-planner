import { NextResponse } from 'next/server';

export const runtime = 'edge';

// Revalidate manifest every hour (ISR-style for edge)
export const revalidate = 3600;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const country = searchParams.get('country');
    const limitParam = searchParams.get('limit');
    const limit = limitParam && limitParam !== 'all' ? parseInt(limitParam, 10) : null;

    // Fetch manifest from public assets (edge-safe) with force-cache for CDN caching
    const manifestUrl = new URL('/data/manifest.json', request.url).toString();
    const resp = await fetch(manifestUrl, { cache: 'force-cache' });
    if (!resp.ok) {
      throw new Error(`Failed to fetch manifest: ${resp.status}`);
    }
    const manifest = await resp.json();

    const entries = Object.entries(manifest.cities || {});

    let list = entries.map(([slug, meta]) => ({
      id: slug,
      name: slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      country: meta.country,
      directoryName: meta.directoryName
    }));

    if (country) {
      list = list.filter(c => c.country.toLowerCase() === country.toLowerCase());
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q));
    }

    if (Number.isFinite(limit) && limit > 0) {
      list = list.slice(0, limit);
    }

    return NextResponse.json({
      success: true,
      data: list,
      count: list.length,
      timestamp: new Date().toISOString()
    }, {
      headers: {
        // CDN cache for 1 hour, serve stale while revalidating for up to 24 hours
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        'Vary': 'Accept-Encoding'
      }
    });
  } catch (error) {
    console.error('Error in cities API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch cities',
        message: error.message 
      },
      { status: 500 }
    );
  }
} 