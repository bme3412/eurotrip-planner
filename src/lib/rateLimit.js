/**
 * Lightweight rate limiting for expensive anonymous API routes.
 * Uses Upstash Redis when configured; falls back to a per-instance memory map
 * (weaker on serverless, but blocks obvious burst abuse in dev).
 *
 * Signed-in callers (Bearer token present) are not limited here — trip APIs
 * already enforce ownership separately.
 */

import { Redis } from '@upstash/redis';

let redis = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

/** @type {Map<string, { count: number, resetAt: number }>} */
const memoryBuckets = new Map();

export function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

function hasBearerAuth(request) {
  const header = request.headers.get('authorization') || '';
  return /^Bearer\s+\S+/i.test(header);
}

async function consumeToken(key, limit, windowSec) {
  if (redis) {
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, windowSec);
    const ttl = await redis.ttl(key);
    return {
      allowed: count <= limit,
      retryAfter: ttl > 0 ? ttl : windowSec,
      remaining: Math.max(0, limit - count),
    };
  }

  const now = Date.now();
  let entry = memoryBuckets.get(key);
  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + windowSec * 1000 };
    memoryBuckets.set(key, entry);
  }
  entry.count += 1;
  return {
    allowed: entry.count <= limit,
    retryAfter: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    remaining: Math.max(0, limit - entry.count),
  };
}

/**
 * Rate-limit anonymous callers. Returns a 429 Response/NextResponse, or null if OK.
 *
 * @param {Request} request
 * @param {{ route: string, limit?: number, windowSec?: number }} options
 * @returns {Promise<Response|null>}
 */
export async function enforceAnonymousRateLimit(request, { route, limit = 30, windowSec = 3600 }) {
  if (hasBearerAuth(request)) return null;

  const ip = getClientIp(request);
  const key = `rl:${route}:${ip}`;
  const { allowed, retryAfter, remaining } = await consumeToken(key, limit, windowSec);

  if (!allowed) {
    return Response.json(
      { error: 'Too many requests. Sign in for higher limits, or try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  void remaining;
  return null;
}

/** Preset limits for expensive routes. */
export const RATE_LIMITS = {
  conversation: { limit: 24, windowSec: 3600 },
  tripsGenerate: { limit: 8, windowSec: 3600 },
  discoverCommand: { limit: 60, windowSec: 3600 },
};
