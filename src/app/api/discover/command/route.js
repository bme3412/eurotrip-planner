import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { enforceAnonymousRateLimit, RATE_LIMITS } from '@/lib/rateLimit';

export const runtime = 'nodejs';

// Same model the planner + scoring prose use (proven on this account).
const MODEL = 'claude-sonnet-4-6';

/**
 * POST /api/discover/command
 *
 * The Discover surface's agentic command bar. Translates a traveler's
 * natural-language request ("add Lisbon", "try September", "make it 10 days")
 * into structured edits the client applies to the shared trip context (dates +
 * shortlist), so the ranked map/list re-rank live. Uses forced tool-use so the
 * response is always a validated action object.
 */
const TOOL = {
  name: 'apply_trip_commands',
  description: "Translate the traveler's request into structured edits to their trip discovery.",
  input_schema: {
    type: 'object',
    properties: {
      setDates: {
        type: 'object',
        description: 'New trip date range. Include ONLY if the user changed the timing.',
        properties: {
          start: { type: 'string', description: 'ISO YYYY-MM-DD, in the future' },
          end: { type: 'string', description: 'ISO YYYY-MM-DD, after start' },
        },
      },
      addCities: {
        type: 'array',
        items: { type: 'string' },
        description: 'European city names to add to the shortlist (e.g. "Lisbon").',
      },
      removeCities: {
        type: 'array',
        items: { type: 'string' },
        description: 'City names to remove from the shortlist.',
      },
      reply: { type: 'string', description: 'One short, friendly sentence confirming what changed.' },
    },
    required: ['reply'],
  },
};

export async function POST(request) {
  const limited = await enforceAnonymousRateLimit(request, {
    route: 'discover-command',
    ...RATE_LIMITS.discoverCommand,
  });
  if (limited) return limited;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Assistant is not configured.' }, { status: 503 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const text = typeof body?.text === 'string' ? body.text.trim() : '';
  if (!text) return NextResponse.json({ error: 'Empty request' }, { status: 400 });
  const ctx = body?.context || {};

  const today = new Date().toISOString().split('T')[0];
  const system = `You translate a traveler's natural-language request into structured edits to their trip discovery on a ranked map of European cities.

Today is ${today}.
Current trip dates: ${ctx.startDate || 'none'} to ${ctx.endDate || 'none'}.
Current shortlist: ${(Array.isArray(ctx.shortlist) && ctx.shortlist.length) ? ctx.shortlist.join(', ') : 'empty'}.

Rules:
- All dates ISO YYYY-MM-DD and strictly in the future relative to today.
- "make it N days/nights" → keep the current start date and set end = start + N days. If there's no current start, use the first of next month.
- A season/month ("shoulder season", "September", "early summer", "Christmas") → pick a representative ~2-week range in that period (next occurrence).
- Include setDates ONLY when the user changed timing. Include addCities/removeCities only for cities the user named.
- Resolve casual names to well-known European city names ("barca" → "Barcelona").
- reply: one short, friendly sentence describing what you changed.`;

  const client = new Anthropic({ apiKey });
  let resp;
  try {
    resp = await client.messages.create({
      model: MODEL,
      max_tokens: 500,
      system,
      tools: [TOOL],
      tool_choice: { type: 'tool', name: 'apply_trip_commands' },
      messages: [{ role: 'user', content: text }],
    });
  } catch (err) {
    console.error('[discover/command] LLM failed:', err?.message);
    return NextResponse.json({ error: 'Assistant unavailable' }, { status: 502 });
  }

  const toolUse = resp?.content?.find((c) => c.type === 'tool_use');
  if (!toolUse?.input) {
    return NextResponse.json({ error: 'No actions' }, { status: 502 });
  }
  return NextResponse.json(toolUse.input);
}
