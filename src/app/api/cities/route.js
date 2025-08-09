import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const country = searchParams.get('country');
    const limitParam = searchParams.get('limit');
    const limit = limitParam && limitParam !== 'all' ? parseInt(limitParam, 10) : null;

    // Fetch manifest from public assets (edge-safe) with no-store to avoid stale cache
    const manifestUrl = new URL('/data/manifest.json', request.url).toString();
    const resp = await fetch(manifestUrl, { cache: 'no-store' });
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
        'Cache-Control': 'no-store'
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