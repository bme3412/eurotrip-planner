import { getAnthropicClient } from '@/lib/llm/clients';
import { getCityVisitCalendar } from '@/lib/data-utils';
import { extractWeather } from '@/app/itineraries/[tripId]/_lib/buildPlan';
import { buildConciergeContext, weatherConditions, metaLine } from '@/lib/concierge/buildContext';
import { resolvePersona, detectHandoff, PERSONAS_VERSION, PERSONA_GUARDRAILS } from '@/lib/concierge/personas';
import { getCachedSuggestions, setCachedSuggestions } from '@/lib/cache/suggestions';
import { logLlmUsage } from '@/lib/llm/usageLog';

// Core concierge-day generator — extracted from the brief route so both the
// HTTP route AND background jobs (the notification send pipeline) can produce a
// day's content without a request. Code owns the facts; Claude owns the voice.
// Cached per (trip, day, trip-version) in Redis.

const MODEL = 'claude-sonnet-4-6';
const LLM_TIMEOUT_MS = 32000;
const CACHE_TTL_SECONDS = 604800;

const TOOL = {
  name: 'concierge_day',
  description: "The travel agent's voice for one day — three scheduled messages, a route note, and one reactive alert.",
  input_schema: {
    type: 'object',
    properties: {
      routeNote: { type: 'string', description: 'One short line on how to make the first leg, e.g. "18-min walk over Pont des Arts — lovely in morning light".' },
      pushLine: { type: 'string', description: 'A single glanceable lock-screen notification line (<=90 chars), distinct from the evening brief body. The depart-by hook, e.g. "Tomorrow: the Louvre at 10am. Leave by 9:25 — I\'ll wake you." No emoji.' },
      signoff: { type: 'string', description: 'A short, warm sign-off in your voice for the wind-down, e.g. "Sleep easy — <your name>." 3-6 words.' },
      sampleAsk: {
        type: 'object',
        description: 'One strong example of a question the traveler might ask and your answer, grounded in this trip.',
        properties: {
          question: { type: 'string', description: 'A natural question a traveler would ask, 4-9 words.' },
          answer: { type: 'string', description: 'Your answer, 2-3 sentences, specific and opinionated.' },
        },
        required: ['question', 'answer'],
      },
      briefs: {
        type: 'object',
        properties: {
          eveningBrief: {
            type: 'object',
            description: '~8pm the night before.',
            properties: {
              body: { type: 'string', description: '2-3 sentences in your voice setting up tomorrow.' },
              delight: { type: 'string', description: 'One small, specific local delight (a named bakery, a quiet courtyard).' },
              decision: { type: 'string', description: 'Optional one-line thing to decide before bed (a reservation). Empty if none.' },
            },
            required: ['body', 'delight'],
          },
          morningWakeup: {
            type: 'object',
            description: '60-90 min before the first activity.',
            properties: { body: { type: 'string', description: '"Good morning." + live-conditions feel + a timing nudge. 2 sentences.' } },
            required: ['body'],
          },
          windDown: {
            type: 'object',
            description: '~9pm, end of day.',
            properties: {
              body: { type: 'string', description: 'A quiet 1-2 sentence acknowledgment of the day.' },
              tomorrowTease: { type: 'string', description: 'One line teasing tomorrow.' },
            },
            required: ['body', 'tomorrowTease'],
          },
        },
        required: ['eveningBrief', 'morningWakeup', 'windDown'],
      },
      reactive: {
        type: 'object',
        description: 'A realistic mid-day disruption you would catch, and what you propose.',
        properties: {
          trigger: { type: 'string', description: 'Short label of what changed, e.g. "Rain moving into your 3pm window".' },
          body: { type: 'string', description: '1-2 sentences in your voice flagging it.' },
          action: { type: 'string', description: 'The concrete swap/suggestion you offer.' },
        },
        required: ['trigger', 'body', 'action'],
      },
    },
    required: ['briefs', 'reactive', 'pushLine', 'signoff', 'sampleAsk'],
  },
};

function monthIndexOf(dateStr, fallback) {
  const d = dateStr ? new Date(dateStr) : fallback ? new Date(fallback) : null;
  return d && !Number.isNaN(d.getTime()) ? d.getUTCMonth() : 5;
}

