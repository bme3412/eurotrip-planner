import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';

import {
  verifySvixSignature,
  parseEmailAddress,
  stripQuotedReply,
  htmlToText,
  replySubject,
} from '../src/lib/concierge/inboundEmail.js';

function sign({ id, timestamp, payload, rawKey }) {
  return createHmac('sha256', Buffer.from(rawKey, 'base64'))
    .update(`${id}.${timestamp}.${payload}`)
    .digest('base64');
}

describe('verifySvixSignature', () => {
  const rawKey = Buffer.from('super-secret-webhook-key').toString('base64');
  const secret = `whsec_${rawKey}`;
  const payload = '{"type":"email.received"}';
  const id = 'msg_123';

  it('accepts a valid v1 signature within tolerance', () => {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const sig = sign({ id, timestamp, payload, rawKey });
    assert.equal(
      verifySvixSignature({ id, timestamp, signature: `v1,${sig}`, payload, secret }),
      true,
    );
  });

  it('accepts when one of several space-separated signatures matches', () => {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const sig = sign({ id, timestamp, payload, rawKey });
    assert.equal(
      verifySvixSignature({ id, timestamp, signature: `v1,bogus v1,${sig}`, payload, secret }),
      true,
    );
  });

  it('rejects a tampered payload, wrong key, or stale timestamp', () => {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const sig = sign({ id, timestamp, payload, rawKey });
    assert.equal(
      verifySvixSignature({ id, timestamp, signature: `v1,${sig}`, payload: '{"x":1}', secret }),
      false,
    );
    assert.equal(
      verifySvixSignature({ id, timestamp, signature: `v1,${sig}`, payload, secret: `whsec_${Buffer.from('other').toString('base64')}` }),
      false,
    );
    const stale = String(Math.floor(Date.now() / 1000) - 3600);
    const staleSig = sign({ id, timestamp: stale, payload, rawKey });
    assert.equal(
      verifySvixSignature({ id, timestamp: stale, signature: `v1,${staleSig}`, payload, secret }),
      false,
    );
    assert.equal(verifySvixSignature({ id, timestamp, signature: null, payload, secret }), false);
  });
});

describe('parseEmailAddress', () => {
  it('extracts from display-name and bare forms', () => {
    assert.equal(parseEmailAddress('Brendan <Erhardbr@Gmail.com>'), 'erhardbr@gmail.com');
    assert.equal(parseEmailAddress('  a@b.co  '), 'a@b.co');
    assert.equal(parseEmailAddress('not-an-email'), null);
    assert.equal(parseEmailAddress(null), null);
  });
});

describe('stripQuotedReply', () => {
  it('keeps the fresh text and drops quoted history', () => {
    const body = `Push the Louvre to 11 please

On Thu, Jun 12, 2026 at 8:01 AM Olivier <briefing@x.com> wrote:
> Tomorrow in Paris...`;
    assert.equal(stripQuotedReply(body), 'Push the Louvre to 11 please');
  });

  it('cuts at > blocks, signatures, and mobile footers', () => {
    assert.equal(stripQuotedReply('yes do it\n> old stuff'), 'yes do it');
    assert.equal(stripQuotedReply('done\n--\nBrendan'), 'done');
    assert.equal(stripQuotedReply('ok\nSent from my iPhone'), 'ok');
    assert.equal(stripQuotedReply(null), '');
  });
});

describe('htmlToText + replySubject', () => {
  it('flattens simple html', () => {
    assert.equal(htmlToText('<p>Hello</p><p>World &amp; co</p>'), 'Hello\nWorld & co');
  });
  it('builds Re: subjects without stacking', () => {
    assert.equal(replySubject("Tonight's brief · Paris"), "Re: Tonight's brief · Paris");
    assert.equal(replySubject('Re: hello'), 'Re: hello');
    assert.equal(replySubject(''), 'From Olivier');
  });
});
