import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getTripWithDetails } from '@/lib/trips/tripsRepository';
import { getCityVisitCalendar } from '@/lib/data-utils';
import { extractWeather } from '@/app/itineraries/[tripId]/_lib/buildPlan';
import { buildConciergeContext, weatherConditions, metaLine } from '@/lib/concierge/buildContext';

export const runtime = 'nodejs';

const MODEL = 'claude-sonnet-4-6';
// Rich structured tool output (~1100 tokens) can run 15-25s on a busy minute;
// give it real headroom so we serve Olivier's voice instead of the fallback.
const LLM_TIMEOUT_MS = 32000;

/**
 * POST /api/trips/[id]/concierge-brief   body: { dayNumber?: number }
 *
 * A *preview* of Olivier's white-glove concierge for one day of a saved trip.
 * Code owns every fact (times, weather, depart-by, the trip scaffold, cadence);
 * Claude only writes the voice. Returns enough for a rich, multi-section page:
 *   { meta, days[], personalization, day }
 * Pass dayNumber to regenerate the rich `day` for a different day (lazy select).
 * Falls back to deterministic prose if the LLM is unconfigured or fails.
 */

const TOOL = {
  name: 'concierge_day',
  description: "Olivier's voice for one day — three scheduled messages, a route note, and one reactive alert.",
  input_schema: {
    type: 'object',
    properties: {
      routeNote: { type: 'string', description: 'One short line on how to make the first leg, e.g. "18-min walk over Pont des Arts — lovely in morning light".' },
      briefs: {
        type: 'object',
        properties: {
          eveningBrief: {
            type: 'object',
            description: '~8pm the night before.',
            properties: {
              body: { type: 'string', description: "2-3 sentences in Olivier's voice setting up tomorrow." },
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
        description: 'A realistic mid-day disruption Olivier would catch, and what he proposes.',
        properties: {
          trigger: { type: 'string', description: 'Short label of what changed, e.g. "Rain moving into your 3pm window".' },
          body: { type: 'string', description: "1-2 sentences in Olivier's voice flagging it." },
          action: { type: 'string', description: 'The concrete swap/suggestion he offers.' },
        },
        required: ['trigger', 'body', 'action'],
      },
    },
    required: ['briefs', 'reactive'],
  },
};

function monthIndexOf(dateStr, fallback) {
  const d = dateStr ? new Date(dateStr) : fallback ? new Date(fallback) : null;
  return d && !Number.isNaN(d.getTime()) ? d.getUTCMonth() : 5;
}

/** Deterministic prose fallback when the LLM is unavailable. */
function fallbackProse(ctx) {
  const d = ctx.selectedDay;
  const act = d?.firstActivity;
  const where = act?.neighborhood ? ` in ${act.neighborhood}` : '';
  const at = act?.startTime ? ` at ${act.startTime}` : '';
  const leave = d?.departBy ? ` I'd head out around ${d.departBy}.` : '';
  return {
    routeNote: act ? `An easy approach to ${act.name} — take the scenic way and let the morning open up.` : 'A gentle, unhurried start.',
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
        tomorrowTease: d?.nextCity && d.nextCity !== d.cityName ? `Tomorrow we shift to ${d.nextCity}.` : 'Tomorrow has its own rhythm — more soon.',
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

export async function POST(request, { params }) {
  const { id: tripId } = await params;

  let body = {};
  try { body = await request.json(); } catch { /* optional */ }
  const dayNumber = Number.isFinite(body?.dayNumber) ? body.dayNumber : null;

  let trip;
  try {
    trip = await getTripWithDetails(tripId);
  } catch (err) {
    console.error('[concierge-brief] trip load failed:', err?.message);
    return NextResponse.json({ error: 'Could not load trip' }, { status: 502 });
  }
  if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });

  const ctx = buildConciergeContext(trip, { dayNumber });
  const d = ctx.selectedDay;

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

  // Assemble the rich `day`, then graft prose (LLM or fallback) on top.
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
      weather: dayWeather,
      routeNote: prose.routeNote || null,
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
  if (!apiKey || !d) {
    return NextResponse.json(assemble(fallbackProse(ctx)));
  }

  const p = ctx.personalization;
  const weatherLine = weather
    ? `High ~${weather.highC}°C, low ~${weather.lowC}°C, sunrise ${weather.sunrise}, sunset ${weather.sunset}, ~${weather.rainDays} rainy days this month (${cond.label}).`
    : 'No weather detail — do not invent specifics.';

  const system = `You are Olivier, a white-glove travel concierge who lives in the city your traveler is visiting. Warm, specific, quietly knowing — the voice of someone who lives there, not someone who Googled it.

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
Hotel: ${p.hotelName || 'not specified'}
Traveler pace: ${p.pace || 'unspecified'}; interests: ${p.interests?.join(', ') || 'varied'}.
${d.nextCity && d.nextCity !== d.cityName ? `Tomorrow they move to ${d.nextCity}.` : d.nextTheme ? `Tomorrow's theme: ${d.nextTheme}.` : ''}
Weather (monthly normal): ${weatherLine}

Write: the three messages (eveningBrief with one delight + optional decision; morningWakeup; windDown with a tomorrow tease), a routeNote for the first leg, and one realistic reactive alert (a disruption you'd catch mid-day and the swap you'd propose).`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
  const client = new Anthropic({ apiKey });
  let resp;
  try {
    resp = await client.messages.create(
      {
        model: MODEL,
        max_tokens: 1100,
        system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
        tools: [TOOL],
        tool_choice: { type: 'tool', name: 'concierge_day' },
        messages: [{ role: 'user', content: `Write Olivier's day for ${d.cityName}, day ${d.dayNumber}.` }],
      },
      { signal: controller.signal }
    );
  } catch (err) {
    console.error('[concierge-brief] LLM failed, using fallback:', err?.message);
    return NextResponse.json(assemble(fallbackProse(ctx)));
  } finally {
    clearTimeout(timeout);
  }

  const toolUse = resp?.content?.find((c) => c.type === 'tool_use');
  if (!toolUse?.input?.briefs) {
    return NextResponse.json(assemble(fallbackProse(ctx)));
  }
  return NextResponse.json(assemble({ ...toolUse.input, source: 'llm' }));
}