/** Deterministic prose fallback when the LLM is unavailable. */
function fallbackProse(ctx, persona, handoff) {
  const d = ctx.selectedDay;
  const act = d?.firstActivity;
  const where = act?.neighborhood ? ` in ${act.neighborhood}` : '';
  const at = act?.startTime ? ` at ${act.startTime}` : '';
  const leave = d?.departBy ? ` I'd head out around ${d.departBy}.` : '';
  const tomorrowTease = handoff
    ? `Tomorrow we shift to ${handoff.toCity} — you're in ${handoff.toPersona.name}'s hands from here.`
    : d?.nextCity && d.nextCity !== d.cityName
      ? `Tomorrow we shift to ${d.nextCity}.`
      : 'Tomorrow has its own rhythm — more soon.';
  return {
    routeNote: act ? `An easy approach to ${act.name} — take the scenic way and let the morning open up.` : 'A gentle, unhurried start.',
    pushLine: act
      ? `Tomorrow: ${act.name}${at}.${d?.departBy ? ` Leave by ${d.departBy}.` : ''} I'll wake you in time.`
      : `Tomorrow's your first full day in ${d?.cityName || 'the city'}. I'll have it ready.`,
    signoff: `Sleep easy ${persona.signoffStyle}`,
    sampleAsk: {
      question: 'What should I not miss?',
      answer: act
        ? `Give ${act.name} the unhurried morning it deserves — it's the heart of the day. Everything after can flex; that one's worth arriving fresh for.`
        : `Lean into ${d?.cityName || 'the city'} on foot the first morning — the trip finds its rhythm once you've wandered a little.`,
    },
    briefs: {
      eveningBrief: {
        body: act
          ? `Tomorrow opens with ${act.name}${where}${at}.${leave} Rest up — ${d.cityName} rewards fresh legs.`
          : `Tomorrow is your first full day in ${d?.cityName || 'the city'}. Rest up — I'll have it mapped for you.`,
        delight: 'There’s a good café on your corner that opens early if you want coffee on the way.',
        decision: '',
      },
      morningWakeup: {
        body: act
          ? `Good morning. Conditions are holding — ${act.name} is calmest early, so an unhurried start suits it.`
          : `Good morning from ${d?.cityName || 'the city'}. Conditions look settled; ease into the day.`,
      },
      windDown: {
        body: `That’s a wrap on ${d?.cityName || 'the day'}. You covered good ground.`,
        tomorrowTease,
      },
    },
    reactive: {
      trigger: 'Rain moving into your afternoon',
      body: 'A band of showers is creeping into your afternoon window — nothing dramatic, but enough to dampen an outdoor stretch.',
      action: 'I’d pull an indoor stop forward and push the open-air walk to tomorrow’s clearer skies. Want me to swap them?',
    },
    source: 'fallback',
  };
}

/**
 * Generate (or read from cache) the rich concierge `day` for a trip.
 * @param {object} trip - a trip from getTripWithDetails (with nested days)
 * @param {number|null} dayNumber - day to generate; null → first real day
 * @returns {Promise<object>} { meta, days, personalization, day, source, cached? }
 */
