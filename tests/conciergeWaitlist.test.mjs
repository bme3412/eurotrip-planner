import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeWaitlistSignup } from '../src/lib/concierge/waitlist.js';

describe('normalizeWaitlistSignup', () => {
  it('normalizes a complete signup', () => {
    const { record, error } = normalizeWaitlistSignup({
      email: '  Erhard.BR@Gmail.com ',
      channels: { push: true, email: false },
      source: 'concierge-preview',
    });
    assert.equal(error, undefined);
    assert.deepEqual(record, {
      email: 'erhard.br@gmail.com',
      wants_push: true,
      wants_email: false,
      source: 'concierge-preview',
    });
  });

  it('defaults channels to true and source to home', () => {
    const { record } = normalizeWaitlistSignup({ email: 'a@b.co' });
    assert.deepEqual(record, { email: 'a@b.co', wants_push: true, wants_email: true, source: 'home' });
  });

  it('keeps the signup even when both channels are toggled off', () => {
    const { record } = normalizeWaitlistSignup({ email: 'a@b.co', channels: { push: false, email: false } });
    assert.equal(record.wants_push, false);
    assert.equal(record.wants_email, false);
  });

  it('rejects unknown sources back to home', () => {
    const { record } = normalizeWaitlistSignup({ email: 'a@b.co', source: 'spam-source' });
    assert.equal(record.source, 'home');
  });

  it('rejects invalid emails', () => {
    for (const email of [undefined, null, '', '   ', 'nope', 'a@b', 'a b@c.com', 'a@b.c', `${'x'.repeat(255)}@y.com`]) {
      const result = normalizeWaitlistSignup({ email });
      assert.ok(result.error, `rejects ${JSON.stringify(email)}`);
      assert.equal(result.record, undefined);
    }
  });
});
