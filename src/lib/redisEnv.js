/**
 * Resolve Upstash Redis REST credentials from the environment.
 *
 * Accepts both naming conventions: the canonical UPSTASH_REDIS_REST_* names and
 * the KV_REST_API_* names that Vercel's Upstash Marketplace integration injects
 * automatically. (The integration also sets REDIS_URL/KV_URL — TCP connection
 * strings — which the @upstash/redis REST client does not use.)
 *
 * Returns null for either field when unset so callers can gate on presence.
 */
export function getRedisRestConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || null;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || null;
  return { url, token };
}

/** True when both a REST URL and token are configured (under either naming). */
export function hasRedisRestConfig() {
  const { url, token } = getRedisRestConfig();
  return Boolean(url && token);
}
