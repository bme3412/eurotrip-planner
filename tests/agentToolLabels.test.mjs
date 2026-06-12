import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { toolCallLabel, toolResultSummary } from '@/lib/concierge/agentToolsThread';

const CTX = {
  days: [
    { dayNumber: 1, cityName: 'Paris' },
    { dayNumber: 3, cityName: 'Kraków' },
  ],
};

describe('toolCallLabel', () => {
  it('names the day and city when known', () => {
    assert.equal(toolCallLabel('get_day_details', { dayNumber: 3 }, CTX), 'Looking at Day 3 — Kraków');
    assert.equal(toolCallLabel('get_weather', { dayNumber: 1 }, CTX), 'Checking the weather for Day 1 in Paris');
    assert.equal(toolCallLabel('check_hours', { dayNumber: 3 }, CTX), 'Checking opening hours for Day 3 in Kraków');
  });

  it('mentions the specific stop for targeted checks and proposals', () => {
    assert.equal(
      toolCallLabel('check_hours', { dayNumber: 1, activityName: 'Louvre' }, CTX),
      "Checking Louvre's hours for Day 1 in Paris"
    );
    assert.equal(
      toolCallLabel('propose_itinerary_change', { dayNumber: 1, activityName: 'Louvre' }, CTX),
      'Drafting a change for Louvre on Day 1'
    );
  });

  it('degrades gracefully without a day or ctx', () => {
    assert.equal(toolCallLabel('get_day_details', {}, null), 'Looking at the itinerary');
    assert.equal(toolCallLabel('remember', {}, null), 'Noting that down');
    assert.equal(toolCallLabel('some_future_tool', {}, null), 'Using some future tool');
  });
});

describe('toolResultSummary', () => {
  it('summarizes day details', () => {
    assert.equal(
      toolResultSummary('get_day_details', { schedule: [{ time: '09:30' }, {}], isTravelDay: false }),
      '2 stops · first at 09:30'
    );
    assert.equal(toolResultSummary('get_day_details', { schedule: [], isTravelDay: true }), '0 stops · travel day');
  });

  it('summarizes weather', () => {
    assert.equal(
      toolResultSummary('get_weather', { highC: 23.6, lowC: 12.2, rainDays: 6 }),
      'High 24°, low 12° · 6 rainy days that month'
    );
  });

  it('summarizes hours: all clear', () => {
    const result = { stops: [{ name: 'A', status: 'ok' }, { name: 'B', status: 'ok' }] };
    assert.equal(toolResultSummary('check_hours', result), 'All 2 stops open as planned');
  });

  it('summarizes hours: issues called out by name', () => {
    const result = {
      stops: [
        { name: 'Wawel Castle', status: 'closed' },
        { name: 'Schindler Museum', status: 'opens_later', opensAt: '10:00' },
        { name: 'Rynek', status: 'ok' },
      ],
    };
    assert.equal(
      toolResultSummary('check_hours', result),
      'Wawel Castle: closed that day · Schindler Museum: opens 10:00'
    );
  });

  it('summarizes hours: partial verifiability', () => {
    const result = { stops: [{ name: 'A', status: 'unknown' }, { name: 'B', status: 'ok' }] };
    assert.equal(toolResultSummary('check_hours', result), '1 of 2 stops open as planned');
  });

  it('passes through errors and notes', () => {
    assert.equal(toolResultSummary('get_weather', { error: 'No day 9 on this trip.' }), 'No day 9 on this trip.');
    assert.equal(toolResultSummary('check_hours', { note: 'Hours unavailable.' }), 'Hours unavailable.');
  });

  it('uses the proposal diff as the summary', () => {
    assert.equal(
      toolResultSummary('propose_itinerary_change', { ok: true, proposal: { diff: 'Move Louvre to 10:00' } }),
      'Move Louvre to 10:00'
    );
  });
});
