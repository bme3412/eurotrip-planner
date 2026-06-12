import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parsePartialJson } from '@/lib/concierge/partialJson';

describe('parsePartialJson', () => {
  it('parses complete JSON directly', () => {
    assert.deepEqual(parsePartialJson('{"a": 1, "b": [2, 3]}'), { a: 1, b: [2, 3] });
  });

  it('returns null for empty/non-string input', () => {
    assert.equal(parsePartialJson(''), null);
    assert.equal(parsePartialJson(null), null);
    assert.equal(parsePartialJson(undefined), null);
  });

  it('repairs a string cut mid-sentence', () => {
    const out = parsePartialJson('{"routeNote": "An 18-min walk over Pont des');
    assert.equal(out.routeNote, 'An 18-min walk over Pont des');
  });

  it('repairs nested objects cut mid-value', () => {
    const out = parsePartialJson('{"briefs": {"eveningBrief": {"body": "Tomorrow opens with Sainte-Chapelle');
    assert.equal(out.briefs.eveningBrief.body, 'Tomorrow opens with Sainte-Chapelle');
  });

  it('repairs a value cut right after the colon', () => {
    const out = parsePartialJson('{"routeNote": "done", "pushLine":');
    assert.equal(out.routeNote, 'done');
    assert.equal(out.pushLine, null);
  });

  it('repairs a trailing comma', () => {
    const out = parsePartialJson('{"a": 1,');
    assert.deepEqual(out, { a: 1 });
  });

  it('handles a dangling escape at the cut point', () => {
    const out = parsePartialJson('{"body": "He said \\"bonjour\\" and \\');
    assert.equal(out.body, 'He said "bonjour" and ');
  });

  it('preserves escaped quotes inside strings', () => {
    const out = parsePartialJson('{"body": "the \\"kouign-amann\\" at');
    assert.equal(out.body, 'the "kouign-amann" at');
  });

  it('repairs arrays cut mid-element', () => {
    const out = parsePartialJson('{"items": ["one", "tw');
    assert.deepEqual(out.items, ['one', 'tw']);
  });

  it('returns null (not garbage) when a key name is cut', () => {
    // `{"briefs": {"evening` cannot be repaired into valid JSON — the caller
    // keeps its previous good parse.
    assert.equal(parsePartialJson('{"briefs": {"evening'), null);
  });

  it('handles braces inside string values', () => {
    const out = parsePartialJson('{"body": "use {curly} braces", "next": "ok');
    assert.equal(out.body, 'use {curly} braces');
    assert.equal(out.next, 'ok');
  });
});
