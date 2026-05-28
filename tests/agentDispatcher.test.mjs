import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  dispatchAgentEvent,
  dispatchToolCall,
  UI_PICKER_TOOLS,
  SERVER_DATA_TOOLS,
} from '../src/lib/conversation/agentDispatcher.js';

// ---------------------------------------------------------------------------
// makeHandlers — records every callback into a `calls` log so tests can
// assert exactly which handler fired in which order, mirroring how a
// reducer would be asserted against.
// ---------------------------------------------------------------------------

function makeHandlers(overrides = {}) {
  const calls = [];
  const record = (name) => (...args) => calls.push([name, ...args]);
  return {
    calls,
    handlers: {
      updateLastAssistantMessage: record('updateLastAssistantMessage'),
      setTripState: record('setTripState'),
      setPendingInput: record('setPendingInput'),
      setIsFinalized: record('setIsFinalized'),
      onFinalize: record('onFinalize'),
      onToolCall: record('onToolCall'),
      onUnknownTool: record('onUnknownTool'),
      ...overrides,
    },
  };
}

// ---------------------------------------------------------------------------
// dispatchAgentEvent
// ---------------------------------------------------------------------------

test('content_delta appends to fullContent and updates assistant message', () => {
  const { calls, handlers } = makeHandlers();
  let full = '';
  full = dispatchAgentEvent({ type: 'content_delta', content: 'Hello' }, full, handlers);
  full = dispatchAgentEvent({ type: 'content_delta', content: ' there' }, full, handlers);
  assert.equal(full, 'Hello there');
  assert.deepEqual(calls, [
    ['updateLastAssistantMessage', 'Hello'],
    ['updateLastAssistantMessage', 'Hello there'],
  ]);
});

test('content (non-delta) is treated the same as content_delta', () => {
  const { calls, handlers } = makeHandlers();
  const out = dispatchAgentEvent({ type: 'content', content: 'one shot' }, '', handlers);
  assert.equal(out, 'one shot');
  assert.deepEqual(calls, [['updateLastAssistantMessage', 'one shot']]);
});

test('state_update calls setTripState with the new state object', () => {
  const { calls, handlers } = makeHandlers();
  const state = { route: { cities: [{ id: 'paris' }] } };
  const out = dispatchAgentEvent({ type: 'state_update', state }, 'seed', handlers);
  assert.equal(out, 'seed'); // content untouched
  assert.deepEqual(calls, [['setTripState', state]]);
});

test('state_update with no state is a no-op', () => {
  const { calls, handlers } = makeHandlers();
  dispatchAgentEvent({ type: 'state_update' }, '', handlers);
  assert.deepEqual(calls, []);
});

test('tool_use for a UI picker tool calls setPendingInput AND onToolCall', () => {
  const { calls, handlers } = makeHandlers();
  dispatchAgentEvent(
    { type: 'tool_use', name: 'render_city_picker', input: { options: ['Paris'] } },
    '',
    handlers,
  );
  assert.deepEqual(calls, [
    ['setPendingInput', { type: 'render_city_picker', data: { options: ['Paris'] } }],
    ['onToolCall', 'render_city_picker', { options: ['Paris'] }],
  ]);
});

test('tool_use for a server-side data tool only calls onToolCall (no client mutation)', () => {
  const { calls, handlers } = makeHandlers();
  dispatchAgentEvent(
    { type: 'tool_use', name: 'extract_trip_data', input: { dates: '...' } },
    '',
    handlers,
  );
  // Only the observer; setPendingInput / setTripState must NOT fire.
  assert.deepEqual(calls, [['onToolCall', 'extract_trip_data', { dates: '...' }]]);
});

test('tool_use for finalize_trip prefers onFinalize over setIsFinalized when both are provided', () => {
  const { calls, handlers } = makeHandlers();
  dispatchAgentEvent(
    { type: 'tool_use', name: 'finalize_trip', input: { summary: 'paris-only' } },
    '',
    handlers,
  );
  // onFinalize fired; setIsFinalized did NOT.
  assert.ok(calls.some(([n]) => n === 'onFinalize'));
  assert.ok(!calls.some(([n]) => n === 'setIsFinalized'));
});

