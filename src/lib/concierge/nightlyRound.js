// Olivier's nightly rounds — the agentic evening beat. Instead of a one-shot
// prose call, the agent works through tomorrow with real tools (opening hours
// per stop, weather, the day's facts, the travel leg on city-change days),
// then writes the evening brief — attaching the obvious fix as an Apply/Skip
// proposal when a check finds a problem. The working trace persists with the
// beat so the traveler can expand "what Olivier checked tonight".
//
// Shares the streaming tool loop with chat turns (agentRuntime.runToolLoop),
// so a manual trigger renders the same live thinking/tool-chip experience.

import { getAnthropicClient } from '@/lib/llm/clients';
import { buildConciergeContext } from './buildContext';
import { resolvePersona, detectHandoff, PERSONA_GUARDRAILS } from './personas';
import { currentDayNumber, itinerarySketch } from './agentPrompt';
import { AGENT_TOOLS } from './agentToolsThread';
import { runToolLoop } from './agentRuntime';
import { createTraceRecorder } from './agentTrace';
import { fetchPlaceHours } from './placesFetch';
import { getOrCreateThread, appendThreadMessage } from './thread';
import { loadMemories, formatMemoryDigest } from './memories';

const ROUND_TOOL_NAMES = ['get_day_details', 'get_weather', 'check_hours', 'propose_itinerary_change'];
const ROUND_TOOLS = AGENT_TOOLS.filter((t) => ROUND_TOOL_NAMES.includes(t.name));
const MAX_ROUNDS = 8; // multi-stop hours checks need headroom
const MAX_TOKENS = 6000;

/**
 * Deterministic push line: the brief's first sentence, ≤90 chars. Pure.
 */
export function pushLineFrom(body, max = 90) {
  const text = (body || '').trim().replace(/\s+/g, ' ');
  if (!text) return null;
  const m = text.match(/^[^.!?]*[.!?]/);
  let line = (m ? m[0] : text).trim();
  if (line.length > max) line = `${line.slice(0, max - 1).trimEnd()}…`;
  return line;
}

/**
 * Which day the round should cover when none is given: the day AFTER the
 * current trip day (the evening brief is about tomorrow); before the trip
 * starts — or outside it — the first real day. Pure.
 */
export function resolveRoundDay(ctx, todayIso) {
  const real = (ctx.days || []).filter((d) => !d.isTravelDay);
  if (!real.length) return null;
  const dayNum = currentDayNumber(ctx, todayIso);
  if (!dayNum) return real[0].dayNumber; // 0 (not started) or null (outside)
  const next = real.find((d) => d.dayNumber > dayNum);
  return next ? next.dayNumber : real[real.length - 1].dayNumber;
}

