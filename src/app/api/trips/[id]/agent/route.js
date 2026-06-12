import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { requireTripWriteAccess } from '@/lib/trips/requireTripAccess';
import { enforceRateLimit, RATE_LIMITS } from '@/lib/rateLimit';
import { buildConciergeContext } from '@/lib/concierge/buildContext';
import { currentDayNumber } from '@/lib/concierge/agentPrompt';
import { runAgentTurn } from '@/lib/concierge/agentRuntime';
import { runNightlyRound } from '@/lib/concierge/nightlyRound';
import { getOrCreateThread, listThreadMessages } from '@/lib/concierge/thread';
import { isInvited } from '@/lib/concierge/invites';

export const runtime = 'nodejs';
// Chat turns finish well inside a minute; the manual nightly round streams a
// multi-stop tool loop (hours checks per stop + the brief) and needs headroom.
export const maxDuration = 300;

function sseEvent(type, data) {
  return `data: ${JSON.stringify({ type, ...data })}\n\n`;
}

/** Owner + invite gate shared by GET and POST. */
async function requireAgentAccess(request, tripId) {
  const access = await requireTripWriteAccess(request, tripId);
  if (access.response) return access;
  const invited = await isInvited({
    supabase: await getSupabaseAdmin(),
    email: access.requester?.userEmail,
    userId: access.requester?.userId,
  });
  if (!invited) {
    return {
      ...access,
      response: NextResponse.json(
        { error: 'Olivier is in early access — join the waitlist and we’ll let you in soon.', code: 'not_invited' },
        { status: 403 }
      ),
    };
  }
  return access;
}

/**
 * GET /api/trips/[id]/agent
 * Trip Home's one-shot bootstrap: deterministic context (instant, no LLM) +
 * the thread and its recent messages.
 */
export async function GET(request, { params }) {
  const { id: tripId } = await params;
  const { trip, requester, response } = await requireAgentAccess(request, tripId);
  if (response) return response;

  const supabase = await getSupabaseAdmin();
  const ctx = buildConciergeContext(trip);
  const { thread, error } = await getOrCreateThread(supabase, {
    tripId,
    userId: requester.userId,
    userEmail: requester.userEmail,
  });
  if (error) return NextResponse.json({ error: 'Could not open the thread.' }, { status: 502 });

  const { messages = [] } = await listThreadMessages(supabase, { threadId: thread.id, limit: 50 });

  let telegramLinked = false;
  try {
    const { data: prefs } = await supabase
      .from('concierge_preferences')
      .select('telegram_chat_id')
      .eq('user_id', requester.userId)
      .maybeSingle();
    telegramLinked = !!prefs?.telegram_chat_id;
  } catch { /* column may predate migration 0014 */ }

  return NextResponse.json({
    threadId: thread.id,
    meta: ctx.meta,
    days: ctx.days,
    personalization: ctx.personalization,
    todayDayNumber: currentDayNumber(ctx, new Date().toISOString()),
    telegramLinked,
    messages,
  });
}

/**
 * POST /api/trips/[id]/agent
 *   body: { message: string }                        — one chat turn
 *   body: { mode: 'nightly_round', dayNumber? }      — run Olivier's evening
 *     rounds NOW over SSE with the full working trace (dayNumber defaults to
 *     the next upcoming real day; works before the trip starts). The resulting
 *     evening_brief posts into the thread, idempotent per day.
 *
 * Streamed as SSE (thinking / delta / tool_call / tool_result / proposal /
 * error / done). Thin wrapper: the loops live in agentRuntime/nightlyRound,
 * shared with the Telegram webhook and the scheduled beat pipeline.
 */
export async function POST(request, { params }) {
  const { id: tripId } = await params;

  const limited = await enforceRateLimit(request, { route: 'agent-thread', ...RATE_LIMITS.agentThread });
  if (limited) return limited;

  const { trip, requester, response } = await requireAgentAccess(request, tripId);
  if (response) return response;

  let body = {};
  try { body = await request.json(); } catch { /* */ }
  const mode = body?.mode === 'nightly_round' ? 'nightly_round' : 'chat';
  const dayNumber = Number.isFinite(body?.dayNumber) ? body.dayNumber : null;
  const message = typeof body?.message === 'string' ? body.message.trim().slice(0, 1500) : '';
  if (mode === 'chat' && !message) return NextResponse.json({ error: 'Empty message' }, { status: 400 });

  const supabase = await getSupabaseAdmin();

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const emit = (type, data) => controller.enqueue(enc.encode(sseEvent(type, data)));
      try {
        if (mode === 'nightly_round') {
          const round = await runNightlyRound(trip, dayNumber, { supabase, onEvent: emit, channel: 'app' });
          if (!round.ok) {
            emit('error', { message: 'Olivier couldn’t finish his rounds — try again in a moment.' });
          } else {
            emit('done', {
              messageId: round.threadMessageId,
              proposal: round.proposal,
              trace: round.trace || null,
              beat: {
                kind: 'evening_brief',
                dayNumber: round.dayNumber,
                body: round.body,
                cityName: round.cityName,
                dateLabel: round.dateLabel,
              },
            });
          }
        } else {
          const result = await runAgentTurn({
            supabase,
            trip,
            userId: requester.userId,
            userEmail: requester.userEmail,
            message,
            channel: 'app',
            onEvent: emit,
          });
          if (result.error) {
            emit('error', { message: 'Olivier is unavailable right now — try again in a moment.' });
          } else {
            emit('done', { messageId: result.messageId, proposal: result.proposal, trace: result.trace || null });
          }
        }
      } catch (err) {
        console.error('[concierge/agent] turn failed:', err?.message);
        emit('error', { message: 'Olivier is unavailable right now — try again in a moment.' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
