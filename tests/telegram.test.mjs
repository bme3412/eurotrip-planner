import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { makeLinkToken, verifyLinkToken, makeCallbackData, parseCallbackData } from '../src/lib/concierge/telegram.js';

const USER_ID = '123e4567-e89b-42d3-a456-426614174000';
const SECRET = 'test-secret';

describe('telegram link tokens', () => {
  it('round-trips a user id through the start payload', () => {
    const token = makeLinkToken(USER_ID, SECRET);
    assert.match(token, /^[0-9a-f]{32}_[0-9a-f]{16}$/);
    assert.ok(token.length <= 64, 'fits the t.me start payload limit');
    assert.equal(verifyLinkToken(token, SECRET), USER_ID);
  });

  it('rejects tampering, wrong secrets, and garbage', () => {
    const token = makeLinkToken(USER_ID, SECRET);
    assert.equal(verifyLinkToken(token, 'other-secret'), null);
    const [hex, sig] = token.split('_');
    const flipped = `${hex.slice(0, 31)}${hex[31] === '0' ? '1' : '0'}_${sig}`;
    assert.equal(verifyLinkToken(flipped, SECRET), null);
    assert.equal(verifyLinkToken('not-a-token', SECRET), null);
    assert.equal(verifyLinkToken('', SECRET), null);
  });

  it('refuses non-UUID ids and missing secrets', () => {
    assert.equal(makeLinkToken('not-a-uuid', SECRET), null);
    assert.equal(makeLinkToken(USER_ID, ''), null);
  });
});

describe('telegram callback data', () => {
  it('round-trips apply/skip with a message id under 64 bytes', () => {
    const msgId = '9f8e7d6c-5b4a-4321-8765-0123456789ab';
    const apply = makeCallbackData('apply', msgId);
    assert.ok(Buffer.byteLength(apply) <= 64);
    assert.deepEqual(parseCallbackData(apply), { decision: 'apply', messageId: msgId });
    assert.deepEqual(parseCallbackData(makeCallbackData('skip', msgId)), { decision: 'skip', messageId: msgId });
  });

  it('rejects malformed data', () => {
    assert.equal(parseCallbackData('p:a:short'), null);
    assert.equal(parseCallbackData('x:a:9f8e7d6c-5b4a-4321-8765-0123456789ab'), null);
    assert.equal(parseCallbackData(null), null);
  });
});
