import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  makeProposalToken,
  verifyProposalToken,
  proposalActionUrl,
} from '../src/lib/concierge/proposalAction.js';

const KEY = 'test-secret';
const IDS = { tripId: 'trip-123', messageId: 'msg-456' };

describe('proposal action tokens', () => {
  it('round-trips for the same trip+message', () => {
    const token = makeProposalToken(IDS, KEY);
    assert.ok(token && token.length === 32);
    assert.equal(verifyProposalToken(IDS, token, KEY), true);
    assert.equal(makeProposalToken(IDS, KEY), token);
  });

  it('rejects a different trip, message, token, or key', () => {
    const token = makeProposalToken(IDS, KEY);
    assert.equal(verifyProposalToken({ tripId: 'other', messageId: IDS.messageId }, token, KEY), false);
    assert.equal(verifyProposalToken({ tripId: IDS.tripId, messageId: 'other' }, token, KEY), false);
    assert.equal(verifyProposalToken(IDS, 'f'.repeat(32), KEY), false);
    assert.equal(verifyProposalToken(IDS, token, 'other-key'), false);
    assert.equal(verifyProposalToken(IDS, null, KEY), false);
    assert.equal(verifyProposalToken(IDS, token.slice(0, 12), KEY), false);
  });

  it('returns null without ids or key', () => {
    assert.equal(makeProposalToken({ tripId: null, messageId: 'm' }, KEY), null);
    assert.equal(makeProposalToken({ tripId: 't', messageId: null }, KEY), null);
    assert.equal(makeProposalToken(IDS, ''), null);
  });

  it('builds apply/skip URLs with the token, and rejects other decisions', () => {
    process.env.CONCIERGE_UNSUBSCRIBE_SECRET = KEY;
    try {
      const url = proposalActionUrl({ ...IDS, decision: 'apply' }, 'https://example.com');
      assert.ok(url.startsWith('https://example.com/api/concierge/email/proposal?'));
      const params = new URL(url).searchParams;
      assert.equal(params.get('trip'), IDS.tripId);
      assert.equal(params.get('message'), IDS.messageId);
      assert.equal(params.get('decision'), 'apply');
      assert.equal(verifyProposalToken(IDS, params.get('token'), KEY), true);

      assert.equal(proposalActionUrl({ ...IDS, decision: 'delete' }, 'https://example.com'), null);
    } finally {
      delete process.env.CONCIERGE_UNSUBSCRIBE_SECRET;
    }
  });
});
