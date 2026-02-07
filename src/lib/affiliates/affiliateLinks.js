/**
 * Affiliate link management for EuroTrip Planner.
 *
 * Wraps booking URLs with affiliate tracking parameters.
 * If no affiliate ID is configured, returns the original URL unchanged.
 */

const AFFILIATE_CONFIG = {
  getyourguide: {
    partnerId: typeof window !== 'undefined'
      ? (process.env.NEXT_PUBLIC_GYG_PARTNER_ID || null)
      : (process.env.NEXT_PUBLIC_GYG_PARTNER_ID || null),
    buildUrl: (url, partnerId) => {
      if (!partnerId || !url) return url;
      try {
        const u = new URL(url);
        u.searchParams.set('partner_id', partnerId);
        u.searchParams.set('utm_medium', 'online_partner');
        u.searchParams.set('utm_source', 'eurotrip_planner');
        return u.toString();
      } catch { return url; }
    },
  },
  viator: {
    partnerId: process.env.NEXT_PUBLIC_VIATOR_PARTNER_ID || null,
    buildUrl: (url, partnerId) => {
      if (!partnerId || !url) return url;
      try {
        const u = new URL(url);
        u.searchParams.set('pid', partnerId);
        u.searchParams.set('mcid', '42383');
        u.searchParams.set('medium', 'link');
        return u.toString();
      } catch { return url; }
    },
  },
  bookingcom: {
    aid: process.env.NEXT_PUBLIC_BOOKING_AID || null,
    buildUrl: (url, aid) => {
      if (!aid || !url) return url;
      try {
        const u = new URL(url);
        u.searchParams.set('aid', aid);
        return u.toString();
      } catch { return url; }
    },
  },
};

/**
 * Detect the provider from a URL and apply affiliate parameters.
 */
export function affiliateUrl(url) {
  if (!url) return url;
  try {
    const hostname = new URL(url).hostname.toLowerCase();

    if (hostname.includes('getyourguide')) {
      return AFFILIATE_CONFIG.getyourguide.buildUrl(url, AFFILIATE_CONFIG.getyourguide.partnerId);
    }
    if (hostname.includes('viator')) {
      return AFFILIATE_CONFIG.viator.buildUrl(url, AFFILIATE_CONFIG.viator.partnerId);
    }
    if (hostname.includes('booking.com')) {
      return AFFILIATE_CONFIG.bookingcom.buildUrl(url, AFFILIATE_CONFIG.bookingcom.aid);
    }
    return url;
  } catch {
    return url;
  }
}

/**
 * Generate a search URL on a booking platform for a city.
 */
export function searchUrl(platform, { city, country }) {
  const q = encodeURIComponent(`${city} ${country}`);
  const pid = AFFILIATE_CONFIG.getyourguide.partnerId;

  switch (platform) {
    case 'getyourguide': {
      const base = `https://www.getyourguide.com/s/?q=${q}`;
      return pid ? `${base}&partner_id=${pid}&utm_source=eurotrip_planner` : base;
    }
    case 'viator':
      return `https://www.viator.com/searchResults/all?text=${encodeURIComponent(city)}`;
    case 'bookingcom': {
      const aid = AFFILIATE_CONFIG.bookingcom.aid;
      const base = `https://www.booking.com/searchresults.html?ss=${q}`;
      return aid ? `${base}&aid=${aid}` : base;
    }
    default:
      return null;
  }
}

/**
 * Track an affiliate link click via Vercel Analytics.
 */
export function trackAffiliateClick({ provider, city, activityName, url }) {
  if (typeof window !== 'undefined' && window.va) {
    window.va('event', {
      name: 'affiliate_click',
      provider,
      city,
      activity: activityName,
    });
  }
  if (process.env.NODE_ENV === 'development') {
    console.log('[Affiliate Click]', { provider, city, activityName, url });
  }
}
