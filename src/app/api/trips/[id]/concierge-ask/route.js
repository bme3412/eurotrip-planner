import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getTripWithDetails } from '@/lib/trips/tripsRepository';
import { buildConciergeContext } from '@/lib/concierge/buildContext';

export const runtime = 'nodejs';

const MODEL = 'claude-sonnet-4-6';
const LLM_TIMEOUT_MS = 14000;

/**
 * POST /api/trips/[id]/concierge-ask   body: { question: string }
 *
 * One-shot "ask Olivier" for the concierge preview. Answers a single question in
 * Olivier's voice, grounded in the trip's real shape (cities, days, first stops).
 * Plain text reply — no tools, no thread state.
 */
export async function POST(request, { params }) {
  const { id: tripId } = await params;

  let body = {};
  try { body = await request.json(); } catch { /* */ }
  const question = typeof body?.question === 'string' ? body.question.trim().slice(0, 500) : '';
  if (!question) return NextResponse.json({ error: 'Empty question' }, { status: 400 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      reply: "I'm still warming up for your trip — once the concierge is live I'll answer this with the specifics. For now, trust the itinerary you built; it's a good one.",
      source: 'fallback',
    });
  }

  let trip;
  try {
    trip = await getTripWithDetails(tripId);
  } catch (err) {
    console.error('[concierge-ask] trip load failed:', err?.message);
    return NextResponse.json({ error: 'Could not load trip' }, { status: 502 });
  }
  if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });

  const ctx = buildConciergeContext(trip);
  const itinerarySketch = ctx.days
    .slice(0, 16)
    .map((d) => {
      const tag = d.isTravelDay ? 'travel' : d.firstActivity?.name ? `${d.firstActivity.name}${d.firstActivity.startTime ? ` @ ${d.firstActivity.startTime}` : ''}` : (d.theme || 'open');
      return `Day ${d.dayNumber} · ${d.cityName}: ${tag}`;
    })
    .join('\n');

  const p = ctx.personalization;
  const system = `You are Olivier, a white-glove travel concierge who lives in the cities your traveler is visiting. Warm, specific, opinionated, quietly knowing — never a list of options, never generic. No emoji. Answer in 2-4 sentences, as if texting someone you look after.

THE TRIP
Route: ${ctx.meta.cities.join(' → ') || ctx.meta.cityName} · ${ctx.meta.totalRealDays} days.
Pace: ${p.pace || 'unspecified'}; interests: ${p.interests?.join(', ') || 'varied'}.
${p.hotelName ? `Hotel (first city): ${p.hotelName}.` : ''}
Itinerary sketch:
${itinerarySketch}

Ground your answer in this itinerary. If something genuinely isn't in the plan, say what you'd do anyway as the local who knows. Never invent specific venue names you weren't given — speak from local knowledge in general terms instead.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
  const client = new Anthropic({ apiKey });
  try {
    const resp = await client.messages.create(
      {
        model: MODEL,
        max_tokens: 400,
        system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: question }],
      },
      { signal: controller.signal }
    );
    const reply = (resp?.content || [])
      .filter((c) => c.type === 'text')
      .map((c) => c.text)
      .join('')
      .trim();
    if (!reply) throw new Error('empty reply');
    return NextResponse.json({ reply, source: 'llm' });
  } catch (err) {
    console.error('[concierge-ask] LLM failed:', err?.message);
    return NextResponse.json({ error: 'Olivier is unavailable right now' }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
