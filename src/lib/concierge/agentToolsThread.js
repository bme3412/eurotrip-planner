// Tools for the thread agent. Executors take an injected env
// ({ ctx, supabase, userId, tripId, fetchPlace }) so the logic is plain-Node
// testable. Write tools go through the proposal/Apply flow (T2).

import { getCityVisitCalendar } from '@/lib/data-utils';
import { extractWeather } from '@/app/itineraries/[tripId]/_lib/buildPlan';
import { legLinks } from './mapsLink';
import { rememberFact } from './memories';
import { buildProposal } from './tripActions';
import { classifyOpening } from './hoursCheck';

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
    name: 'check_hours',
    description:
      "Check real opening hours (Google Places) for a day's scheduled stops against their planned times. Returns per-stop status: ok, closed that day, or opens later than planned. Use before asserting anything about whether a place will be open.",
    input_schema: {
      type: 'object',
      properties: {
        dayNumber: { type: 'integer', description: 'The trip day number.' },
        activityName: { type: 'string', description: 'Optional: check just this one stop by name.' },
      },
      required: ['dayNumber'],
    },
  },
  {
    name: 'propose_itinerary_change',
    description:
      'Propose a concrete change to the itinerary: move a stop to a new time/day, skip a stop, swap two days, or add a note to a day. The traveler sees the proposal with an Apply button — NOTHING changes until they tap it, so never claim a change is done; say it’s ready to apply. Propose ONE change per message.',
    input_schema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['move_activity', 'remove_activity', 'swap_days', 'add_note'] },
        dayNumber: { type: 'integer', description: 'The day the change starts from.' },
        activityName: { type: 'string', description: 'For move/remove: the stop’s name as it appears in the schedule.' },
        toDayNumber: { type: 'integer', description: 'For move (different day) or swap_days (the other day).' },
        toTime: { type: 'string', description: 'For move: new start time, HH:MM 24h.' },
        note: { type: 'string', description: 'For add_note: the note text.' },
      },
      required: ['action', 'dayNumber'],
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
 * Human one-liner for a tool call, shown live in the thread's working trace
 * ("Checking Friday hours for Day 3 in Kraków"). Pure — plain-Node testable.
 */
export function toolCallLabel(name, input = {}, ctx = null) {
  const day = Number.isFinite(input?.dayNumber) ? input.dayNumber : null;
  const city = day != null ? findDay(ctx || {}, day)?.cityName || null : null;
  switch (name) {
    case 'get_day_details':
      return day != null ? `Looking at Day ${day}${city ? ` — ${city}` : ''}` : 'Looking at the itinerary';
    case 'get_weather':
      return day != null ? `Checking the weather for Day ${day}${city ? ` in ${city}` : ''}` : 'Checking the weather';
    case 'get_directions':
      return day != null ? `Mapping the routes for Day ${day}` : 'Mapping the routes';
    case 'check_hours': {
      const what = input?.activityName ? `${input.activityName}'s hours` : 'opening hours';
      return day != null ? `Checking ${what} for Day ${day}${city ? ` in ${city}` : ''}` : `Checking ${what}`;
    }
    case 'propose_itinerary_change': {
      const what = input?.activityName ? ` for ${input.activityName}` : '';
      return day != null ? `Drafting a change${what} on Day ${day}` : 'Drafting a change';
    }
    case 'remember':
      return 'Noting that down';
    default:
      return `Using ${String(name).replace(/_/g, ' ')}`;
  }
}

/**
 * Deterministic one-line summary of a tool result for the working trace
 * ("Wawel Castle: closed that day"). Pure — plain-Node testable.
 */
