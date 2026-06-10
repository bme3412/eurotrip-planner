import { getAnthropicClient } from '@/lib/llm/clients';
import { resolvePersona, PERSONA_GUARDRAILS } from '@/lib/concierge/personas';
import { logLlmUsage } from '@/lib/llm/usageLog';

// Generates Olivier's proactive "the day changed" alert from a REAL detected
// signal (unlike the generic reactive example in the daily brief). Grounded in the
// day's actual schedule + the materiality signal. Falls back to deterministic
// prose if the LLM is unconfigured or fails.

const MODEL = 'claude-sonnet-4-6';
const LLM_TIMEOUT_MS = 14000;

const TOOL = {
  name: 'reactive_alert',
  description: "The travel agent's short proactive heads-up about a real change to tomorrow.",
  input_schema: {
    type: 'object',
    properties: {
      trigger: { type: 'string', description: 'Short label of what changed, e.g. "Rain moving into your afternoon".' },
      body: { type: 'string', description: '1-2 sentences in your voice flagging it, specific to the day. No emoji.' },
      action: { type: 'string', description: 'The concrete swap/suggestion you propose (move an indoor stop up, bring an umbrella, etc.).' },
    },
    required: ['trigger', 'body', 'action'],
  },
};

function fallbackReactive(signal, day) {
  const where = signal?.atActivity ? ` around ${signal.atActivity}` : '';
  const t = signal?.atTime ? ` (${signal.atTime})` : '';
  return {
    trigger: signal?.kind === 'severe' ? 'Rough weather moving in' : `Rain likely in your ${signal?.window || 'afternoon'}`,
    body: `Tomorrow's ${signal?.window || 'afternoon'} is turning wet${where}${t} — about ${signal?.pop ?? 60}% chance, more than the day was shaping up for.`,
    action: 'I\'d pull an indoor stop forward and push the open-air stretch to a clearer window. Want me to reshuffle?',
    source: 'fallback',
  };
}

/**
 * @param {object} ctx   selectedDay-like facts: { cityName, dateLabel, schedule, country, city }
 * @param {object} signal materiality signal from assessWeatherChange
 */
export async function generateReactiveAlert(ctx, signal) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return fallbackReactive(signal, ctx);

  const scheduleLine = (ctx.schedule || [])
    .map((s) => `${s.time ? s.time + ' ' : ''}${s.name}`)
    .join('; ') || 'no detailed schedule';

  const persona = resolvePersona({ country: ctx.country, city: ctx.city });
  const personaBlock =
    persona.id === 'olivier'
      ? `You are Olivier, the traveler's personal travel agent — a Parisian with a trusted local friend in every city. Warm, specific, opinionated, quietly knowing.`
      : `You are ${persona.name}, a local based in ${persona.city}, covering ${persona.country} as part of Olivier the travel agent's trusted network — the traveler's person on the ground here. ${persona.voice}`;

  const system = `${personaBlock} No emoji. You only message when something genuinely changed.
${PERSONA_GUARDRAILS}

A real forecast change has come in for ${ctx.cityName} on ${ctx.dateLabel || 'tomorrow'}:
- ${signal.kind === 'severe' ? signal.condition + ' expected' : 'Rain'} in the ${signal.window}, ~${signal.pop}% chance${signal.description ? ` (${signal.description})` : ''}.
- It would catch their plan${signal.atActivity ? ` around ${signal.atActivity}${signal.atTime ? ` at ${signal.atTime}` : ''}` : ''}.
Their day: ${scheduleLine}.

Write a short proactive heads-up: name what changed, and propose ONE concrete reshuffle (move an indoor stop into the wet window, swap an outdoor stretch to a clearer time, etc.) grounded in their actual schedule. Don't be alarmist.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
  const client = getAnthropicClient();
  try {
    const resp = await client.messages.create(
      {
        model: MODEL,
        max_tokens: 400,
        system,
        tools: [TOOL],
        tool_choice: { type: 'tool', name: 'reactive_alert' },
        messages: [{ role: 'user', content: `Draft the heads-up for ${ctx.cityName}.` }],
      },
      { signal: controller.signal }
    );
    logLlmUsage({
      feature: 'concierge_reactive',
      model: MODEL,
      usage: resp?.usage,
      meta: { city: ctx.cityName ?? null },
    });
    const toolUse = resp?.content?.find((c) => c.type === 'tool_use');
    if (!toolUse?.input?.body) return fallbackReactive(signal, ctx);
    return { ...toolUse.input, source: 'llm' };
  } catch (err) {
    console.error('[concierge/generateReactive] failed:', err?.message);
    return fallbackReactive(signal, ctx);
  } finally {
    clearTimeout(timeout);
  }
}
