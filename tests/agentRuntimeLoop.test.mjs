import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runToolLoop } from '@/lib/concierge/agentRuntime';
import { AGENT_TOOLS } from '@/lib/concierge/agentToolsThread';
import { createTraceRecorder } from '@/lib/concierge/agentTrace';

/** A scripted MessageStream: async-iterates the given events, then resolves finalMessage. */
function fakeStream(events, finalMsg) {
  return {
    [Symbol.asyncIterator]() {
      let i = 0;
      return {
        next: async () => (i < events.length ? { value: events[i++], done: false } : { value: undefined, done: true }),
      };
    },
    finalMessage: async () => finalMsg,
  };
}

function fakeClient(rounds) {
  const requests = [];
  return {
    requests,
    messages: {
      stream(req) {
        requests.push(req);
        const r = rounds.shift();
        if (!r) throw new Error('fake client exhausted');
        return fakeStream(r.events, r.final);
      },
    },
  };
}

const CTX = {
  days: [
    {
      dayNumber: 1,
      cityName: 'Paris',
      date: '2026-06-19',
      schedule: [{ time: '09:00', name: 'Louvre' }],
    },
  ],
};

describe('runToolLoop', () => {
  it('streams thinking + text, executes tools between rounds, preserves thinking blocks', async () => {
    const thinkingBlock = { type: 'thinking', thinking: 'Check the day first.', signature: 'sig-abc' };
    const toolUseBlock = { type: 'tool_use', id: 'tu-1', name: 'get_day_details', input: { dayNumber: 1 } };

    const client = fakeClient([
      {
        events: [
          { type: 'content_block_start', content_block: { type: 'thinking' } },
          { type: 'content_block_delta', delta: { type: 'thinking_delta', thinking: 'Check the ' } },
          { type: 'content_block_delta', delta: { type: 'thinking_delta', thinking: 'day first.' } },
          { type: 'content_block_start', content_block: { type: 'tool_use' } },
        ],
        final: { stop_reason: 'tool_use', content: [thinkingBlock, toolUseBlock], usage: { output_tokens: 50 } },
      },
      {
        events: [
          { type: 'content_block_start', content_block: { type: 'text' } },
          { type: 'content_block_delta', delta: { type: 'text_delta', text: 'All set ' } },
          { type: 'content_block_delta', delta: { type: 'text_delta', text: 'for tomorrow.' } },
        ],
        final: { stop_reason: 'end_turn', content: [{ type: 'text', text: 'All set for tomorrow.' }], usage: { output_tokens: 20 } },
      },
    ]);

    const events = [];
    const recorder = createTraceRecorder();
    const messages = [{ role: 'user', content: 'How does tomorrow look?' }];
    const result = await runToolLoop({
      client,
      system: 'You are Olivier.',
      messages,
      tools: AGENT_TOOLS,
      toolEnv: { ctx: CTX, trip: {}, supabase: null, userId: 'u1', tripId: 't1' },
      onEvent: (type, data) => events.push({ type, ...data }),
      recorder,
    });

    assert.equal(result.finalText, 'All set for tomorrow.');
    assert.deepEqual(result.usedTools, ['get_day_details']);

    // Event stream: thinking deltas, labeled tool_call, summarized tool_result, text deltas.
    const types = events.map((e) => e.type);
    assert.ok(types.includes('thinking'));
    const call = events.find((e) => e.type === 'tool_call');
    assert.equal(call.label, 'Looking at Day 1 — Paris');
    const res = events.find((e) => e.type === 'tool_result');
    assert.equal(res.ok, true);
    assert.equal(res.summary, '1 stop · first at 09:00');
    assert.equal(events.filter((e) => e.type === 'delta').map((e) => e.text).join(''), 'All set for tomorrow.');

    // The assistant turn is pushed VERBATIM — thinking block + signature intact.
    const assistant = messages.find((m) => m.role === 'assistant');
    assert.ok(assistant);
    assert.equal(assistant.content[0].type, 'thinking');
    assert.equal(assistant.content[0].signature, 'sig-abc');
    // …followed by the tool_result user turn.
    const toolResultTurn = messages[messages.length - 1];
    assert.equal(toolResultTurn.role, 'user');
    assert.equal(toolResultTurn.content[0].tool_use_id, 'tu-1');

    // Adaptive thinking on every request.
    assert.deepEqual(client.requests[0].thinking, { type: 'adaptive' });
    assert.equal(client.requests.length, 2);

    // Trace captured both the deliberation and the tool step.
    const trace = recorder.finalize();
    assert.equal(trace.steps[0].t, 'thinking');
    assert.equal(trace.steps[0].text, 'Check the day first.');
    assert.equal(trace.steps[1].t, 'tool');
    assert.equal(trace.steps[1].ok, true);
  });

  it('separates prose from consecutive text blocks with a paragraph break', async () => {
    const client = fakeClient([
      {
        events: [
          { type: 'content_block_start', content_block: { type: 'text' } },
          { type: 'content_block_delta', delta: { type: 'text_delta', text: 'First thought.' } },
          { type: 'content_block_start', content_block: { type: 'text' } },
          { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Second thought.' } },
        ],
        final: { stop_reason: 'end_turn', content: [], usage: {} },
      },
    ]);
    const result = await runToolLoop({
      client,
      system: 's',
      messages: [{ role: 'user', content: 'hi' }],
      tools: [],
      toolEnv: { ctx: CTX },
    });
    assert.equal(result.finalText, 'First thought.\n\nSecond thought.');
  });

  it('passes effort through to output_config when set', async () => {
    const client = fakeClient([
      { events: [], final: { stop_reason: 'end_turn', content: [], usage: {} } },
    ]);
    await runToolLoop({
      client,
      system: 's',
      messages: [{ role: 'user', content: 'hi' }],
      tools: [],
      toolEnv: { ctx: CTX },
      effort: 'low',
    });
    assert.deepEqual(client.requests[0].output_config, { effort: 'low' });
  });

  it('surfaces proposals from tool results', async () => {
    const client = fakeClient([
      {
        events: [],
        final: {
          stop_reason: 'tool_use',
          content: [{ type: 'tool_use', id: 'tu-2', name: 'propose_itinerary_change', input: { action: 'add_note', dayNumber: 1, note: 'Pack light.' } }],
          usage: {},
        },
      },
      {
        events: [{ type: 'content_block_delta', delta: { type: 'text_delta', text: 'Ready to apply.' } }],
        final: { stop_reason: 'end_turn', content: [], usage: {} },
      },
    ]);
    const events = [];
    const result = await runToolLoop({
      client,
      system: 's',
      messages: [{ role: 'user', content: 'add a note' }],
      tools: AGENT_TOOLS,
      toolEnv: { ctx: CTX, trip: { days: [{ day_number: 1, city: 'paris', date: '2026-06-19' }] } },
      onEvent: (type, data) => events.push({ type, ...data }),
    });
    assert.ok(result.pendingProposal);
    assert.equal(result.pendingProposal.status, 'pending');
    assert.ok(events.some((e) => e.type === 'proposal'));
  });
});
