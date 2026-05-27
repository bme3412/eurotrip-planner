import { test } from 'node:test';
import assert from 'node:assert/strict';

import { runPlannerLoop } from '../src/lib/conversation/plannerLoop.js';
import { initialTripState } from '../src/lib/conversation/tripState.js';

/**
 * Integration harness for the planner agent loop.
 *
 * We mock the Anthropic client with a scripted sequence of `finalMessage`
 * responses; each call to `client.messages.stream(params)` pops the next
 * scripted response. We also inject a fake `executeToolCall` so we can
 * assert on the tool dispatch path without hitting real handlers.
 */

/**
 * Build a scripted Anthropic mock.
 * @param {Array<{text?: string, content: Array, stop_reason?: string}>} responses
 *   Each entry becomes the `finalMessage()` return value for the next call.
 */
function makeClient(responses) {
  const calls = [];
  let idx = 0;
  return {
    calls,
    messages: {
      stream(params) {
        const i = idx++;
        calls.push({ params, index: i });
        const resp = responses[i];
        if (!resp) {
          throw new Error(`mock client: no scripted response at index ${i}`);
        }
        const listeners = { text: [] };
        return {
          on(event, fn) {
            listeners[event] = listeners[event] || [];
            listeners[event].push(fn);
          },
          async finalMessage() {
            for (const delta of resp.textDeltas || []) {
              for (const fn of listeners.text) fn(delta);
            }
            return {
              content: resp.content || [],
              stop_reason: resp.stop_reason || 'end_turn',
            };
          },
        };
      },
    },
  };
}

function collectSend() {
  const events = [];
  return {
    events,
    send: (ev) => events.push(ev),
  };
}

test('text-only turn: streams content_delta and ends without tool calls', async () => {
  const client = makeClient([
    {
      textDeltas: ['Hello', ' there!'],
      content: [{ type: 'text', text: 'Hello there!' }],
      stop_reason: 'end_turn',
    },
  ]);
  const { events, send } = collectSend();

  const result = await runPlannerLoop({
    client,
    initialMessages: [{ role: 'user', content: 'Hi' }],
    tripState: initialTripState,
    send,
  });

  assert.equal(result.loopCount, 1);
  assert.equal(result.hitMaxLoops, false);

  const deltaEvents = events.filter((e) => e.type === 'content_delta');
  assert.equal(deltaEvents.length, 2);
  assert.equal(deltaEvents[0].content, 'Hello');
  assert.equal(deltaEvents[1].content, ' there!');

  assert.ok(events.some((e) => e.type === 'done'));
  assert.ok(!events.some((e) => e.type === 'tool_use'));
  assert.ok(!events.some((e) => e.type === 'incomplete'));

  // Client should have been called exactly once.
  assert.equal(client.calls.length, 1);
  assert.equal(client.calls[0].params.max_tokens, 4096); // first turn gets bigger budget
});

test('single data tool: executes handler, emits state_update, stops', async () => {
  const client = makeClient([
    {
      content: [
        {
          type: 'tool_use',
          id: 'tool_1',
          name: 'extract_trip_data',
          input: { cities: [{ name: 'Paris' }] },
        },
      ],
      stop_reason: 'tool_use',
    },
    {
      textDeltas: ['Paris it is.'],
      content: [{ type: 'text', text: 'Paris it is.' }],
      stop_reason: 'end_turn',
    },
  ]);
  const { events, send } = collectSend();

  const nextState = {
    ...initialTripState,
    route: { ...initialTripState.route, cities: [{ name: 'Paris', order: 0, role: 'start' }] },
  };

  let executedCalls = 0;
  const fakeExecute = async (name, input, state) => {
    executedCalls += 1;
    assert.equal(name, 'extract_trip_data');
    assert.deepEqual(input.cities, [{ name: 'Paris' }]);
    return { updatedState: nextState };
  };

  const result = await runPlannerLoop({
    client,
    initialMessages: [{ role: 'user', content: 'I want to go to Paris' }],
    tripState: initialTripState,
    send,
    executeToolCall: fakeExecute,
  });

  assert.equal(executedCalls, 1);
  assert.equal(result.loopCount, 2); // one for tool_use, one for text
  assert.equal(result.hitMaxLoops, false);
  assert.equal(result.tripState.route.cities[0].name, 'Paris');

  // Expected event stream: tool_use, state_update, content_delta, done.
  const kinds = events.map((e) => e.type);
  assert.ok(kinds.includes('tool_use'));
  assert.ok(kinds.includes('state_update'));
  assert.ok(kinds.includes('content_delta'));
  assert.ok(kinds.includes('done'));
  assert.ok(!kinds.includes('incomplete'));

  // Second call should use the reduced max_tokens budget.
  assert.equal(client.calls[1].params.max_tokens, 2048);

  // The second call's messages should include the assistant's tool_use block
  // and a user tool_result block.
  const secondMessages = client.calls[1].params.messages;
  const last = secondMessages[secondMessages.length - 1];
  assert.equal(last.role, 'user');
  assert.ok(Array.isArray(last.content));
  assert.equal(last.content[0].type, 'tool_result');
  assert.equal(last.content[0].tool_use_id, 'tool_1');
});

