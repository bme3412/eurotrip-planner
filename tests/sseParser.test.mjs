import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  createSSEBuffer,
  feedSSE,
  flushSSE,
  parseSSELine,
} from '../src/lib/conversation/sseParser.js';

test('parseSSELine parses a well-formed data: JSON line', () => {
  const out = parseSSELine('data: {"type":"content_delta","content":"hi"}');
  assert.deepEqual(out, { type: 'content_delta', content: 'hi' });
});

test('parseSSELine returns undefined for non-data lines', () => {
  assert.equal(parseSSELine(''), undefined);
  assert.equal(parseSSELine('event: message'), undefined);
  assert.equal(parseSSELine(': keep-alive comment'), undefined);
  assert.equal(parseSSELine('data: '), undefined);
});

test('parseSSELine swallows malformed JSON', () => {
  assert.equal(parseSSELine('data: {not valid json'), undefined);
});

test('feedSSE parses one full event in a single chunk', () => {
  const buf = createSSEBuffer();
  const events = feedSSE(buf, 'data: {"type":"content_delta","content":"hi"}\n\n');
  assert.equal(events.length, 1);
  assert.deepEqual(events[0], { type: 'content_delta', content: 'hi' });
  // Buffer should have nothing left (or an empty residual line).
  assert.equal(buf.lineBuffer, '');
});

test('feedSSE buffers partial lines until the newline arrives', () => {
  const buf = createSSEBuffer();
  const e1 = feedSSE(buf, 'data: {"type":"co');
  assert.deepEqual(e1, []);

  const e2 = feedSSE(buf, 'ntent_delta","content":"hello"}');
  assert.deepEqual(e2, []);

  const e3 = feedSSE(buf, '\n');
  assert.equal(e3.length, 1);
  assert.deepEqual(e3[0], { type: 'content_delta', content: 'hello' });
});

test('feedSSE emits multiple events when several newlines are in one chunk', () => {
  const buf = createSSEBuffer();
  const chunk =
    'data: {"type":"content_delta","content":"a"}\n' +
    'data: {"type":"content_delta","content":"b"}\n' +
    'data: {"type":"tool_use","name":"extract_trip_data"}\n';
  const events = feedSSE(buf, chunk);
  assert.equal(events.length, 3);
  assert.equal(events[0].content, 'a');
  assert.equal(events[1].content, 'b');
  assert.equal(events[2].type, 'tool_use');
});

test('feedSSE skips blank lines and event: lines between data: lines', () => {
  const buf = createSSEBuffer();
  const chunk =
    'data: {"type":"content_delta","content":"a"}\n' +
    '\n' +
    'event: message\n' +
    'data: {"type":"content_delta","content":"b"}\n';
  const events = feedSSE(buf, chunk);
  assert.equal(events.length, 2);
  assert.equal(events[0].content, 'a');
  assert.equal(events[1].content, 'b');
});

test('feedSSE ignores malformed JSON but continues parsing subsequent lines', () => {
  const buf = createSSEBuffer();
  const chunk =
    'data: {bad json\n' +
    'data: {"type":"done"}\n';
  const events = feedSSE(buf, chunk);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'done');
});

test('flushSSE parses a trailing data: line with no final newline', () => {
  const buf = createSSEBuffer();
  feedSSE(buf, 'data: {"type":"content_delta","content":"a"}\n');
  // No newline after this final line; simulates server closing mid-line.
  feedSSE(buf, 'data: {"type":"done"}');
  const tail = flushSSE(buf);
  assert.equal(tail.length, 1);
  assert.equal(tail[0].type, 'done');
  assert.equal(buf.lineBuffer, '');
});

test('flushSSE returns [] when the residual is incomplete JSON', () => {
  const buf = createSSEBuffer();
  feedSSE(buf, 'data: {"type":"content_delta","content":"a"}\n');
  feedSSE(buf, 'data: {"type":"do');
  const tail = flushSSE(buf);
  assert.deepEqual(tail, []);
});

test('feedSSE split across arbitrary byte boundaries reconstructs the full stream', () => {
  const fullPayload =
    'data: {"type":"content_delta","content":"hello world"}\n' +
    'data: {"type":"tool_use","name":"get_city_info","input":{"cityId":"paris"}}\n' +
    'data: {"type":"done"}\n';

  // Feed one character at a time — worst case.
  const buf = createSSEBuffer();
  const collected = [];
  for (const ch of fullPayload) {
    collected.push(...feedSSE(buf, ch));
  }
  collected.push(...flushSSE(buf));

  assert.equal(collected.length, 3);
  assert.equal(collected[0].content, 'hello world');
  assert.equal(collected[1].name, 'get_city_info');
  assert.equal(collected[1].input.cityId, 'paris');
  assert.equal(collected[2].type, 'done');
});
