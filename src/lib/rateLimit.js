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
import { getRedisRestConfig } from './redisEnv';

let redis = null;
const { url: redisUrl, token: redisToken } = getRedisRestConfig();
if (redisUrl && redisToken) {
  redis = new Redis({ url: redisUrl, token: redisToken });
}

/** @type {Map<string, { count: number, resetAt: number }>} */
const memoryBuckets = new Map();

// The memory fallback is per-instance: on serverless each process keeps its own
// counters, so the effective limit is multiplied by the number of live
// instances. instrumentation.js warns at boot when the Upstash vars are unset;
// this warns once when that fallback actually limits production traffic, so the
// degradation is visible against real load rather than only at startup.
let warnedMemoryFallback = false;
function warnMemoryFallbackOnce() {
  if (warnedMemoryFallback || process.env.NODE_ENV !== 'production') return;
  warnedMemoryFallback = true;
  console.warn(
    '[rateLimit] Upstash not configured — rate limiting on per-instance memory; ' +
      'limits are not shared across serverless instances. Set UPSTASH_REDIS_REST_URL/_TOKEN ' +
      '(or the KV_REST_API_URL/_TOKEN that the Vercel Upstash integration injects).'
  );
}

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

  warnMemoryFallbackOnce();
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
  agentThread: { limit: 10, windowSec: 3600 }, // signed-in 4x → 40 msgs/hr

  planAgent: { limit: 15, windowSec: 3600 },
  waitlist: { limit: 6, windowSec: 3600 },
};
