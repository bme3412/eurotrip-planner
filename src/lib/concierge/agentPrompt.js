// System prompt + history assembly for the thread agent. Pure module
// (plain-Node testable): the route injects context, memories, and the clock.

import { resolvePersona, PERSONA_GUARDRAILS } from './personas';

/**
 * Which trip day "now" falls on. 0 → before the trip, null → after/unknown.
 * Dates compare as YYYY-MM-DD strings in the trip's own calendar.
 */
export function currentDayNumber(ctx, todayIso) {
  if (!todayIso || !Array.isArray(ctx?.days) || !ctx.days.length) return null;
  const today = todayIso.slice(0, 10);
  const first = ctx.days[0]?.date;
  const last = ctx.days[ctx.days.length - 1]?.date;
  if (first && today < first) return 0;
  if (last && today > last) return null;
  const hit = ctx.days.find((d) => d.date === today);
  return hit ? hit.dayNumber : null;
}

/** The compact itinerary sketch every turn is grounded in. */
export function itinerarySketch(ctx, maxDays = 16) {
  return (ctx.days || [])
    .slice(0, maxDays)
    .map((d) => {
      const tag = d.isTravelDay
        ? `travel day${d.cityName ? ` → ${d.cityName}` : ''}`
        : d.firstActivity?.name
          ? `${d.firstActivity.name}${d.firstActivity.startTime ? ` @ ${d.firstActivity.startTime}` : ''}`
          : d.theme || 'open';
      return `Day ${d.dayNumber} (${d.dateLabel || d.date || '?'}) · ${d.cityName}: ${tag}`;
    })
    .join('\n');
}

/**
 * Build the agent system prompt.
 * @param {object} args.ctx          buildConciergeContext output
 * @param {string|null} args.memoryDigest  formatted "- fact" lines
 * @param {string} args.todayIso     ISO date of "now" (injected for testability)
 */
export function buildAgentSystemPrompt({ ctx, memoryDigest = null, todayIso }) {
  const dayNum = currentDayNumber(ctx, todayIso);
  const activeDay =
    (dayNum && ctx.days.find((d) => d.dayNumber === dayNum)) || ctx.days.find((d) => !d.isTravelDay) || null;
  const persona = resolvePersona({ country: activeDay?.country, city: activeDay?.city });

  const personaBlock =
    persona.id === 'olivier'
      ? 'You are Olivier, the traveler’s personal travel agent — a Parisian with a trusted local friend in every city. Warm, specific, opinionated, quietly knowing. No emoji.'
      : `You are ${persona.name}, a local based in ${persona.city}, covering ${persona.country} as part of Olivier the travel agent’s trusted network — the traveler’s person on the ground here. ${persona.voice} No emoji.`;

  const temporal =
    dayNum === 0
      ? 'The trip has NOT started yet — you are helping them get ready.'
      : dayNum
        ? `Today is Day ${dayNum} of the trip.`
        : 'The trip dates are not current — answer as their agent planning ahead.';

  const p = ctx.personalization || {};
  return `${personaBlock}
${PERSONA_GUARDRAILS}

You are texting with your traveler in a persistent thread. Keep replies short (1–4 sentences), like a message, not an essay. Use your tools to check the itinerary, weather, or directions before asserting facts — never invent venue names, times, or openings you weren’t given. When the traveler states a durable preference or constraint, store it with the remember tool (scope "always" for things true beyond this trip).

When they want the plan CHANGED — move a stop, skip something, swap days, pin a note — use propose_itinerary_change. They get an Apply button; nothing changes until they tap it, so phrase it as "ready to apply", never as done. One proposal per message.

You only discuss this trip and the places on it. If asked something unrelated, deflect in one charming sentence and bring it back to the trip.

THE TRIP
Route: ${ctx.meta.cities.join(' → ') || ctx.meta.cityName} · ${ctx.meta.totalRealDays} days.
${temporal}
Pace: ${p.pace || 'unspecified'}; interests: ${p.interests?.join(', ') || 'varied'}.
${p.hotelName ? `Hotel (first city): ${p.hotelName}.` : ''}
Itinerary:
${itinerarySketch(ctx)}
${memoryDigest ? `\nWHAT YOU REMEMBER ABOUT THEM\n${memoryDigest}` : ''}`;
}

/**
 * Thread rows → Anthropic messages. Beats become assistant turns (tagged so
 * the model knows it already "sent" them); consecutive same-role turns are
 * merged (the API requires alternation).
 */
export function threadToMessages(rows, { limit = 20 } = {}) {
  const recent = (rows || []).slice(-limit);
  const out = [];
  for (const m of recent) {
    const role = m.role === 'user' ? 'user' : 'assistant';
    let text = (m.body || '').trim();
    if (!text) continue;
    if (m.kind && m.kind !== 'chat' && role === 'assistant') {
      text = `[${m.kind.replace(/_/g, ' ')}${m.day_number ? ` · day ${m.day_number}` : ''}] ${text}`;
    }
    const prev = out[out.length - 1];
    if (prev && prev.role === role) {
      prev.content += `\n\n${text}`;
    } else {
      out.push({ role, content: text });
    }
  }
  // The API requires the first message to be from the user.
  while (out.length && out[0].role !== 'user') out.shift();
  return out;
}
