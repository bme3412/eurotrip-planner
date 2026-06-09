import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  requireTripReadAccess,
  requireTripWriteAccess,
} from '../src/lib/trips/requireTripAccess.js';

const owner = { userId: 'user-1', userEmail: 'owner@example.com' };
const stranger = { userId: 'user-2', userEmail: 'other@example.com' };

const privateTrip = {
  id: 'trip-1',
  user_id: 'user-1',
  user_email: 'owner@example.com',
  is_public: false,
  share_token: 'trip_abc123',
};

const publicTrip = { ...privateTrip, is_public: true };

function makeRequest(url = 'https://example.com/api/trips/trip-1') {
  return new Request(url);
}

function depsFor(trip, requester = null) {
  return {
    getTrip: async () => trip,
    getRequester: async () => ({ requester, response: requester ? null : unauthenticated() }),
  };
}

function unauthenticated() {
  return new Response(JSON.stringify({ error: 'Sign in is required.' }), { status: 401 });
}

describe('requireTripReadAccess', () => {
  it('allows anonymous read on a public trip', async () => {
    const { trip, response } = await requireTripReadAccess(
      makeRequest(),
      'trip-1',
      depsFor(publicTrip)
    );
    assert.equal(response, null);
    assert.equal(trip.id, 'trip-1');
  });

  it('allows anonymous read on a private trip with a valid ?share= token', async () => {
    const { trip, response } = await requireTripReadAccess(
      makeRequest('https://example.com/api/trips/trip-1/calendar?share=trip_abc123'),
      'trip-1',
      depsFor(privateTrip)
    );
    assert.equal(response, null);
    assert.equal(trip.id, 'trip-1');
  });

  it('rejects an invalid share token on a private trip', async () => {
    const { response } = await requireTripReadAccess(
      makeRequest('https://example.com/api/trips/trip-1?share=wrong-token'),
      'trip-1',
      depsFor(privateTrip)
    );
    assert.equal(response.status, 401);
  });

  it('allows the owner without a share token', async () => {
    const { trip, response } = await requireTripReadAccess(
      makeRequest(),
      'trip-1',
      depsFor(privateTrip, owner)
    );
    assert.equal(response, null);
    assert.equal(trip.id, 'trip-1');
  });

  it('forbids a signed-in stranger on a private trip', async () => {
    const { response } = await requireTripReadAccess(
      makeRequest(),
      'trip-1',
      depsFor(privateTrip, stranger)
    );
    assert.equal(response.status, 403);
  });

  it('returns 404 when the trip does not exist', async () => {
    const { response } = await requireTripReadAccess(makeRequest(), 'missing', depsFor(null));
    assert.equal(response.status, 404);
  });

  it('returns 502 when the trip load throws (DB failure)', async () => {
    const { response } = await requireTripReadAccess(makeRequest(), 'trip-1', {
      getTrip: async () => {
        throw new Error('connection refused');
      },
      getRequester: async () => ({ requester: null, response: null }),
    });
    assert.equal(response.status, 502);
    const body = await response.json();
    assert.equal(body.error, 'Could not load trip.');
  });
});

describe('requireTripWriteAccess', () => {
  it('never grants writes via share token', async () => {
    const { response } = await requireTripWriteAccess(
      makeRequest('https://example.com/api/trips/trip-1?share=trip_abc123'),
      'trip-1',
      depsFor(privateTrip)
    );
    assert.equal(response.status, 401);
  });

  it('forbids a signed-in stranger even on a public trip', async () => {
    const { response } = await requireTripWriteAccess(
      makeRequest(),
      'trip-1',
      depsFor(publicTrip, stranger)
    );
    assert.equal(response.status, 403);
  });

  it('allows the owner to write', async () => {
    const { trip, response } = await requireTripWriteAccess(
      makeRequest(),
      'trip-1',
      depsFor(privateTrip, owner)
    );
    assert.equal(response, null);
    assert.equal(trip.id, 'trip-1');
  });

  it('returns 502 when the trip load throws', async () => {
    const { response } = await requireTripWriteAccess(makeRequest(), 'trip-1', {
      getTrip: async () => {
        throw new Error('connection refused');
      },
      getRequester: async () => ({ requester: owner, response: null }),
    });
    assert.equal(response.status, 502);
  });
});
