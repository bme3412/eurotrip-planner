import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createTraceRecorder, TRACE_LIMITS } from '@/lib/concierge/agentTrace';

describe('createTraceRecorder', () => {
  it('merges consecutive thinking deltas into one step per block', () => {
    const r = createTraceRecorder();
    r.thinkingBlockStart();
    r.thinking('Checking the ');
    r.thinking('schedule first.');
    const trace = r.finalize(120);
    assert.equal(trace.steps.length, 1);
    assert.deepEqual(trace.steps[0], { t: 'thinking', text: 'Checking the schedule first.' });
    assert.equal(trace.ms, 120);
    assert.equal(trace.v, 1);
  });

  it('starts a new step for a new thinking block', () => {
    const r = createTraceRecorder();
    r.thinkingBlockStart();
    r.thinking('First block.');
    r.thinkingBlockStart();
    r.thinking('Second block.');
    const trace = r.finalize();
    assert.equal(trace.steps.length, 2);
    assert.equal(trace.steps[1].text, 'Second block.');
  });

  it('caps thinking text at the limit', () => {
    const r = createTraceRecorder();
    r.thinkingBlockStart();
    r.thinking('x'.repeat(1000));
    const trace = r.finalize();
    assert.equal(trace.steps[0].text.length, TRACE_LIMITS.maxThinkingChars);
  });

  it('records tool calls and resolves the matching unresolved step', () => {
    const r = createTraceRecorder();
    r.toolCall({ name: 'check_hours', label: 'Checking hours for Day 2' });
    r.toolCall({ name: 'get_weather', label: 'Checking the weather' });
    r.toolResult('get_weather', { ok: true, summary: 'High 24°' });
    r.toolResult('check_hours', { ok: false, summary: 'quota' });
    const trace = r.finalize();
    assert.equal(trace.steps[0].ok, false);
    assert.equal(trace.steps[0].summary, 'quota');
    assert.equal(trace.steps[1].ok, true);
    assert.equal(trace.steps[1].summary, 'High 24°');
  });

  it('a tool call closes the open thinking block', () => {
    const r = createTraceRecorder();
    r.thinkingBlockStart();
    r.thinking('Before tool.');
    r.toolCall({ name: 'get_weather', label: 'Weather' });
    r.thinking('After tool — new implicit block.');
    const trace = r.finalize();
    assert.equal(trace.steps.length, 3);
    assert.equal(trace.steps[0].t, 'thinking');
    assert.equal(trace.steps[1].t, 'tool');
    assert.equal(trace.steps[2].t, 'thinking');
  });

  it('drops empty thinking steps and returns null for an empty turn', () => {
    const r = createTraceRecorder();
    r.thinkingBlockStart(); // no text ever arrives
    assert.equal(r.finalize(), null);
  });

  it('caps total steps, keeping the first ones', () => {
    const r = createTraceRecorder();
    for (let i = 0; i < 20; i += 1) r.toolCall({ name: `t${i}`, label: `Tool ${i}` });
    const trace = r.finalize();
    assert.equal(trace.steps.length, TRACE_LIMITS.maxSteps);
    assert.equal(trace.steps[0].label, 'Tool 0');
  });

  it('truncates long summaries', () => {
    const r = createTraceRecorder();
    r.toolCall({ name: 'a', label: 'A' });
    r.toolResult('a', { ok: true, summary: 'y'.repeat(500) });
    const trace = r.finalize();
    assert.equal(trace.steps[0].summary.length, TRACE_LIMITS.maxSummaryChars);
  });
});
