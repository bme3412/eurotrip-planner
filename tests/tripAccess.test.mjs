import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { canAccessTrip, canWriteTrip, isTripPubliclyReadable } from '../src/lib/trips/tripAccess.js';

const owner = { userId: 'user-1', userEmail: 'owner@example.com' };
const other = { userId: 'user-2', userEmail: 'other@example.com' };

const privateTrip = {
  user_id: 'user-1',
  user_email: 'owner@example.com',
  is_public: false,
  share_token: 'trip_abc123',
};

const publicTrip = {
  ...privateTrip,
  is_public: true,
};

describe('canAccessTrip', () => {
  it('allows owner read on private trip', () => {
    assert.equal(canAccessTrip(privateTrip, owner), true);
  });

  it('denies stranger read on private trip', () => {
    assert.equal(canAccessTrip(privateTrip, other), false);
    assert.equal(canAccessTrip(privateTrip, null), false);
  });

  it('allows anonymous read on public trip', () => {
    assert.equal(canAccessTrip(publicTrip, null), true);
  });

  it('allows read with matching share token', () => {
    assert.equal(canAccessTrip(privateTrip, null, { shareToken: 'trip_abc123' }), true);
    assert.equal(canAccessTrip(privateTrip, null, { shareToken: 'wrong' }), false);
  });

  it('denies write for non-owner even when public', () => {
    assert.equal(canWriteTrip(publicTrip, other), false);
    assert.equal(canWriteTrip(publicTrip, owner), true);
  });
});

describe('isTripPubliclyReadable', () => {
  it('is true for public trips and valid share links', () => {
    assert.equal(isTripPubliclyReadable(publicTrip), true);
    assert.equal(isTripPubliclyReadable(privateTrip, 'trip_abc123'), true);
    assert.equal(isTripPubliclyReadable(privateTrip), false);
  });
});