/** System prompt for the round — marching orders + grounded facts. Pure. */
export function buildNightlyRoundPrompt({ ctx, d, persona, handoff, memoryDigest = null }) {
  const personaBlock =
    persona.id === 'olivier'
      ? 'You are Olivier, the traveler’s personal travel agent — a Parisian with a trusted local friend in every city. Warm, specific, opinionated, quietly knowing. No emoji.'
      : `You are ${persona.name}, a local based in ${persona.city}, covering ${persona.country} as part of Olivier the travel agent’s trusted network — the traveler’s person on the ground here. ${persona.voice} No emoji.`;

  const handoffBlock = handoff
    ? `\nHANDOFF: the day after, the traveler moves to ${handoff.toCity} — ${handoff.toPersona.name}'s territory. Close the brief by handing them over warmly by name, one line, no ceremony.`
    : '';

  const p = ctx.personalization || {};
  const act = d.firstActivity;

  return `${personaBlock}
${PERSONA_GUARDRAILS}

It is the evening before Day ${d.dayNumber} of the trip. Do your rounds for tomorrow, THEN write the traveler's evening brief.

YOUR ROUNDS — use your tools before writing, roughly in this order:
1. get_day_details for Day ${d.dayNumber} — know tomorrow cold.
2. check_hours for Day ${d.dayNumber} — verify the stops are actually open at their planned times. Never assert a place is open without checking.
3. get_weather for Day ${d.dayNumber}.
4. If tomorrow involves arriving from another city, a travel leg, or a handoff, get_day_details for the adjacent day so the logistics are right.

THEN THE BRIEF — your final message goes straight to the traveler as tonight's text:
- 2 to 4 sentences in your voice setting up tomorrow: the first stop, when to leave, the shape of the day.
- One small, specific local delight (a named café, a quiet corner, the light somewhere).
- If your checks found a real problem (a stop closed tomorrow, or opening later than planned), say it plainly and use propose_itinerary_change ONCE with the obvious fix — they get an Apply button, so phrase it as ready to apply, never as done. If everything checks out, don't mention the checking.
- Fold the weather in only if it changes how the day should be played.
- No emoji, no headers, no bullet lists — it reads like a message from someone who lives there.

TOMORROW (Day ${d.dayNumber})
City: ${d.cityName}
Date: ${d.dateLabel || d.date || 'a day on the trip'}
Theme: ${d.theme || 'open exploration'}
First activity: ${act ? `${act.name}${act.startTime ? ` at ${act.startTime}` : ''}${act.neighborhood ? ` (${act.neighborhood})` : ''}` : 'not specified'}
Suggested depart-by: ${d.departBy || 'n/a'}
Hotel: ${d.hotelName || p.hotelName || 'not specified'}
${d.arrival ? `They arrive${d.arrival.fromCity ? ` from ${d.arrival.fromCity}` : ''} this day — frame it around the arrival.` : ''}
${d.nextCity && d.nextCity !== d.cityName ? `The day after, they move to ${d.nextCity}.` : d.nextTheme ? `The day after's theme: ${d.nextTheme}.` : ''}
Traveler pace: ${p.pace || 'unspecified'}; interests: ${p.interests?.join(', ') || 'varied'}.

THE FULL ROUTE (for orientation)
${itinerarySketch(ctx)}${handoffBlock}
${memoryDigest ? `\nWHAT YOU REMEMBER ABOUT THEM\n${memoryDigest}` : ''}`;
}

/**
 * Run the nightly round for one trip-day: tool loop → brief → thread post.
 * The thread message is idempotent on (thread, day, kind='evening_brief'),
 * so re-runs (including the manual "Preview tonight's brief") refresh in place.
 *
 * @param {object} trip       normalized trip (getTripWithDetails)
 * @param {number|null} dayNumber  null → resolveRoundDay (tomorrow / first day)
 * @param {object} opts       { supabase, onEvent, channel }
 * @returns {Promise<{ ok:true, dayNumber, cityName, dateLabel, body, pushLine, proposal, trace, threadMessageId } | { ok:false, reason }>}
 */
export async function runNightlyRound(trip, dayNumber = null, { supabase = null, onEvent = () => {}, channel = 'app' } = {}) {
  const client = getAnthropicClient();
  if (!client) return { ok: false, reason: 'agent_unconfigured' };

  const fullCtx = buildConciergeContext(trip);
  const resolvedDay = Number.isFinite(dayNumber) ? dayNumber : resolveRoundDay(fullCtx, new Date().toISOString());
  if (resolvedDay == null) return { ok: false, reason: 'no_day' };

  const ctx = buildConciergeContext(trip, { dayNumber: resolvedDay });
  const d = ctx.selectedDay;
  if (!d) return { ok: false, reason: 'no_day' };

  const persona = resolvePersona({ country: d.country, city: d.city });
  const handoff = detectHandoff(d);

  let memoryDigest = null;
  if (supabase && trip.user_id) {
    try {
      memoryDigest = formatMemoryDigest(await loadMemories(supabase, { userId: trip.user_id, tripId: trip.id }));
    } catch { /* memory is garnish */ }
  }

  const system = buildNightlyRoundPrompt({ ctx, d, persona, handoff, memoryDigest });
  const toolEnv = { ctx, trip, supabase, userId: trip.user_id, tripId: trip.id, fetchPlace: fetchPlaceHours };
  const recorder = createTraceRecorder();
  const startedAt = Date.now();

  let result;
  try {
    result = await runToolLoop({
      client,
      system,
      messages: [{ role: 'user', content: `Run your evening rounds for Day ${d.dayNumber} (${d.cityName}).` }],
      tools: ROUND_TOOLS,
      toolEnv,
      maxRounds: MAX_ROUNDS,
      maxTokens: MAX_TOKENS,
      onEvent,
      recorder,
      usage: { feature: 'nightly_round', meta: { tripId: trip.id, dayNumber: d.dayNumber, channel } },
    });
  } catch (err) {
    console.error('[concierge/nightly] round failed:', err?.message);
    return { ok: false, reason: 'generation_failed' };
  }

  const body = result.finalText;
  if (!body) return { ok: false, reason: 'empty' };
  const trace = recorder.finalize(Date.now() - startedAt);
  const proposal = result.pendingProposal;

  // Post the beat into the thread (canonical conversation). Best-effort: the
  // caller's notification row stays the durable delivery record.
  let threadMessageId = null;
  if (supabase && trip.user_id) {
    try {
      const { thread } = await getOrCreateThread(supabase, {
        tripId: trip.id,
        userId: trip.user_id,
        userEmail: trip.user_email,
      });
      if (thread) {
        const { message } = await appendThreadMessage(supabase, {
          threadId: thread.id,
          userId: trip.user_id,
          userEmail: trip.user_email,
          role: 'olivier',
          kind: 'evening_brief',
          dayNumber: d.dayNumber,
          body,
          meta: {
            cityName: d.cityName,
            dateLabel: d.dateLabel,
            nightlyRound: true,
            ...(trace ? { trace } : {}),
            ...(proposal ? { proposal } : {}),
          },
        });
        threadMessageId = message?.id || null;
      }
    } catch (err) {
      console.error('[concierge/nightly] thread append failed:', err?.message);
    }
  }

  const pushLine = pushLineFrom(body);

  return {
    ok: true,
    dayNumber: d.dayNumber,
    cityName: d.cityName,
    dateLabel: d.dateLabel,
    body,
    pushLine,
    proposal,
    trace,
    threadMessageId,
    // Email/inbox-compatible day shape (the templates read briefs/schedule/departBy).
    day: {
      dayNumber: d.dayNumber,
      dateLabel: d.dateLabel,
      cityName: d.cityName,
      theme: d.theme ?? null,
      departBy: d.departBy ?? null,
      schedule: d.schedule ?? [],
      briefs: { eveningBrief: { body } },
      pushLine,
    },
  };
}
