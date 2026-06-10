import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseAllowlist,
  buildInviteIndex,
  indexHasInvite,
  loadInviteIndex,
  isInvited,
} from '../src/lib/concierge/invites.js';

// Minimal fake of the Supabase query chain used by loadInviteIndex.
function fakeSupabase({ rows = [], error = null } = {}) {
  return {
    from(table) {
      assert.equal(table, 'concierge_waitlist');
      return {
        select() { return this; },
        not() { return Promise.resolve({ data: rows, error }); },
      };
    },
  };
}

describe('parseAllowlist', () => {
  it('splits, trims, lowercases, drops empties', () => {
    const set = parseAllowlist(' A@b.com, ,c@D.com,');
    assert.deepEqual([...set].sort(), ['a@b.com', 'c@d.com']);
  });

  it('handles unset env', () => {
    assert.equal(parseAllowlist(undefined).size, 0);
    assert.equal(parseAllowlist('').size, 0);
  });
});

describe('buildInviteIndex / indexHasInvite', () => {
  const index = buildInviteIndex(
    [
      { email: 'Invited@Example.com', user_id: 'u-1' },
      { email: null, user_id: 'u-2' },
    ],
    'owner@site.com'
  );

  it('matches by normalized email', () => {
    assert.equal(indexHasInvite(index, { email: 'invited@example.com' }), true);
    assert.equal(indexHasInvite(index, { email: '  INVITED@EXAMPLE.COM ' }), true);
  });

  it('matches by user id', () => {
    assert.equal(indexHasInvite(index, { userId: 'u-2' }), true);
  });

  it('includes the allowlist', () => {
    assert.equal(indexHasInvite(index, { email: 'owner@site.com' }), true);
  });

  it('rejects everyone else', () => {
    assert.equal(indexHasInvite(index, { email: 'stranger@example.com' }), false);
    assert.equal(indexHasInvite(index, { userId: 'u-99' }), false);
    assert.equal(indexHasInvite(index, {}), false);
  });
});

describe('loadInviteIndex', () => {
  it('fails closed to the allowlist on query error', async () => {
    const index = await loadInviteIndex(
      fakeSupabase({ error: { message: 'column does not exist' } }),
      'owner@site.com'
    );
    assert.equal(indexHasInvite(index, { email: 'owner@site.com' }), true);
    assert.equal(indexHasInvite(index, { email: 'anyone@else.com' }), false);
  });

  it('works without a client (allowlist only)', async () => {
    const index = await loadInviteIndex(null, 'owner@site.com');
    assert.equal(indexHasInvite(index, { email: 'owner@site.com' }), true);
  });
});

describe('isInvited', () => {
  it('short-circuits on the allowlist without touching the DB', async () => {
    const result = await isInvited({
      supabase: { from() { throw new Error('should not query'); } },
      email: 'Owner@Site.com',
      allowlistRaw: 'owner@site.com',
    });
    assert.equal(result, true);
  });

  it('finds invited waitlist rows', async () => {
    const supabase = fakeSupabase({ rows: [{ email: 'beta@user.com', user_id: null }] });
    assert.equal(await isInvited({ supabase, email: 'beta@user.com', allowlistRaw: '' }), true);
    assert.equal(await isInvited({ supabase, email: 'nope@user.com', allowlistRaw: '' }), false);
  });

  it('is false with no identity or client', async () => {
    assert.equal(await isInvited({ supabase: null, allowlistRaw: '' }), false);
    assert.equal(await isInvited({ supabase: fakeSupabase(), allowlistRaw: '' }), false);
  });
});