test('multi-tool loop: two tool rounds then text', async () => {
  const client = makeClient([
    {
      content: [
        {
          type: 'tool_use',
          id: 'a',
          name: 'suggest_cities',
          input: { region: 'France' },
        },
      ],
      stop_reason: 'tool_use',
    },
    {
      content: [
        {
          type: 'tool_use',
          id: 'b',
          name: 'get_city_info',
          input: { cityId: 'paris' },
        },
      ],
      stop_reason: 'tool_use',
    },
    {
      textDeltas: ['Here is a plan.'],
      content: [{ type: 'text', text: 'Here is a plan.' }],
      stop_reason: 'end_turn',
    },
  ]);
  const { events, send } = collectSend();

  let calls = 0;
  const fakeExecute = async (name) => {
    calls += 1;
    return { ok: true, name };
  };

  const result = await runPlannerLoop({
    client,
    initialMessages: [{ role: 'user', content: 'plan me something' }],
    tripState: initialTripState,
    send,
    executeToolCall: fakeExecute,
  });

  assert.equal(calls, 2);
  assert.equal(result.loopCount, 3);
  assert.equal(result.hitMaxLoops, false);
  const toolUseEvents = events.filter((e) => e.type === 'tool_use');
  assert.equal(toolUseEvents.length, 2);
  assert.equal(toolUseEvents[0].name, 'suggest_cities');
  assert.equal(toolUseEvents[1].name, 'get_city_info');
});

test('MAX_LOOPS exhaustion: emits incomplete event and stops', async () => {
  // Script 3 consecutive tool_use responses but cap maxLoops at 3 so the
  // third iteration exhausts the budget while still requesting tools.
  const toolUseResp = {
    content: [
      {
        type: 'tool_use',
        id: 't',
        name: 'suggest_cities',
        input: { region: 'Europe' },
      },
    ],
    stop_reason: 'tool_use',
  };
  const client = makeClient([toolUseResp, toolUseResp, toolUseResp]);
  const { events, send } = collectSend();

  const result = await runPlannerLoop({
    client,
    initialMessages: [{ role: 'user', content: 'keep planning forever' }],
    tripState: initialTripState,
    send,
    executeToolCall: async () => ({ ok: true }),
    maxLoops: 3,
  });

  assert.equal(result.loopCount, 3);
  assert.equal(result.hitMaxLoops, true);
  const incomplete = events.find((e) => e.type === 'incomplete');
  assert.ok(incomplete, 'expected an incomplete event');
  assert.equal(incomplete.reason, 'max_loops');
  assert.match(incomplete.message, /try again|pick up|taking longer/i);
  // `done` must still fire after `incomplete`.
  assert.ok(events.some((e) => e.type === 'done'));
  const doneIdx = events.findIndex((e) => e.type === 'done');
  const incIdx = events.findIndex((e) => e.type === 'incomplete');
  assert.ok(incIdx < doneIdx, 'incomplete must precede done');
});

test('exits cleanly when model returns no tool_use blocks', async () => {
  // If the model returns `tool_use` stop_reason but no blocks (shouldn't
  // happen in practice), the loop must still terminate rather than spin.
  const client = makeClient([
    { content: [{ type: 'text', text: 'done' }], stop_reason: 'tool_use' },
  ]);
  const { events, send } = collectSend();

  const result = await runPlannerLoop({
    client,
    initialMessages: [{ role: 'user', content: 'hi' }],
    tripState: initialTripState,
    send,
  });

  assert.equal(result.loopCount, 1);
  assert.equal(result.hitMaxLoops, false);
  assert.ok(events.some((e) => e.type === 'done'));
});

test('abort: throws bubble up to caller (simulated via callWithRetry)', async () => {
  const client = makeClient([
    {
      content: [{ type: 'text', text: 'nothing' }],
      stop_reason: 'end_turn',
    },
  ]);
  const { events, send } = collectSend();

  const abortErr = Object.assign(new Error('Aborted'), { name: 'AbortError' });

  await assert.rejects(
    runPlannerLoop({
      client,
      initialMessages: [{ role: 'user', content: 'hi' }],
      tripState: initialTripState,
      send,
      callWithRetry: async () => {
        throw abortErr;
      },
    }),
    (e) => e.name === 'AbortError'
  );

  // No done event on abort — the caller's catch handler emits the error.
  assert.ok(!events.some((e) => e.type === 'done'));
});

test('UI tool (confirm_changes) emits synthetic tool_result and continues', async () => {
  const client = makeClient([
    {
      content: [
        {
          type: 'tool_use',
          id: 'u',
          name: 'confirm_changes',
          input: { summary: 'Add Rome?' },
        },
      ],
      stop_reason: 'tool_use',
    },
    {
      textDeltas: ['ok'],
      content: [{ type: 'text', text: 'ok' }],
      stop_reason: 'end_turn',
    },
  ]);
  const { events, send } = collectSend();

  let executed = 0;
  const fakeExecute = async () => {
    executed += 1;
    return null;
  };

  const result = await runPlannerLoop({
    client,
    initialMessages: [{ role: 'user', content: 'add Rome' }],
    tripState: initialTripState,
    send,
    executeToolCall: fakeExecute,
  });

  // UI tools must NOT hit the handler.
  assert.equal(executed, 0);
  assert.equal(result.loopCount, 2);
  assert.equal(result.hitMaxLoops, false);

  // tool_use event must be emitted for the UI tool.
  const toolUse = events.find((e) => e.type === 'tool_use');
  assert.equal(toolUse.name, 'confirm_changes');

  // Second API call should include the synthetic tool_result.
  const secondMessages = client.calls[1].params.messages;
  const toolResultTurn = secondMessages[secondMessages.length - 1];
  assert.equal(toolResultTurn.role, 'user');
  assert.equal(toolResultTurn.content[0].type, 'tool_result');
  assert.equal(toolResultTurn.content[0].tool_use_id, 'u');
});
