// Read-only tools for the thread agent (T1). Executors take an injected env
// ({ ctx, supabase, userId, tripId }) so the logic is plain-Node testable.
// Write tools (move/swap/add) arrive in T2 behind the proposal/Apply flow.

import { getCityVisitCalendar } from '@/lib/data-utils';
import { extractWeather } from '@/app/itineraries/[tripId]/_lib/buildPlan';
import { legLinks } from './mapsLink';
import { rememberFact } from './memories';

export const AGENT_TOOLS = [
  {
    name: 'get_day_details',
    description:
      "Full deterministic facts for one trip day: the schedule with times and neighborhoods, depart-by time, hotel, theme, and date. Use before answering anything about what's planned.",
    input_schema: {
      type: 'object',
      properties: { dayNumber: { type: 'integer', description: 'The trip day number.' } },
      required: ['dayNumber'],
    },
  },
  {
    name: 'get_weather',
    description: 'Typical weather (highs/lows, rain likelihood, sunshine) for a given trip day, based on that city and month.',
    input_schema: {
      type: 'object',
      properties: { dayNumber: { type: 'integer', description: 'The trip day number.' } },
      required: ['dayNumber'],
    },
  },
  {
    name: 'get_directions',
    description:
      'Directions deep links for a day: one maps link per scheduled stop (walking for short hops, transit otherwise). Share these when the traveler asks how to get somewhere.',
    input_schema: {
      type: 'object',
      properties: { dayNumber: { type: 'integer', description: 'The trip day number.' } },
      required: ['dayNumber'],
    },
  },
  {
    name: 'remember',
    description:
      'Store a durable fact about the traveler ("hates crowds", "vegetarian", "traveling with a toddler"). scope "trip" = this trip only; "always" = every future trip.',
    input_schema: {
      type: 'object',
      properties: {
        fact: { type: 'string', description: 'The fact, in third person, one sentence.' },
        scope: { type: 'string', enum: ['trip', 'always'], description: 'Default "trip".' },
      },
      required: ['fact'],
    },
  },
];

function findDay(ctx, dayNumber) {
  return (ctx.days || []).find((d) => d.dayNumber === dayNumber) || null;
}

/**
 * Execute one tool call. Always returns a JSON-serializable result object —
 * errors are returned as { error } so the model can recover conversationally.
 */
export async function execAgentTool(name, input = {}, env) {
  const { ctx, supabase, userId, tripId } = env;
  try {
    switch (name) {
      case 'get_day_details': {
        const d = findDay(ctx, input.dayNumber);
        if (!d) return { error: `No day ${input.dayNumber} on this trip.` };
        return {
          dayNumber: d.dayNumber,
          date: d.dateLabel || d.date,
          city: d.cityName,
          isTravelDay: d.isTravelDay,
          theme: d.theme,
          departBy: d.departBy,
          hotel: d.hotelName,
          schedule: (d.schedule || []).map((s) => ({
            time: s.time,
            name: s.name,
            neighborhood: s.neighborhood,
            indoor: s.indoor,
          })),
        };
      }
      case 'get_weather': {
        const d = findDay(ctx, input.dayNumber);
        if (!d) return { error: `No day ${input.dayNumber} on this trip.` };
        const cal = await getCityVisitCalendar(d.city || ctx.meta?.destinations?.[0]?.city || 'paris');
        const weather = extractWeather(cal, d.date);
        if (!weather) return { note: 'No weather data for this city/month — speak in seasonal generalities.' };
        return { dayNumber: d.dayNumber, city: d.cityName, ...weather };
      }
      case 'get_directions': {
        const d = findDay(ctx, input.dayNumber);
        if (!d) return { error: `No day ${input.dayNumber} on this trip.` };
        const legs = legLinks(d.schedule || [], { cityName: d.cityName }).filter((l) => l.url);
        if (!legs.length) return { note: 'No mappable stops on this day.' };
        return { dayNumber: d.dayNumber, legs };
      }
      case 'remember': {
        const res = await rememberFact(supabase, {
          userId,
          tripId,
          fact: input.fact,
          scope: input.scope === 'always' ? 'always' : 'trip',
        });
        if (res.error) return { error: res.error };
        return { remembered: res.fact, scope: input.scope === 'always' ? 'always' : 'trip' };
      }
      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (err) {
    console.error(`[concierge/agent] tool ${name} failed:`, err?.message);
    return { error: 'Tool failed — answer from what you already know, without inventing specifics.' };
  }
}
