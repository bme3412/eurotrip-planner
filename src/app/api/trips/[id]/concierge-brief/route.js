import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getTripWithDetails } from '@/lib/trips/tripsRepository';
import { getCityData, getCityVisitCalendar } from '@/lib/data-utils';
import { accommodationsByCity } from '@/lib/planning/tripBookings';
import { buildPlanFromNormalizedDays, extractWeather } from '@/app/itineraries/[tripId]/_lib/buildPlan';

export const runtime = 'nodejs';

// Same model the planner + scoring prose use (proven on this account).
const MODEL = 'claude-sonnet-4-20250514';
const LLM_TIMEOUT_MS = 15000;

/**
 * POST /api/trips/[tripId]/concierge-brief
 *
 * Generates a *preview* of the white-glove concierge ("Olivier") daily rhythm —
 * an Evening Brief, Morning Wake-up, and Wind-down — written in his voice from
 * the trip's real Day 1 (first activity, time, neighborhood, weather, hotel).
 *
 * The concierge backend doesn't exist yet (see CONCIERGE_PLAN.md); this is the
 * marketing-grade taste of it. If the LLM is unavailable we fall back to a
 * deterministic brief composed from the same context so the page is never empty.
 */

const TOOL = {
  name: 'concierge_briefs',
  description: "Olivier's three scheduled messages for the traveler's first day.",
  input_schema: {
    type: 'object',
    properties: {
      eveningBrief: {
        type: 'object',
        description: 'Sent ~8pm the night before. Sets up tomorrow.',
        properties: {
          body: { type: 'string', description: "2-3 sentences in Olivier's voice." },
          meta: { type: 'string', description: 'One short status line, e.g. "☀ 23° · sunrise 5:45 · light crowds".' },
        },
        required: ['body', 'meta'],
      },
      morningWakeup: {
        type: 'object',
        description: 'Sent 60-90 min before the first activity. Live conditions.',
        properties: {
          body: { type: 'string', description: "2-3 sentences in Olivier's voice." },
          meta: { type: 'string', description: 'One short status line.' },
        },
        required: ['body', 'meta'],
      },
      windDown: {
        type: 'object',
        description: 'Sent ~9pm, end of day. Quiet, teases tomorrow.',
        properties: {
          body: { type: 'string', description: "1-2 sentences in Olivier's voice." },
          meta: { type: 'string', description: 'One short status line.' },
        },
        required: ['body', 'meta'],
      },
    },
    required: ['eveningBrief', 'morningWakeup', 'windDown'],
  },
};

/** Pull the smallest context bundle Olivier needs from the trip's first real day. */
function buildContext(trip) {
  const plan = buildPlanFromNormalizedDays(trip);
  const day1 = (plan.days || []).find((d) => !d.isTravelDay && d.timeBlocks?.length) || plan.days?.[0] || null;

  const firstBlock = day1?.timeBlocks?.find((b) => b.activity?.name) || null;
  const firstActivity = firstBlock?.activity || null;

  const acc = trip.trip_state ? accommodationsByCity(trip.trip_state) : {};
  const hotel = day1?.city ? acc[day1.city] : null;

  let dateLabel = null;
  if (day1?.date) {
    const d = new Date(day1.date);
    if (!Number.isNaN(d.getTime())) {
      dateLabel = new Intl.DateTimeFormat('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC',
      }).format(d);
    }
  }

  return {
    cityName: day1?.cityName || trip.city || 'your city',
    country: day1?.country || trip.country || null,
    theme: day1?.theme || null,
    dateLabel,
    firstActivity: firstActivity
      ? {
          name: firstActivity.name,
          startTime: firstBlock.startTime || null,
          neighborhood: firstActivity.neighborhood || null,
          type: firstActivity.type || null,
        }
      : null,
    hotelName: hotel?.name || null,
  };
}

/** Deterministic fallback brief — used when the LLM is unconfigured or fails. */
function fallbackBriefs(ctx, weather) {
  const sunrise = weather?.sunrise ? `sunrise ${weather.sunrise}` : null;
  const tempLine = weather?.highC != null ? `${Math.round(weather.highC)}°` : null;
  const wet = weather?.rainDays != null && weather.rainDays >= 12 ? 'showers likely' : 'mostly clear';
  const meta = [tempLine, sunrise, wet].filter(Boolean).join(' · ') || 'conditions look good';

  const act = ctx.firstActivity;
  const where = act?.neighborhood ? ` in ${act.neighborhood}` : '';
  const at = act?.startTime ? ` at ${act.startTime}` : '';
  const leaveLine = act?.startTime ? ` I'd head out a little before${at ? ' your slot' : ''}.` : '';
  const hotelLine = ctx.hotelName ? ` You're settled at ${ctx.hotelName}.` : '';

  const evening = act
    ? `Tomorrow opens with ${act.name}${where}${at}.${leaveLine}${hotelLine} Get a good night's rest — ${ctx.cityName} is best on fresh legs.`
    : `Tomorrow is your first full day in ${ctx.cityName}.${hotelLine} Rest up — I'll have the morning mapped out for you.`;

  const morning = act
    ? `Good morning. Conditions are holding — ${act.name} should be calm if you go early. I'd leave with time to spare and take the scenic way over.`
    : `Good morning from ${ctx.cityName}. Conditions look settled; a relaxed start suits today well.`;

  const wind = `That's a wrap on day one in ${ctx.cityName}. Tomorrow has its own rhythm — I'll be in touch in the evening. Sleep well.`;

  return {
    eveningBrief: { body: evening, meta },
    morningWakeup: { body: morning, meta },
    windDown: { body: wind, meta: 'around 9pm · ' + ctx.cityName },
    source: 'fallback',
  };
}