test('tool_use for finalize_trip falls back to setIsFinalized when onFinalize is omitted', () => {
  const calls = [];
  const record = (name) => (...args) => calls.push([name, ...args]);
  // Note: no onFinalize.
  const handlers = {
    updateLastAssistantMessage: () => {},
    setTripState: () => {},
    setPendingInput: () => {},
    setIsFinalized: record('setIsFinalized'),
  };
  dispatchAgentEvent({ type: 'tool_use', name: 'finalize_trip', input: {} }, '', handlers);
  assert.deepEqual(calls, [['setIsFinalized', true]]);
});

test('error events throw with the server-provided message', () => {
  const { handlers } = makeHandlers();
  assert.throws(
    () => dispatchAgentEvent({ type: 'error', error: 'rate limited' }, '', handlers),
    /rate limited/,
  );
});

test('error events with no message throw a generic server error', () => {
  const { handlers } = makeHandlers();
  assert.throws(() => dispatchAgentEvent({ type: 'error' }, '', handlers), /Server error/);
});

test('incomplete event appends the nudge to fullContent (with blank-line separator)', () => {
  const { calls, handlers } = makeHandlers();
  const out = dispatchAgentEvent(
    { type: 'incomplete', message: "Send another message and I'll pick up." },
    'previous reply',
    handlers,
  );
  assert.equal(out, "previous reply\n\nSend another message and I'll pick up.");
  assert.deepEqual(calls, [['updateLastAssistantMessage', out]]);
});

test('incomplete event with empty buffer does not prepend a separator', () => {
  const { handlers } = makeHandlers();
  const out = dispatchAgentEvent(
    { type: 'incomplete', message: 'try again' },
    '',
    handlers,
  );
  assert.equal(out, 'try again');
});

test('tool_result and tool_error events are silent (reserved for debug UI)', () => {
  const { calls, handlers } = makeHandlers();
  dispatchAgentEvent({ type: 'tool_result', tool: 'x', result: {} }, '', handlers);
  dispatchAgentEvent({ type: 'tool_error', tool: 'x', error: 'oops' }, '', handlers);
  assert.deepEqual(calls, []);
});

test('done event is silent', () => {
  const { calls, handlers } = makeHandlers();
  const out = dispatchAgentEvent({ type: 'done' }, 'final', handlers);
  assert.equal(out, 'final');
  assert.deepEqual(calls, []);
});

test('unknown event type is a no-op (returns fullContent unchanged)', () => {
  const { calls, handlers } = makeHandlers();
  const out = dispatchAgentEvent({ type: 'totally_new' }, 'seed', handlers);
  assert.equal(out, 'seed');
  assert.deepEqual(calls, []);
});

// ---------------------------------------------------------------------------
// dispatchToolCall — exhaustively covers the UI-picker set
// ---------------------------------------------------------------------------

test('dispatchToolCall routes every UI_PICKER tool to setPendingInput', () => {
  for (const name of UI_PICKER_TOOLS) {
    const { calls, handlers } = makeHandlers();
    dispatchToolCall(name, { foo: 1 }, handlers);
    assert.deepEqual(calls, [['setPendingInput', { type: name, data: { foo: 1 } }]]);
  }
});

test('dispatchToolCall ignores every SERVER_DATA tool on the client', () => {
  for (const name of SERVER_DATA_TOOLS) {
    const { calls, handlers } = makeHandlers();
    dispatchToolCall(name, {}, handlers);
    // Nothing in the handler set should have fired.
    assert.deepEqual(calls, []);
  }
});

test('dispatchToolCall calls onUnknownTool for tools outside the known sets', () => {
  const { calls, handlers } = makeHandlers();
  dispatchToolCall('something_invented', {}, handlers);
  assert.deepEqual(calls, [['onUnknownTool', 'something_invented']]);
});