export function toolResultSummary(name, result) {
  if (!result) return null;
  if (result.error) return String(result.error).slice(0, 120);
  if (result.note) return String(result.note).slice(0, 120);
  switch (name) {
    case 'get_day_details': {
      const n = (result.schedule || []).length;
      const first = result.schedule?.[0];
      const bits = [`${n} stop${n === 1 ? '' : 's'}`];
      if (first?.time) bits.push(`first at ${first.time}`);
      if (result.isTravelDay) bits.push('travel day');
      return bits.join(' · ');
    }
    case 'get_weather': {
      const parts = [];
      if (result.highC != null) parts.push(`high ${Math.round(result.highC)}°`);
      if (result.lowC != null) parts.push(`low ${Math.round(result.lowC)}°`);
      let s = parts.join(', ');
      if (result.rainDays != null) s += `${s ? ' · ' : ''}${result.rainDays} rainy days that month`;
      return s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Weather looked up';
    }
    case 'get_directions': {
      const n = (result.legs || []).length;
      return `${n} route link${n === 1 ? '' : 's'} ready`;
    }
    case 'check_hours': {
      const stops = result.stops || [];
      if (!stops.length) return 'No stops to check';
      const issues = stops.filter((s) => s.status === 'closed' || s.status === 'opens_later');
      if (!issues.length) {
        const unknown = stops.filter((s) => s.status === 'unknown').length;
        const checked = stops.length - unknown;
        return checked
          ? `${checked === stops.length ? `All ${checked}` : `${checked} of ${stops.length}`} stop${stops.length === 1 ? '' : 's'} open as planned`
          : 'Hours unverifiable for these stops';
      }
      return issues
        .map((i) => `${i.name}: ${i.status === 'closed' ? 'closed that day' : `opens ${i.opensAt || 'later'}`}`)
        .join(' · ')
        .slice(0, 160);
    }
    case 'propose_itinerary_change':
      return result.proposal?.diff ? String(result.proposal.diff).slice(0, 140) : 'Change drafted — ready to apply';
    case 'remember':
      return result.remembered ? 'Remembered' : null;
    default:
      return null;
  }
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
      case 'check_hours': {
        const d = findDay(ctx, input.dayNumber);
        if (!d) return { error: `No day ${input.dayNumber} on this trip.` };
        if (typeof env.fetchPlace !== 'function') {
          return { note: 'Live opening hours are unavailable right now — speak in general terms and suggest the traveler double-checks.' };
        }
        let candidates = (d.schedule || []).filter((s) => s.placeId);
        if (input.activityName) {
          const q = String(input.activityName).toLowerCase();
          candidates = candidates.filter((s) => (s.name || '').toLowerCase().includes(q));
        }
        if (!candidates.length) {
          return { note: 'No stops with verifiable hours on this day (no place ids matched).' };
        }
        const weekday = d.date ? new Date(`${d.date}T00:00:00`).getDay() : null;
        if (weekday == null || Number.isNaN(weekday)) {
          return { note: 'This day has no calendar date yet, so weekday hours can’t be checked.' };
        }
        const stops = [];
        for (const stop of candidates) {
          let place = null;
          try {
            place = await env.fetchPlace(stop.placeId);
          } catch { /* quota/network — report unknown, never guess */ }
          if (!place) {
            stops.push({ name: stop.name, time: stop.time || null, status: 'unknown' });
            continue;
          }
          const verdict = classifyOpening({
            openingHours: place.regularOpeningHours,
            businessStatus: place.businessStatus || null,
            weekday,
            plannedTime: stop.time || null,
          });
          stops.push({ name: stop.name, time: stop.time || null, status: verdict.status, opensAt: verdict.opensAt || null });
        }
        return { dayNumber: d.dayNumber, date: d.date, city: d.cityName, stops };
      }
      case 'propose_itinerary_change': {
        const { proposal, error } = buildProposal(env.trip, input);
        if (error) return { error };
        // The route spots `proposal` on the result, emits the SSE event, and
        // persists it on the message for the Apply flow.
        return { ok: true, proposal, awaiting: 'The traveler must tap Apply — tell them it’s ready, do not claim it’s done.' };
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
