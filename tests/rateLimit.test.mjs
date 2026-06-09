import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { enforceAnonymousRateLimit } from '../src/lib/rateLimit.js';

function mockRequest({ ip = '203.0.113.10', auth = false } = {}) {
  const headers = new Map();
  headers.set('x-forwarded-for', ip);
  if (auth) headers.set('authorization', 'Bearer test-token');
  return {
    headers: {
      get: (name) => headers.get(name.toLowerCase()) ?? headers.get(name) ?? null,
    },
  };
}

describe('enforceAnonymousRateLimit', () => {
  it('skips limit when Bearer token is present', async () => {
    const result = await enforceAnonymousRateLimit(mockRequest({ auth: true }), {
      route: 'test-auth-skip',
      limit: 1,
      windowSec: 60,
    });
    assert.equal(result, null);
  });

  it('blocks after the limit is exceeded for the same IP', async () => {
    const route = `test-block-${Date.now()}`;
    const opts = { route, limit: 2, windowSec: 60 };
    const req = mockRequest({ ip: `198.51.100.${Math.floor(Math.random() * 200)}` });

    assert.equal(await enforceAnonymousRateLimit(req, opts), null);
    assert.equal(await enforceAnonymousRateLimit(req, opts), null);
    const blocked = await enforceAnonymousRateLimit(req, opts);
    assert.ok(blocked);
    assert.equal(blocked.status, 429);
  });
});
