/**
 * Lightweight rate limiting for expensive API routes (LLM calls, generation).
 * Uses Upstash Redis when configured; falls back to a per-instance memory map
 * (weaker on serverless, but blocks obvious burst abuse in dev).
 *
 * Every caller is limited: signed-in callers are keyed by a hash of their
 * bearer token and get a higher allowance; anonymous callers are keyed by IP.
 */

import { createHash } from 'node:crypto';
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

function getBearerToken(request) {
  const header = request.headers.get('authorization') || '';
  return header.match(/^Bearer\s+(\S+)/i)?.[1] || null;
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
 * Rate-limit a request. Returns a 429 Response, or null if OK.
 *
 * Signed-in callers are keyed per session (hash of the bearer token — no auth
 * round-trip needed) and allowed `authedLimit` requests per window, defaulting
 * to 4x the anonymous limit. The token is not verified here; routes that need
 * real auth still enforce it themselves, and an invalid token only buys an
 * attacker a per-token bucket, the same as rotating IPs.
 *
 * @param {Request} request
 * @param {{ route: string, limit?: number, windowSec?: number, authedLimit?: number }} options
 * @returns {Promise<Response|null>}
 */
export async function enforceRateLimit(request, { route, limit = 30, windowSec = 3600, authedLimit = null }) {
  const token = getBearerToken(request);
  const effectiveLimit = token ? (authedLimit ?? limit * 4) : limit;
  const suffix = token
    ? `u:${createHash('sha256').update(token).digest('hex').slice(0, 16)}`
    : `ip:${getClientIp(request)}`;
  const key = `rl:${route}:${suffix}`;
  const { allowed, retryAfter, remaining } = await consumeToken(key, effectiveLimit, windowSec);

  if (!allowed) {
    const message = token
      ? 'Too many requests. Please try again later.'
      : 'Too many requests. Sign in for higher limits, or try again later.';
    return Response.json(
      { error: message },
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

/** Preset limits for expensive routes (anonymous; signed-in callers get 4x). */
export const RATE_LIMITS = {
  conversation: { limit: 24, windowSec: 3600 },
  tripsGenerate: { limit: 8, windowSec: 3600 },
  discoverCommand: { limit: 60, windowSec: 3600 },
  conciergeAsk: { limit: 20, windowSec: 3600 },
  conciergeBrief: { limit: 40, windowSec: 3600 },
  planAgent: { limit: 15, windowSec: 3600 },
};
