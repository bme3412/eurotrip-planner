import { getAnthropicClient } from '@/lib/llm/clients';
import { buildQuickAnswerPrompt } from '@/lib/conversation/systemPromptV2';
import { initialTripState } from '@/lib/conversation/tripState';
import { runPlannerLoop } from '@/lib/conversation/plannerLoop';
import { enforceRateLimit, RATE_LIMITS } from '@/lib/rateLimit';

const MAX_BODY_BYTES = 256 * 1024; // 256 KB — plenty for long itinerary paste-ins
const MODEL = 'claude-sonnet-4-6';

function logEvent(event, data = {}) {
  const isError = typeof event === 'string' && event.includes('error');
  const sink = isError ? console.error : console.info;
  try {
    sink(JSON.stringify({ event, ...data }));
  } catch {
    sink('[conversation]', event, data);
  }
}

function classifyAnthropicError(err) {
  const status = err?.status || err?.response?.status;
  if (status === 429) return { kind: 'rate_limit', retryable: true };
  if (status === 529 || status === 503) return { kind: 'overloaded', retryable: true };
  if (status >= 500) return { kind: 'server_error', retryable: true };
  if (err?.name === 'AbortError') return { kind: 'abort', retryable: false };
  if (status >= 400) return { kind: 'client_error', retryable: false };
  if (!status) return { kind: 'network', retryable: true };
  return { kind: 'unknown', retryable: false };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Create an SSE stream for real-time responses.
 */
function createSSEStream() {
  const encoder = new TextEncoder();
  let controller;

  const stream = new ReadableStream({
    start(c) { controller = c; },
  });

  const send = (data) => {
    try {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    } catch {
      // Stream may be closed
    }
  };

  const close = () => {
    try { controller.close(); } catch { /* already closed */ }
  };

  return { stream, send, close };
}

async function readBoundedJson(request) {
  const lenHeader = request.headers.get('content-length');
  if (lenHeader && Number.parseInt(lenHeader, 10) > MAX_BODY_BYTES) {
    throw Object.assign(new Error('Request body too large'), { status: 413 });
  }
  return request.json();
}

/**
 * Call Anthropic with retry/backoff on transient errors.
 * Retries 429, 529, 503, 5xx, and network errors up to 2 times.
 */
async function callAnthropicWithRetry({ client, params, onText, sessionId }) {
  let attempt = 0;
  while (true) {
    try {
      const stream = client.messages.stream(params);
      stream.on('text', (delta) => {
        if (delta && onText) onText(delta);
      });
      return await stream.finalMessage();
    } catch (err) {
      const { kind, retryable } = classifyAnthropicError(err);
      logEvent('anthropic_error', {
        sessionId,
        attempt,
        kind,
        status: err?.status,
        message: err?.message,
      });
      if (!retryable || attempt >= 2) {
        err._classification = kind;
        throw err;
      }
      // Exponential backoff with jitter: 400ms, 1200ms
      const delay = 400 * Math.pow(3, attempt) + Math.floor(Math.random() * 200);
      await sleep(delay);
      attempt += 1;
    }
  }
}

export async function POST(request) {
  const limited = await enforceRateLimit(request, {
    route: 'conversation',
    ...RATE_LIMITS.conversation,
  });
  if (limited) return limited;

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let body;
  try {
    body = await readBoundedJson(request);
  } catch (err) {
    const status = err?.status || 400;
    return new Response(
      JSON.stringify({ error: err?.message || 'Invalid request' }),
      { status, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const {
    messages,
    tripState: clientTripState,
    isStart,
    recentToolHistory,
    tripContext,
    quickAnswer,
    sessionId,
  } = body || {};

  const requestStart = Date.now();
  const isQuickAnswer = !!quickAnswer;
  logEvent('conversation_request', {
    sessionId,
    mode: isQuickAnswer ? 'quick_answer' : 'planner',
    isStart: !!isStart,
    messageCount: messages?.length || 0,
    page: tripContext?.page || null,
  });

  try {
    const client = getAnthropicClient();

    let tripState = clientTripState || { ...initialTripState };

    const buildToolHistoryBlock = () => {
      if (!recentToolHistory?.length) return '';
      const historyText = recentToolHistory
        .map((t) => `- Called ${t.tool}: ${t.summary}`)
        .join('\n');
      return `## Recent Tool History\nThese tools were called in previous turns:\n${historyText}`;
    };

    // Quick-answer surfaces (QuestionChips, AgentSidecar) get a short factual
    // prompt with no tools, so plain-string system is fine there.
    // The full trip-planner turn's system prompt is built inside
    // runPlannerLoop so prompt blocks are rebuilt with cache markers each time
    // the dynamic gap-analysis block changes.
    let systemForCall = isQuickAnswer ? buildQuickAnswerPrompt(tripContext) : null;

    // Build messages array
    let apiMessages;
    if (isStart || !messages || messages.length === 0) {
      apiMessages = [
        {
          role: 'user',
          content: isQuickAnswer
            ? 'Hi.'
            : 'Hi, I want to plan a European trip.',
        },
      ];
    } else {
      apiMessages = messages
        .filter((m) => m.content)
        .map((m) => ({ role: m.role, content: m.content }));
    }

    // Merge consecutive same-role messages (Anthropic requirement)
    const mergedMessages = [];
    for (const msg of apiMessages) {
      const prev = mergedMessages[mergedMessages.length - 1];
      if (prev && prev.role === msg.role) {
        prev.content += '\n' + msg.content;
      } else {
        mergedMessages.push({ ...msg });
      }
    }

    // Ensure first message is 'user'
    if (mergedMessages.length > 0 && mergedMessages[0].role !== 'user') {
      mergedMessages.unshift({
        role: 'user',
        content: isQuickAnswer
          ? 'Hi.'
          : 'I want to plan a European trip.',
      });
    }

    const { stream, send, close } = createSSEStream();

    // Quick-answer mode: single-turn, no tools, shorter max_tokens.
    if (isQuickAnswer) {
      (async () => {
        try {
          await callAnthropicWithRetry({
            client,
            params: {
              model: MODEL,
              max_tokens: 512,
              system: systemForCall,
              messages: mergedMessages,
            },
            onText: (delta) =>
              send({ type: 'content_delta', content: delta }),
            sessionId,
          });
          send({ type: 'done' });
          logEvent('conversation_done', {
            sessionId,
            mode: 'quick_answer',
            elapsedMs: Date.now() - requestStart,
          });
        } catch (error) {
          const kind = error?._classification || 'unknown';
          const userMessage =
            kind === 'rate_limit'
              ? 'Too many requests right now — please try again in a moment.'
              : kind === 'overloaded'
                ? 'The assistant is temporarily overloaded. Please try again.'
                : error?.message || 'Unknown error';
          send({ type: 'error', error: userMessage, kind });
          logEvent('conversation_error', {
            sessionId,
            mode: 'quick_answer',
            kind,
            elapsedMs: Date.now() - requestStart,
          });
        } finally {
          close();
        }
      })();

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    // Full trip-planner loop
    (async () => {
      try {
        const { loopCount, hitMaxLoops } = await runPlannerLoop({
          client,
          initialMessages: mergedMessages,
          tripState,
          send,
          buildToolHistoryBlock,
          sessionId,
          callWithRetry: ({ params, onText }) =>
            callAnthropicWithRetry({ client, params, onText, sessionId }),
        });

        if (hitMaxLoops) {
          logEvent('conversation_incomplete', {
            sessionId,
            reason: 'max_loops',
            loopCount,
          });
        }

        logEvent('conversation_done', {
          sessionId,
          mode: 'planner',
          loopCount,
          elapsedMs: Date.now() - requestStart,
        });
      } catch (error) {
        const kind = error?._classification || 'unknown';
        const userMessage =
          kind === 'rate_limit'
            ? 'Too many requests right now — please try again in a moment.'
            : kind === 'overloaded'
              ? 'The assistant is temporarily overloaded. Please try again.'
              : kind === 'network'
                ? "I couldn't reach the assistant. Check your connection and retry."
                : error?.message || 'Unknown error';
        send({ type: 'error', error: userMessage, kind });
        logEvent('conversation_error', {
          sessionId,
          mode: 'planner',
          kind,
          status: error?.status,
          message: error?.message,
          elapsedMs: Date.now() - requestStart,
        });
      } finally {
        close();
      }
    })();

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    logEvent('conversation_request_error', {
      sessionId,
      message: error?.message,
    });
    return new Response(JSON.stringify({ error: 'Something went wrong. Please try again.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
