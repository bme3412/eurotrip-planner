'use client';

/**
 * Tab <-> URL helpers for the city guide.
 *
 * The active tab is reflected in the query string (`?tab=food`) so a guide
 * tab can be bookmarked, shared, and restored on refresh. We deliberately
 * use `window.history.replaceState` (the same approach as
 * planner-v2/threeColumn/useTripIdUrlSync.js) instead of `useSearchParams`:
 * the city-guide route is a statically-generated server component with no
 * Suspense boundary around the client tree, and pulling in `useSearchParams`
 * would force a CSR bailout / build error. `replaceState` needs neither a
 * router nor a Suspense boundary and never triggers a navigation or scroll.
 *
 * All reads are SSR-guarded and only ever run from `useState` initializers,
 * effects, or event handlers — never during the server render path.
 */

/** Canonical tab ids, in display order. Single source of truth shared with
 *  CityPageClient's `tabs` array (which adds labels + icons). */
export const VALID_TABS = [
  'overview',
  'when',
  'attractions',
  'food',
  'photos',
  'neighborhoods',
];

const isValidTab = (id) => VALID_TABS.includes(id);

/**
 * Resolve the initial tab from the current URL (`?tab=` first, then `#hash`),
 * falling back to `defaultTab` when absent or unrecognised.
 */
export function readTabFromUrl(defaultTab = 'overview') {
  if (typeof window === 'undefined') return defaultTab;
  try {
    const url = new URL(window.location.href);
    const fromQuery = url.searchParams.get('tab');
    if (fromQuery && isValidTab(fromQuery)) return fromQuery;
    const fromHash = (window.location.hash || '').replace(/^#/, '');
    if (fromHash && isValidTab(fromHash)) return fromHash;
  } catch {
    /* malformed URL — fall through to default */
  }
  return defaultTab;
}

/**
 * Reflect `tabId` into the URL without navigating. The default tab is written
 * as a clean URL (no `?tab`) so the canonical / SEO URL is preserved. Uses
 * `replaceState` so tab switches don't pollute the back button.
 */
export function writeTabToUrl(tabId, defaultTab = 'overview') {
  if (typeof window === 'undefined' || !isValidTab(tabId)) return;
  try {
    const url = new URL(window.location.href);
    if (tabId === defaultTab) {
      url.searchParams.delete('tab');
    } else {
      url.searchParams.set('tab', tabId);
    }
    const search = url.searchParams.toString();
    window.history.replaceState({}, '', `${url.pathname}${search ? `?${search}` : ''}`);
  } catch {
    /* replaceState unavailable — non-critical, ignore */
  }
}
