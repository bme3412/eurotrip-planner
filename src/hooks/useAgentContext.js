'use client';

import { useMemo } from 'react';
import { usePathname, useParams } from 'next/navigation';

/**
 * Derive agent context from current route
 *
 * Returns context object based on the current page:
 * - { page: 'city-guide', citySlug: 'paris' }
 * - { page: 'explore' }
 * - { page: 'itinerary', tripId: 'abc123' }
 * - { page: 'home' }
 * - { page: 'discover' }
 * - { page: 'city-guides-index' }
 */
export function useAgentContext() {
  const pathname = usePathname();
  const params = useParams();

  const context = useMemo(() => {
    // City guide pages: /city-guides/[city]
    if (pathname.startsWith('/city-guides/') && params?.city) {
      return {
        page: 'city-guide',
        citySlug: params.city,
      };
    }

    // City guides index
    if (pathname === '/city-guides') {
      return {
        page: 'city-guides-index',
      };
    }

    // Explore page
    if (pathname === '/explore' || pathname.startsWith('/explore/')) {
      return {
        page: 'explore',
      };
    }

    // Itinerary pages: /itineraries/[tripId]
    if (pathname.startsWith('/itineraries/') && params?.tripId) {
      return {
        page: 'itinerary',
        tripId: params.tripId,
      };
    }

    // Homepage
    if (pathname === '/') {
      return {
        page: 'home',
      };
    }

    // Default fallback
    return {
      page: 'other',
      pathname,
    };
  }, [pathname, params]);

  return context;
}