export async function generateConciergeDay(trip, dayNumber = null) {
  const ctx = buildConciergeContext(trip, { dayNumber });
  const d = ctx.selectedDay;

  // Who fronts this day, and whether tomorrow belongs to someone else.
  const persona = resolvePersona({ country: d?.country, city: d?.city });
  const handoff = detectHandoff(d);

  const ver = trip.updated_at ? new Date(trip.updated_at).getTime() : 0;
  const cacheKey = `concierge:brief:v3:${trip.id}:${d?.dayNumber ?? 'none'}:${ver}:p${PERSONAS_VERSION}:${persona.id}`;
  const hit = await getCachedSuggestions(cacheKey);
  if (hit?.data?.day) return { ...hit.data, cached: true };

  // Weather for the selected day's city + month (best-effort).
  let weather = null;
  try {
    const citySlug = d?.city || trip.city || 'paris';
    const cal = await getCityVisitCalendar(citySlug);
    weather = extractWeather(cal, d?.date || trip.start_date);
  } catch { /* non-fatal */ }

  const mIdx = monthIndexOf(d?.date, trip.start_date);
  const cond = weatherConditions(weather);
  const metaEvening = metaLine(weather, mIdx);
  const metaMorning = `${cond.emoji} ${cond.label} · metro running smoothly`;
  const metaWind = weather?.lowC != null ? `🌙 ${Math.round(weather.lowC)}° · gentle evening` : '🌙 gentle evening';
  const dayWeather = weather
    ? { highC: weather.highC, lowC: weather.lowC, sunrise: weather.sunrise, sunset: weather.sunset, conditions: cond }
    : { conditions: cond };

  const assemble = (prose) => ({
    meta: ctx.meta,
    days: ctx.days,
    personalization: ctx.personalization,
    day: {
      dayNumber: d?.dayNumber ?? null,
      dateLabel: d?.dateLabel ?? null,
      cityName: d?.cityName ?? ctx.meta.cityName,
      theme: d?.theme ?? null,
      firstActivity: d?.firstActivity ?? null,
      departBy: d?.departBy ?? null,
      schedule: d?.schedule ?? [],
      hotelName: d?.hotelName ?? null,
      arrival: d?.arrival ?? null,
      weather: dayWeather,
      persona: { id: persona.id, name: persona.name, initial: persona.initial, accent: persona.accent, intro: persona.intro },
      handoff: handoff
        ? {
            toCity: handoff.toCity,
            toPersona: {
              id: handoff.toPersona.id,
              name: handoff.toPersona.name,
              initial: handoff.toPersona.initial,
              accent: handoff.toPersona.accent,
              intro: handoff.toPersona.intro,
            },
          }
        : null,
      routeNote: prose.routeNote || null,
      pushLine: prose.pushLine || null,
      signoff: prose.signoff || null,
      sampleAsk: prose.sampleAsk || null,
      briefs: {
        eveningBrief: { ...prose.briefs.eveningBrief, meta: metaEvening },
        morningWakeup: { ...prose.briefs.morningWakeup, meta: metaMorning },
        windDown: { ...prose.briefs.windDown, meta: metaWind },
      },
      reactive: prose.reactive,
    },
    source: prose.source || 'llm',
  });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !d) return assemble(fallbackProse(ctx, persona, handoff));

  const p = ctx.personalization;
  const weatherLine = weather
    ? `High ~${weather.highC}°C, low ~${weather.lowC}°C, sunrise ${weather.sunrise}, sunset ${weather.sunset}, ~${weather.rainDays} rainy days this month (${cond.label}).`
    : 'No weather detail — do not invent specifics.';

  const personaBlock =
    persona.id === 'olivier'
      ? `You are Olivier, the traveler's personal travel agent — a Parisian with a trusted local friend in every city. Warm, specific, quietly knowing — the voice of someone who knows the place, not someone who Googled it.`
      : `You are ${persona.name}, a local based in ${persona.city}, covering ${persona.country} as part of Olivier the travel agent's trusted network. Olivier set up this trip; while the traveler is in ${persona.country}, you're their person on the ground. ${persona.voice}`;

  const handoffBlock = handoff
    ? `\nHANDOFF: tomorrow the traveler moves to ${handoff.toCity} — ${handoff.toPersona.name}'s territory. In the windDown's tomorrowTease, hand them over warmly by name (e.g. "…you're in ${handoff.toPersona.name}'s hands tomorrow"). One line, no ceremony.`
    : '';

  const system = `${personaBlock}
${PERSONA_GUARDRAILS}

Three tone rules, every line:
1. Specific over generic — name the thing ("the kouign-amann", a real street), never "a pastry".
2. Opinionated, not encyclopedic — recommend ONE thing, never a list.
3. Quietly knowing — an insider detail (the shorter entrance, the café off the tourist drag, the morning light on a bridge).

Never invent venue names or facts beyond what's given; you may add plausible local atmosphere (light, pace, a route). No emoji in any text. Keep each message to its stated length.

THE DAY (day ${d.dayNumber} of the trip)
City: ${d.cityName}
Date: ${d.dateLabel || 'a day on the trip'}
Theme: ${d.theme || 'open exploration'}
First activity: ${d.firstActivity ? `${d.firstActivity.name}${d.firstActivity.startTime ? ` at ${d.firstActivity.startTime}` : ''}${d.firstActivity.neighborhood ? ` (${d.firstActivity.neighborhood})` : ''}` : 'not specified — keep general'}
Suggested depart-by: ${d.departBy || 'n/a'}
The full day's stops (in order): ${d.schedule?.length ? d.schedule.map((s) => `${s.time ? s.time + ' ' : ''}${s.name}`).join('; ') : 'just the first activity'}
Hotel: ${d.hotelName || p.hotelName || 'not specified'}
${d.arrival ? `They land${d.arrival.fromCity ? ` from ${d.arrival.fromCity}` : ''} on this day — frame it around the arrival.` : ''}
Traveler pace: ${p.pace || 'unspecified'}; interests: ${p.interests?.join(', ') || 'varied'}.
${d.nextCity && d.nextCity !== d.cityName ? `Tomorrow they move to ${d.nextCity}.` : d.nextTheme ? `Tomorrow's theme: ${d.nextTheme}.` : ''}
Weather (monthly normal): ${weatherLine}${handoffBlock}

Write, all grounded in the stops above:
- the three messages (eveningBrief with one delight + optional decision; morningWakeup; windDown with a tomorrow tease)
- a routeNote for the first leg
- one realistic reactive alert (a disruption you'd catch mid-day and the swap you'd propose)
- pushLine: the glanceable lock-screen version of the evening brief (NOT a copy of the body)
- signoff: a short warm sign-off
- sampleAsk: one question this traveler would plausibly ask and your answer`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
  const client = getAnthropicClient();
  let resp;
  try {
    resp = await client.messages.create(
      {
        model: MODEL,
        max_tokens: 1500,
        system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
        tools: [TOOL],
        tool_choice: { type: 'tool', name: 'concierge_day' },
        messages: [{ role: 'user', content: `Write ${persona.name}'s day for ${d.cityName}, day ${d.dayNumber}.` }],
      },
      { signal: controller.signal }
    );
  } catch (err) {
    console.error('[concierge] LLM failed, using fallback:', err?.message);
    return assemble(fallbackProse(ctx, persona, handoff));
  } finally {
    clearTimeout(timeout);
  }

  logLlmUsage({
    feature: 'concierge_brief',
    model: MODEL,
    usage: resp?.usage,
    meta: { tripId: trip?.id ?? null, dayNumber: d.dayNumber ?? null },
  });

  const toolUse = resp?.content?.find((c) => c.type === 'tool_use');
  if (!toolUse?.input?.briefs) return assemble(fallbackProse(ctx, persona, handoff));

  const payload = assemble({ ...toolUse.input, source: 'llm' });
  await setCachedSuggestions(cacheKey, payload, CACHE_TTL_SECONDS);
  return payload;
}