export async function POST(request, { params }) {
  const { id: tripId } = await params;

  let trip;
  try {
    trip = await getTripWithDetails(tripId);
  } catch (err) {
    console.error('[concierge-brief] trip load failed:', err?.message);
    return NextResponse.json({ error: 'Could not load trip' }, { status: 502 });
  }
  if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });

  const ctx = buildContext(trip);

  // Weather for the trip's start month (best-effort).
  let weather = null;
  try {
    const citySlug = trip.city || 'paris';
    const visitCalendar = await getCityVisitCalendar(citySlug);
    weather = extractWeather(visitCalendar, trip.start_date);
  } catch {
    // non-fatal — Olivier just won't cite conditions
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(fallbackBriefs(ctx, weather));
  }

  const weatherLine = weather
    ? `High ~${weather.highC}°C, low ~${weather.lowC}°C, sunrise ${weather.sunrise}, sunset ${weather.sunset}, ~${weather.rainDays} rainy days this month.`
    : 'No weather detail available — do not invent specifics.';

  const system = `You are Olivier, a white-glove travel concierge who lives in the city your traveler is visiting. You write three short scheduled messages for their FIRST day. You are warm, specific, and quietly knowing — the voice of someone who lives there, not someone who Googled it.

Three tone rules, enforced in every message:
1. Specific over generic — name the thing ("the kouign-amann", a real street), never "a pastry" or "a nice spot".
2. Opinionated, not encyclopedic — recommend ONE thing, never a list of five.
3. Quietly knowing — a small insider detail (the shorter entrance, the café off the tourist drag, the morning light on a bridge).

Never invent venue names or facts not given below; you may add atmosphere (light, pace, a route) that a local would plausibly know. Keep each body to 2-3 sentences. No emoji in the body (the meta line may use one small weather glyph).

THE TRIP — Day 1
City: ${ctx.cityName}${ctx.country ? `, ${ctx.country}` : ''}
Date: ${ctx.dateLabel || 'first day of the trip'}
Day theme: ${ctx.theme || 'open exploration'}
First activity: ${ctx.firstActivity ? `${ctx.firstActivity.name}${ctx.firstActivity.startTime ? ` at ${ctx.firstActivity.startTime}` : ''}${ctx.firstActivity.neighborhood ? ` (${ctx.firstActivity.neighborhood})` : ''}` : 'not specified — keep it general'}
Hotel: ${ctx.hotelName || 'not specified'}
Weather (monthly normal): ${weatherLine}

The three messages:
- eveningBrief (~8pm, night before): one-sentence shape of tomorrow, the first activity's logistics (a depart-by feel), one small delight. meta = short status line.
- morningWakeup (60-90 min before the first activity): "Good morning." + current-conditions feel + a nudge on timing. meta = short status line.
- windDown (~9pm): a quiet acknowledgment of the day and a one-line tease of tomorrow. meta = short status line.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
  const client = new Anthropic({ apiKey });
  let resp;
  try {
    resp = await client.messages.create(
      {
        model: MODEL,
        max_tokens: 900,
        system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
        tools: [TOOL],
        tool_choice: { type: 'tool', name: 'concierge_briefs' },
        messages: [{ role: 'user', content: `Write Olivier's three messages for day one in ${ctx.cityName}.` }],
      },
      { signal: controller.signal }
    );
  } catch (err) {
    console.error('[concierge-brief] LLM failed, using fallback:', err?.message);
    return NextResponse.json(fallbackBriefs(ctx, weather));
  } finally {
    clearTimeout(timeout);
  }

  const toolUse = resp?.content?.find((c) => c.type === 'tool_use');
  if (!toolUse?.input?.eveningBrief) {
    return NextResponse.json(fallbackBriefs(ctx, weather));
  }
  return NextResponse.json({ ...toolUse.input, source: 'llm', city: ctx.cityName });
}
