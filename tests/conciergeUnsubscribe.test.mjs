import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  makeUnsubscribeToken,
  verifyUnsubscribeToken,
  unsubscribeUrl,
  normalizeEmail,
} from '../src/lib/concierge/unsubscribe.js';

const KEY = 'test-secret';

describe('unsubscribe tokens', () => {
  it('round-trips and normalizes the email', () => {
    const token = makeUnsubscribeToken('  Traveler@Example.COM ', KEY);
    assert.ok(token && token.length === 32);
    assert.equal(verifyUnsubscribeToken('traveler@example.com', token, KEY), true);
    assert.equal(makeUnsubscribeToken('traveler@example.com', KEY), token);
  });

  it('rejects the wrong email, token, or key', () => {
    const token = makeUnsubscribeToken('a@b.com', KEY);
    assert.equal(verifyUnsubscribeToken('other@b.com', token, KEY), false);
    assert.equal(verifyUnsubscribeToken('a@b.com', 'f'.repeat(32), KEY), false);
    assert.equal(verifyUnsubscribeToken('a@b.com', token, 'other-key'), false);
    assert.equal(verifyUnsubscribeToken('a@b.com', null, KEY), false);
    assert.equal(verifyUnsubscribeToken('a@b.com', token.slice(0, 10), KEY), false);
  });

  it('returns null without an email or key', () => {
    assert.equal(makeUnsubscribeToken('', KEY), null);
    assert.equal(makeUnsubscribeToken('a@b.com', ''), null);
  });
});

describe('unsubscribeUrl', () => {
  it('builds a verifiable link', () => {
    process.env.CONCIERGE_UNSUBSCRIBE_SECRET = KEY;
    try {
      const url = unsubscribeUrl('Traveler@Example.com', 'https://example.com/');
      assert.ok(url.startsWith('https://example.com/api/concierge/email/unsubscribe?'));
      const params = new URL(url).searchParams;
      assert.equal(params.get('email'), 'traveler@example.com');
      assert.equal(verifyUnsubscribeToken(params.get('email'), params.get('token'), KEY), true);
    } finally {
      delete process.env.CONCIERGE_UNSUBSCRIBE_SECRET;
    }
  });
});

describe('normalizeEmail', () => {
  it('trims and lowercases, empty for non-strings', () => {
    assert.equal(normalizeEmail(' A@B.com '), 'a@b.com');
    assert.equal(normalizeEmail(null), '');
  });
});
