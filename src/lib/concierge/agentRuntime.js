// One agent turn, channel-agnostic — the runtime behind both the SSE route
// (Trip Home) and the Telegram webhook. Persists the user message, runs the
// Claude tool loop over the thread history + memory digest, persists the
// reply, and reports progress through an event callback so each channel can
// render it its own way (SSE events, typing indicators, …).

import { getAnthropicClient } from '@/lib/llm/clients';
import { buildConciergeContext } from './buildContext';
import { buildAgentSystemPrompt, threadToMessages } from './agentPrompt';
import { AGENT_TOOLS, execAgentTool } from './agentToolsThread';
import { getOrCreateThread, appendThreadMessage, listThreadMessages } from './thread';
import { loadMemories, formatMemoryDigest } from './memories';
import { logLlmUsage } from '@/lib/llm/usageLog';

const MODEL = 'claude-sonnet-4-6';
const MAX_TOOL_ROUNDS = 6;
const HISTORY_LIMIT = 20;

/**
 * @param {object} args
 * @param {object} args.supabase   service-role client
 * @param {object} args.trip       normalized trip (getTripWithDetails)
 * @param {string} args.userId
 * @param {string|null} [args.userEmail]
 * @param {string} args.message    the user's text (pre-trimmed)
 * @param {string} [args.channel]  'app' | 'telegram' | …
 * @param {object} [args.userMeta] extra meta on the persisted user message (e.g. tg_update_id)
 * @param {function} [args.onEvent] (type, data) — 'delta' | 'tool_call' | 'tool_result'
 * @returns {Promise<{ ok: true, text, messageId, proposal } | { error: string }>}
 */
export async function runAgentTurn({
  supabase,
  trip,
  userId,
  userEmail = null,
  message,
  channel = 'app',
  userMeta = {},
  onEvent = () => {},
}) {
  const client = getAnthropicClient();
  if (!client) return { error: 'agent_unconfigured' };

  const ctx = buildConciergeContext(trip);
  const { thread, error: threadErr } = await getOrCreateThread(supabase, {
    tripId: trip.id,
    userId,
    userEmail,
  });
  if (threadErr) return { error: 'thread_unavailable' };

  // Persist the user's message first — it survives even if generation fails.
  await appendThreadMessage(supabase, {
    threadId: thread.id,
    userId,
    userEmail,
    role: 'user',
    kind: 'chat',
    body: message,
    channel,
    meta: userMeta,
  });

  const [{ messages: rows = [] }, memoryRows] = await Promise.all([
    listThreadMessages(supabase, { threadId: thread.id, limit: HISTORY_LIMIT }),
    loadMemories(supabase, { userId, tripId: trip.id }),
  ]);
  const system = buildAgentSystemPrompt({
    ctx,
    memoryDigest: formatMemoryDigest(memoryRows),
    todayIso: new Date().toISOString(),
  });
  const history = threadToMessages(rows, { limit: HISTORY_LIMIT });
  const toolEnv = { ctx, trip, supabase, userId, tripId: trip.id };

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
        meta: { tripId: trip.id, round, channel },
      });

      const text = (resp.content || [])
        .filter((c) => c.type === 'text')
        .map((c) => c.text)
        .join('')
        .trim();
      if (text) {
        finalText = finalText ? `${finalText}\n\n${text}` : text;
        onEvent('delta', { text });
      }

      const toolUses = (resp.content || []).filter((c) => c.type === 'tool_use');
      if (resp.stop_reason !== 'tool_use' || !toolUses.length) break;

      messages.push({ role: 'assistant', content: resp.content });
      const results = [];
      for (const tu of toolUses) {
        onEvent('tool_call', { name: tu.name });
        usedTools.push(tu.name);
        const result = await execAgentTool(tu.name, tu.input, toolEnv);
        if (result?.proposal) {
          pendingProposal = { ...result.proposal, status: 'pending' };
          onEvent('proposal', { diff: result.proposal.diff });
        }
        onEvent('tool_result', { name: tu.name, ok: !result?.error });
        results.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(result) });
      }
      messages.push({ role: 'user', content: results });
    }
  } catch (err) {
    console.error('[concierge/agent] turn failed:', err?.message);
    return { error: 'generation_failed' };
  }

  if (!finalText) {
    finalText = 'I lost my train of thought — ask me that again?';
    onEvent('delta', { text: finalText });
  }

  const { message: saved } = await appendThreadMessage(supabase, {
    threadId: thread.id,
    userId,
    userEmail,
    role: 'olivier',
    kind: 'chat',
    body: finalText,
    channel,
    meta: {
      ...(usedTools.length ? { tools: usedTools } : {}),
      ...(pendingProposal ? { proposal: pendingProposal } : {}),
    },
  });

  return { ok: true, text: finalText, messageId: saved?.id || null, proposal: pendingProposal };
}
