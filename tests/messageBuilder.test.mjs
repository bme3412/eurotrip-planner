import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildApiMessages,
  INITIAL_USER_MESSAGE,
} from '../src/lib/conversation/messageBuilder.js';

test('empty transcript + no user input seeds the initial user message', () => {
  const out = buildApiMessages([]);
  assert.equal(out.length, 1);
  assert.equal(out[0].role, 'user');
  assert.equal(out[0].content, INITIAL_USER_MESSAGE);
});

test('empty transcript + new user input does NOT seed (user content seeds it)', () => {
  const out = buildApiMessages([], 'Plan me 10 days in Italy');
  assert.equal(out.length, 1);
  assert.equal(out[0].role, 'user');
  assert.equal(out[0].content, 'Plan me 10 days in Italy');
  assert.ok(!out[0].content.includes(INITIAL_USER_MESSAGE));
});

test('transcript with existing user message does NOT re-seed on subsequent turns', () => {
  const transcript = [
    { role: 'user', content: 'I want to go to Paris' },
    { role: 'assistant', content: 'Great! For how long?' },
  ];
  const out = buildApiMessages(transcript, '5 nights');
  assert.equal(out.length, 3);
  assert.equal(out[0].content, 'I want to go to Paris');
  // Initial seed must NOT be injected when the transcript already has a user.
  assert.ok(!out.some((m) => m.content === INITIAL_USER_MESSAGE));
});

test('system_event messages are converted to user notes with a prefix', () => {
  const transcript = [
    { role: 'user', content: 'hi' },
    { role: 'assistant', content: 'hello' },
    { role: 'system_event', content: 'Moved Rome to day 3' },
  ];
  const out = buildApiMessages(transcript);
  const last = out[out.length - 1];
  assert.equal(last.role, 'user');
  assert.match(last.content, /\[user edited the schedule\] Moved Rome to day 3/);
});

test('consecutive same-role messages are merged with a newline', () => {
  const transcript = [
    { role: 'user', content: 'hi' },
    { role: 'user', content: 'also: I like food' },
    { role: 'assistant', content: 'noted' },
    { role: 'system_event', content: 'added Lyon' }, // becomes user
  ];
  const out = buildApiMessages(transcript);
  // user (merged), assistant, user (from system_event)
  assert.equal(out.length, 3);
  assert.equal(out[0].role, 'user');
  assert.equal(out[0].content, 'hi\nalso: I like food');
  assert.equal(out[1].role, 'assistant');
  assert.equal(out[2].role, 'user');
});

test('empty-content messages are filtered out', () => {
  const transcript = [
    { role: 'user', content: 'hi' },
    { role: 'assistant', content: '' }, // dropped
    { role: 'assistant', content: 'hello' },
  ];
  const out = buildApiMessages(transcript);
  assert.equal(out.length, 2);
  assert.equal(out[0].role, 'user');
  assert.equal(out[1].role, 'assistant');
  assert.equal(out[1].content, 'hello');
});

test('first message must always be role user — falls back to seed if not', () => {
  const transcript = [{ role: 'assistant', content: 'Welcome!' }];
  const out = buildApiMessages(transcript);
  assert.equal(out[0].role, 'user');
  assert.equal(out[0].content, INITIAL_USER_MESSAGE);
  assert.equal(out[1].role, 'assistant');
});

test('null/undefined transcript is handled', () => {
  const out = buildApiMessages(undefined);
  assert.equal(out.length, 1);
  assert.equal(out[0].role, 'user');
});

test('appended user content merges with a trailing user message', () => {
  const transcript = [
    { role: 'user', content: 'hi' },
    { role: 'assistant', content: 'hey' },
    { role: 'system_event', content: 'swapped city order' },
  ];
  const out = buildApiMessages(transcript, 'please confirm');
  // system_event became user; appended user content merges into it.
  const last = out[out.length - 1];
  assert.equal(last.role, 'user');
  assert.match(last.content, /\[user edited the schedule\] swapped city order/);
  assert.match(last.content, /please confirm/);
});
