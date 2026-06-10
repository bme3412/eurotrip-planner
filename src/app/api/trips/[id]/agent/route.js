import { NextResponse } from 'next/server';
import { getAnthropicClient } from '@/lib/llm/clients';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { requireTripWriteAccess } from '@/lib/trips/requireTripAccess';
import { enforceRateLimit, RATE_LIMITS } from '@/lib/rateLimit';
import { buildConciergeContext } from '@/lib/concierge/buildContext';
import { buildAgentSystemPrompt, currentDayNumber, threadToMessages } from '@/lib/concierge/agentPrompt';
import { AGENT_TOOLS, execAgentTool } from '@/lib/concierge/agentToolsThread';
import { getOrCreateThread, appendThreadMessage, listThreadMessages } from '@/lib/concierge/thread';
import { loadMemories, formatMemoryDigest } from '@/lib/concierge/memories';
import { isInvited } from '@/lib/concierge/invites';
import { logLlmUsage } from '@/lib/llm/usageLog';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MODEL = 'claude-sonnet-4-6';
const MAX_TOOL_ROUNDS = 6;
const HISTORY_LIMIT = 20;

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
  return NextResponse.json({
    threadId: thread.id,
    meta: ctx.meta,
    days: ctx.days,
    personalization: ctx.personalization,
    todayDayNumber: currentDayNumber(ctx, new Date().toISOString()),
    messages,
  });
}

/**
 * POST /api/trips/[id]/agent   body: { message: string }
 *
 * One thread turn, streamed as SSE (same event protocol as /api/plan/agent:
 * delta / tool_call / tool_result / error / done) — but on Anthropic, because
 * Claude owns Olivier's voice. Read-only tools in T1; both sides of the
 * exchange persist to concierge_messages.
 */
export async function POST(request, { params }) {
  const { id: tripId } = await params;

  const limited = await enforceRateLimit(request, { route: 'agent-thread', ...RATE_LIMITS.agentThread });
  if (limited) return limited;

  const { trip, requester, response } = await requireAgentAccess(request, tripId);
  if (response) return response;

  let body = {};
  try { body = await request.json(); } catch { /* */ }
  const message = typeof body?.message === 'string' ? body.message.trim().slice(0, 1500) : '';
  if (!message) return NextResponse.json({ error: 'Empty message' }, { status: 400 });

  const client = getAnthropicClient();
  if (!client) {
    return NextResponse.json({ error: 'The agent is not configured on this deployment.' }, { status: 503 });
  }

  const supabase = await getSupabaseAdmin();
  const ctx = buildConciergeContext(trip);
  const { thread, error: threadErr } = await getOrCreateThread(supabase, {
    tripId,
    userId: requester.userId,
    userEmail: requester.userEmail,
  });
  if (threadErr) return NextResponse.json({ error: 'Could not open the thread.' }, { status: 502 });

  // Persist the user's message first — it survives even if generation fails.
  await appendThreadMessage(supabase, {
    threadId: thread.id,
    userId: requester.userId,
    userEmail: requester.userEmail,
    role: 'user',
    kind: 'chat',
    body: message,
  });

  const [{ messages: rows = [] }, memoryRows] = await Promise.all([
    listThreadMessages(supabase, { threadId: thread.id, limit: HISTORY_LIMIT }),
    loadMemories(supabase, { userId: requester.userId, tripId }),
  ]);
  const system = buildAgentSystemPrompt({
    ctx,
    memoryDigest: formatMemoryDigest(memoryRows),
    todayIso: new Date().toISOString(),
  });
  const history = threadToMessages(rows, { limit: HISTORY_LIMIT });

  const toolEnv = { ctx, trip, supabase, userId: requester.userId, tripId };

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const emit = (type, data) => controller.enqueue(enc.encode(sseEvent(type, data)));
      const usedTools = [];
      let pendingProposal = null; // last proposal this turn — attached to the saved message
      let finalText = '';

      try {
        const messages = [...history];
        for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
          const resp = await client.messages.create({
            model: MODEL,
            max_tokens: 700,
            system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
            tools: AGENT_TOOLS,
            messages,
          });
          logLlmUsage({
            feature: 'agent_thread',
            model: MODEL,
            usage: resp?.usage,
            meta: { tripId, round },
          });

          const text = (resp.content || [])
            .filter((c) => c.type === 'text')
            .map((c) => c.text)
            .join('')
            .trim();
          if (text) {
            finalText = finalText ? `${finalText}\n\n${text}` : text;
            emit('delta', { text });
          }

          const toolUses = (resp.content || []).filter((c) => c.type === 'tool_use');
          if (resp.stop_reason !== 'tool_use' || !toolUses.length) break;

          messages.push({ role: 'assistant', content: resp.content });
          const results = [];
          for (const tu of toolUses) {
            emit('tool_call', { name: tu.name });
            usedTools.push(tu.name);
            const result = await execAgentTool(tu.name, tu.input, toolEnv);
            if (result?.proposal) {
              pendingProposal = { ...result.proposal, status: 'pending' };
              emit('proposal', { diff: result.proposal.diff });
            }
            emit('tool_result', { name: tu.name, ok: !result?.error });
            results.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(result) });
          }
          messages.push({ role: 'user', content: results });
        }

        if (!finalText) {
          finalText = 'I lost my train of thought — ask me that again?';
          emit('delta', { text: finalText });
        }

        const { message: saved } = await appendThreadMessage(supabase, {
          threadId: thread.id,
          userId: requester.userId,
          userEmail: requester.userEmail,
          role: 'olivier',
          kind: 'chat',
          body: finalText,
          meta: {
            ...(usedTools.length ? { tools: usedTools } : {}),
            ...(pendingProposal ? { proposal: pendingProposal } : {}),
          },
        });
        emit('done', { messageId: saved?.id || null, proposal: pendingProposal });
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
