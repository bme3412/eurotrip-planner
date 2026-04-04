import { NextResponse } from 'next/server';
import { getPlacePhotoUrl, getPlaceDetails } from '../../../lib/google-places/index.js';

export const runtime = 'nodejs';

/**
 * Proxy for Google Place Photos — keeps API key server-side.
 * GET /api/google-photos?name=places/ChIJ.../photos/AUac...&w=800&h=600
 * GET /api/google-photos?placeId=ChIJ...&w=600    (resolves first photo automatically)
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  let photoName = searchParams.get('name');
  const placeId = searchParams.get('placeId');
  const width = parseInt(searchParams.get('w') || '800', 10);
  const height = searchParams.get('h') ? parseInt(searchParams.get('h'), 10) : undefined;

  if (!photoName && placeId) {
    try {
      const details = await getPlaceDetails(placeId, 'photos');
      photoName = details?.photos?.[0]?.name;
    } catch (err) {
      console.error('[google-photos] placeId resolution failed:', err.message);
    }
  }

  if (!photoName) {
    return NextResponse.json({ error: 'No photo available' }, { status: 404 });
  }

  try {
    const photoUrl = await getPlacePhotoUrl(photoName, width, height);
    // Add cache headers - browser cache 24h, CDN cache 7d
    return new Response(null, {
      status: 302,
      headers: {
        'Location': photoUrl,
        'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
      },
    });
  } catch (err) {
    console.error('[google-photos]', err.message);
    return NextResponse.json({ error: 'Photo fetch failed' }, { status: 502 });
  }
}
