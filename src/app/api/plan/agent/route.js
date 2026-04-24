/**
 * POST /api/plan/agent
 *
 * Streaming agentic itinerary planner using OpenAI function calling.
 * Receives the current trip context and a user message, executes tool calls
 * against real city data + Google Places, and streams back SSE events.
 *
 * SSE event types:
 *   delta          — text token from the assistant
 *   tool_call      — agent is about to call a tool { name, args }
 *   tool_result    — tool execution completed { name, summary }
 *   activity_updated — Supabase was updated { dayNumber, timeBlock, activity }
 *   error          — fatal error { message }
 *   done           — stream complete
 */

import { getTripWithDetails } from '@/lib/trips/tripsRepository';
import {
  OPENAI_TOOLS,
  execGetCityAttractions,
  execGetPlaceDetails,
  execSearchNearby,
  execUpdateItinerary,
  buildSystemPrompt,
  buildToolSummary,
} from '@/lib/planning/agentTools';
import OpenAI from 'openai';

export const runtime = 'nodejs';

const MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

function sseEvent(type, data) {
  return `data: ${JSON.stringify({ type, ...data })}\n\n`;
}

export async function POST(request) {
  if (!process.env.OPENAI_API_KEY) {
    return new Response(
      sseEvent('error', { message: 'OPENAI_API_KEY is not configured' }),
      { status: 500, headers: { 'Content-Type': 'text/event-stream' } }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(
      sseEvent('error', { message: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'text/event-stream' } }
    );
  }

  const { tripId, citySlug, messages: userMessages } = body;

  if (!tripId || !citySlug || !Array.isArray(userMessages) || userMessages.length === 0) {
    return new Response(
      sseEvent('error', { message: 'tripId, citySlug, and messages are required' }),
      { status: 400, headers: { 'Content-Type': 'text/event-stream' } }
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const push = (chunk) => controller.enqueue(enc.encode(chunk));
      const emit = (type, data) => push(sseEvent(type, data));

      const done = () => {
        push(sseEvent('done', {}));
        controller.close();
      };

      try {
        const [trip, cityData] = await Promise.all([
          getTripWithDetails(tripId),
          (await import('@/lib/data-utils')).getCityData(citySlug),
        ]);

        if (!trip) {
          emit('error', { message: 'Trip not found' });
          controller.close();
          return;
        }

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const systemPrompt = buildSystemPrompt(trip, cityData);

        const messages = [
          { role: 'system', content: systemPrompt },
          ...userMessages.filter((m) => m.role && m.content),
        ];

        let continueLoop = true;

        while (continueLoop) {
          const completion = await openai.chat.completions.create({
            model: MODEL,
            temperature: 0.4,
            stream: true,
            tools: OPENAI_TOOLS,
            tool_choice: 'auto',
            messages,
          });

          let assistantText = '';
          const toolCalls = {};

          for await (const chunk of completion) {
            const delta = chunk.choices?.[0]?.delta;
            if (!delta) continue;

            if (delta.content) {
              assistantText += delta.content;
              emit('delta', { text: delta.content });
            }

            for (const tc of delta.tool_calls || []) {
              const idx = tc.index ?? 0;
              if (!toolCalls[idx]) {
                toolCalls[idx] = { id: tc.id || '', name: '', args: '' };
              }
              if (tc.id) toolCalls[idx].id = tc.id;
              if (tc.function?.name) toolCalls[idx].name += tc.function.name;
              if (tc.function?.arguments) toolCalls[idx].args += tc.function.arguments;
            }
          }

          const toolCallList = Object.values(toolCalls);

          if (toolCallList.length === 0) {
            continueLoop = false;
            break;
          }

          messages.push({
            role: 'assistant',
            content: assistantText || null,
            tool_calls: toolCallList.map((tc) => ({
              id: tc.id,
              type: 'function',
              function: { name: tc.name, arguments: tc.args },
            })),
          });

          for (const tc of toolCallList) {
            let args;
            try {
              args = JSON.parse(tc.args || '{}');
            } catch {
              args = {};
            }

            emit('tool_call', { name: tc.name, args });

            let result;
            try {
              switch (tc.name) {
                case 'get_city_attractions':
                  result = await execGetCityAttractions(args);
                  break;
                case 'get_place_details':
                  result = await execGetPlaceDetails(args);
                  break;
                case 'search_nearby':
                  result = await execSearchNearby(args);
                  break;
                case 'update_itinerary':
                  result = await execUpdateItinerary({ ...args, trip_id: tripId }, emit);
                  break;
                default:
                  result = { error: `Unknown tool: ${tc.name}` };
              }
            } catch (err) {
              result = { error: err.message };
            }

            const summary = buildToolSummary(tc.name, args, result);
            emit('tool_result', { name: tc.name, summary, result });

            messages.push({
              role: 'tool',
              tool_call_id: tc.id,
              content: JSON.stringify(result),
            });
          }
        }

        done();
      } catch (err) {
        console.error('[agent] stream error:', err);
        emit('error', { message: err.message || 'An unexpected error occurred' });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
