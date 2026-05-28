/**
 * Live-overlay data layer.
 *
 * Static city JSON lives under `/data/.../sections/*.json` and is built at
 * deploy time. Live data (weather, events, prices) sits *on top* via the
 * route handlers under `/api/cities/[slug]/live/*`. This helper is the
 * single entry point components and server components use to fetch a live
 * channel.
 *
 * Each channel returns a uniform envelope:
 *
 *   {
 *     source:     string,         // identifier of the upstream provider
 *     fetchedAt:  ISO-8601 string, // when the upstream was last hit
 *     ttl:        number,          // seconds the cached value lives for
 *     data:       T | null,        // payload, or null on first failure
 *     stale?:     boolean,         // true when serving a cached fallback
 *     unavailable?: boolean,       // true when no data is reachable
 *   }
 *
 * UI components are expected to render "Live · updated X ago" using
 * fetchedAt, and to fall back to the static monthly climatology when
 * `unavailable === true`.
 */

export type LiveChannel = 'weather' | 'events' | 'prices';

export type LiveEnvelope<T = unknown> = {
  source: string;
  fetchedAt: string;
  ttl: number;
  data: T | null;
  stale?: boolean;
  unavailable?: boolean;
  error?: string;
};

export type LiveOpts = {
  /** Override the default fetch cache mode. Defaults to 'force-cache'. */
  cache?: RequestCache;
  /** Forward an AbortSignal for client-side cancellation. */
  signal?: AbortSignal;
  /**
   * Absolute origin to prefix the API path with. Required on the server
   * because relative URLs cannot be passed to global fetch. On the client
   * pass undefined and the browser uses the current origin automatically.
   */
  origin?: string;
};

function buildUrl(citySlug: string, channel: LiveChannel, origin?: string): string {
  // Mirrors the file-system segment `src/app/api/cities/[city]/live/...`.
  const path = `/api/cities/${encodeURIComponent(citySlug)}/live/${channel}`;
  if (origin) return new URL(path, origin).toString();
  return path;
}

/**
 * Fetch a live channel for a city. Never throws — upstream failures surface
 * as `{ unavailable: true }` so callers can fall back to static climatology
 * without try/catch boilerplate.
 */
export async function getCityLive<T = unknown>(
  citySlug: string,
  channel: LiveChannel,
  opts: LiveOpts = {}
): Promise<LiveEnvelope<T>> {
  const url = buildUrl(citySlug, channel, opts.origin);
  try {
    const res = await fetch(url, { cache: opts.cache ?? 'force-cache', signal: opts.signal });
    if (!res.ok) {
      return {
        source: 'unknown',
        fetchedAt: new Date().toISOString(),
        ttl: 0,
        data: null,
        unavailable: true,
        error: `HTTP ${res.status}`,
      };
    }
    return (await res.json()) as LiveEnvelope<T>;
  } catch (err) {
    return {
      source: 'unknown',
      fetchedAt: new Date().toISOString(),
      ttl: 0,
      data: null,
      unavailable: true,
      error: (err as Error).message,
    };
  }
}
