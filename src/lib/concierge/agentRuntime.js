// One agent turn, channel-agnostic — the runtime behind both the SSE route
// (Trip Home) and the Telegram webhook. Persists the user message, runs the
// streaming Claude tool loop (adaptive thinking ON — the deliberation is part
// of the product) over the thread history + memory digest, persists the reply
// with its working trace, and reports progress through an event callback so
// each channel can render it its own way.
//
// Event vocabulary (all optional — Telegram ignores them):
//   'thinking'    { text }                  thinking delta (summarized stream)
//   'delta'       { text }                  reply text, token-level
//   'tool_call'   { name, label }           label is a human one-liner
//   'tool_result' { name, ok, summary }     summary is deterministic
//   'proposal'    { diff }

import { getAnthropicClient } from '@/lib/llm/clients';
import { buildConciergeContext } from './buildContext';
import { buildAgentSystemPrompt, threadToMessages } from './agentPrompt';
import { AGENT_TOOLS, execAgentTool, toolCallLabel, toolResultSummary } from './agentToolsThread';
import { getOrCreateThread, appendThreadMessage, listThreadMessages } from './thread';
import { loadMemories, formatMemoryDigest } from './memories';
import { createTraceRecorder } from './agentTrace';
import { fetchPlaceHours } from './placesFetch';
import { logLlmUsage } from '@/lib/llm/usageLog';

const MODEL = 'claude-sonnet-4-6';
const MAX_TOOL_ROUNDS = 6;
const HISTORY_LIMIT = 20;
// Thinking tokens count toward max_tokens — 700 (the old non-thinking cap)
// would truncate mid-thought. Replies stay short; this is headroom, not a target.
const MAX_TOKENS = 4000;

/**
 * The shared streaming tool loop — used by chat turns here and by the nightly
 * round (nightlyRound.js). Streams thinking + text deltas, executes tools
 * between rounds, and preserves thinking blocks verbatim across rounds (the
 * API requires their signatures untouched; finalMessage() keeps them intact).
 *
 * @param {object} args
 * @param {object} args.client      Anthropic client (injected — testable)
 * @param {string} args.system      system prompt text (cached ephemeral)
 * @param {Array}  args.messages    seed messages (mutated in place per round)
 * @param {Array}  args.tools
 * @param {object} args.toolEnv     env for execAgentTool
 * @param {number} [args.maxRounds]
 * @param {number} [args.maxTokens]
 * @param {string|null} [args.effort]  output_config effort ('low' for telegram)
 * @param {function} [args.onEvent]
 * @param {object} [args.recorder]  trace recorder (createTraceRecorder())
 * @param {object} [args.usage]     { feature, meta } for logLlmUsage
 * @returns {Promise<{ finalText, pendingProposal, usedTools }>}
 */
export async function runToolLoop({
  client,
  system,
  messages,
  tools,
  toolEnv,
  maxRounds = MAX_TOOL_ROUNDS,
  maxTokens = MAX_TOKENS,
  effort = null,
  onEvent = () => {},
  recorder = null,
  usage = { feature: 'agent_thread', meta: {} },
}) {
  const usedTools = [];
  let pendingProposal = null;
  let finalText = '';

  for (let round = 0; round < maxRounds; round += 1) {
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: maxTokens,
      thinking: { type: 'adaptive' },
      ...(effort ? { output_config: { effort } } : {}),
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      tools,
      messages,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_start') {
        const block = event.content_block;
        if (block?.type === 'thinking') {
          recorder?.thinkingBlockStart();
        } else if (block?.type === 'text' && finalText) {
          // New prose block after earlier prose (later round or post-thinking
          // block) — keep the paragraph break the old whole-block join had.
          finalText += '\n\n';
          onEvent('delta', { text: '\n\n' });
        }
      } else if (event.type === 'content_block_delta') {
        const delta = event.delta;
        if (delta?.type === 'thinking_delta' && delta.thinking) {
          recorder?.thinking(delta.thinking);
          onEvent('thinking', { text: delta.thinking });
        } else if (delta?.type === 'text_delta' && delta.text) {
          finalText += delta.text;
          onEvent('delta', { text: delta.text });
        }
      }
    }

    // Complete message — thinking/redacted_thinking blocks with signatures
    // intact, pushed back VERBATIM below so later tool rounds stay valid.
    const resp = await stream.finalMessage();
    logLlmUsage({
      feature: usage.feature,
      model: MODEL,
      usage: resp?.usage,
      meta: { ...(usage.meta || {}), round },
    });

    const toolUses = (resp.content || []).filter((c) => c.type === 'tool_use');
    if (resp.stop_reason !== 'tool_use' || !toolUses.length) break;

    messages.push({ role: 'assistant', content: resp.content });
    const results = [];
    for (const tu of toolUses) {
      const label = toolCallLabel(tu.name, tu.input, toolEnv.ctx);
      onEvent('tool_call', { name: tu.name, label });
      recorder?.toolCall({ name: tu.name, label });
      usedTools.push(tu.name);
      const result = await execAgentTool(tu.name, tu.input, toolEnv);
      if (result?.proposal) {
        pendingProposal = { ...result.proposal, status: 'pending' };
        onEvent('proposal', { diff: result.proposal.diff });
      }
      const summary = toolResultSummary(tu.name, result);
      onEvent('tool_result', { name: tu.name, ok: !result?.error, summary });
      recorder?.toolResult(tu.name, { ok: !result?.error, summary });
      results.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(result) });
    }
    messages.push({ role: 'user', content: results });
  }

  return { finalText: finalText.trim(), pendingProposal, usedTools };
}

/**
 * @param {object} args
 * @param {object} args.supabase   service-role client
 * @param {object} args.trip       normalized trip (getTripWithDetails)
 * @param {string} args.userId
 * @param {string|null} [args.userEmail]
 * @param {string} args.message    the user's text (pre-trimmed)
 * @param {string} [args.channel]  'app' | 'telegram' | …
 * @param {object} [args.userMeta] extra meta on the persisted user message (e.g. tg_update_id)
 * @param {function} [args.onEvent] (type, data) — see event vocabulary above
 * @returns {Promise<{ ok: true, text, messageId, proposal, trace } | { error: string }>}
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
  const toolEnv = { ctx, trip, supabase, userId, tripId: trip.id, fetchPlace: fetchPlaceHours };

  const recorder = createTraceRecorder();
  const startedAt = Date.now();
  let finalText = '';
  let pendingProposal = null;
  let usedTools = [];

  try {
    const result = await runToolLoop({
      client,
      system,
      messages: [...history],
      tools: AGENT_TOOLS,
      toolEnv,
      onEvent,
      recorder,
      // Telegram gets the same brain, throttled: thinking self-moderates and
      // low effort keeps phone turns cheap/snappy (no visible trace there).
      effort: channel === 'telegram' ? 'low' : null,
      usage: { feature: 'agent_thread', meta: { tripId: trip.id, channel } },
    });
    finalText = result.finalText;
    pendingProposal = result.pendingProposal;
    usedTools = result.usedTools;
  } catch (err) {
    console.error('[concierge/agent] turn failed:', err?.message);
    return { error: 'generation_failed' };
  }

  if (!finalText) {
    finalText = 'I lost my train of thought — ask me that again?';
    onEvent('delta', { text: finalText });
  }

  const trace = recorder.finalize(Date.now() - startedAt);

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
      ...(trace ? { trace } : {}),
    },
  });

  return { ok: true, text: finalText, messageId: saved?.id || null, proposal: pendingProposal, trace };
}
