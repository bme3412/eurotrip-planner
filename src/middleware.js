import { NextResponse } from 'next/server';

/**
 * Adds baseline security headers to every response.
 * Keeps CSP intentionally permissive for inline styles and the third-party
 * services already used (Mapbox, Google, Supabase, Unsplash, CloudFront, Vercel).
 * Tighten CSP further once nonce-based scripts are wired up.
 */
export function middleware(request) {
  const response = NextResponse.next();

  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(self), interest-cohort=()'
  );
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  );

  return response;
}

export const config = {
  matcher: [
    // Run on every request except static assets, image optimizer, and data files
    '/((?!_next/static|_next/image|favicon.ico|images/|videos/|data/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|mp4|webm)$).*)',
  ],
};
