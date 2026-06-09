import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { enforceRateLimit } from '../src/lib/rateLimit.js';

function mockRequest({ ip = '203.0.113.10', token = null } = {}) {
  const headers = new Map();
  headers.set('x-forwarded-for', ip);
  if (token) headers.set('authorization', `Bearer ${token}`);
  return {
    headers: {
      get: (name) => headers.get(name.toLowerCase()) ?? headers.get(name) ?? null,
    },
  };
}

describe('enforceRateLimit', () => {
  it('blocks anonymous callers after the limit for the same IP', async () => {
    const route = `test-anon-${Date.now()}`;
    const opts = { route, limit: 2, windowSec: 60 };
    const req = mockRequest({ ip: `198.51.100.${Math.floor(Math.random() * 200)}` });

    assert.equal(await enforceRateLimit(req, opts), null);
    assert.equal(await enforceRateLimit(req, opts), null);
    const blocked = await enforceRateLimit(req, opts);
    assert.ok(blocked);
    assert.equal(blocked.status, 429);
  });

  it('limits signed-in callers too, at the authed allowance', async () => {
    const route = `test-authed-${Date.now()}`;
    const opts = { route, limit: 1, authedLimit: 2, windowSec: 60 };
    const req = mockRequest({ token: 'session-token-a' });

    assert.equal(await enforceRateLimit(req, opts), null);
    assert.equal(await enforceRateLimit(req, opts), null);
    const blocked = await enforceRateLimit(req, opts);
    assert.ok(blocked);
    assert.equal(blocked.status, 429);
  });

  it('defaults the authed allowance to 4x the anonymous limit', async () => {
    const route = `test-authed-default-${Date.now()}`;
    const opts = { route, limit: 1, windowSec: 60 };
    const req = mockRequest({ token: 'session-token-b' });

    for (let i = 0; i < 4; i++) {
      assert.equal(await enforceRateLimit(req, opts), null);
    }
    const blocked = await enforceRateLimit(req, opts);
    assert.ok(blocked);
    assert.equal(blocked.status, 429);
  });

  it('buckets different sessions and IPs separately', async () => {
    const route = `test-buckets-${Date.now()}`;
    const opts = { route, limit: 1, authedLimit: 1, windowSec: 60 };

    assert.equal(await enforceRateLimit(mockRequest({ token: 'session-1' }), opts), null);
    assert.equal(await enforceRateLimit(mockRequest({ token: 'session-2' }), opts), null);
    assert.equal(await enforceRateLimit(mockRequest({ ip: '192.0.2.1' }), opts), null);
    assert.equal(await enforceRateLimit(mockRequest({ ip: '192.0.2.2' }), opts), null);

    const blocked = await enforceRateLimit(mockRequest({ token: 'session-1' }), opts);
    assert.equal(blocked.status, 429);
  });

  it('includes a Retry-After header on 429s', async () => {
    const route = `test-retry-${Date.now()}`;
    const opts = { route, limit: 1, windowSec: 60 };
    const req = mockRequest({ ip: '192.0.2.50' });

    await enforceRateLimit(req, opts);
    const blocked = await enforceRateLimit(req, opts);
    assert.ok(Number(blocked.headers.get('Retry-After')) > 0);
  });
});
