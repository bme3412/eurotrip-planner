import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT, buildContextPrompt } from '@/lib/conversation/systemPrompt';
import { tools } from '@/lib/conversation/tools';
import { getSuggestionsForGap } from '@/lib/planning/gapSuggester';
import citiesData from '@/generated/cities.json';

// Build city lookup
const cityLookup = {};
for (const city of citiesData) {
  cityLookup[city.id] = city;
  // Also index by lowercase name for fuzzy matching
  cityLookup[city.name.toLowerCase()] = city;
}

/**
 * Handle tool calls and return results
 */
async function handleToolCall(toolName, toolInput, tripContext) {
  switch (toolName) {
    case 'get_city_suggestions': {
      const { fromCity, toCity, interests, maxResults = 6 } = toolInput;

      try {
        // Use the existing gapSuggester
        const suggestions = await getSuggestionsForGap({
          fromCity,
          toCity: toCity || null,
          gapStart: new Date().toISOString().split('T')[0],
          gapEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          preferences: {
            interests: interests || [],
            budget: tripContext.preferences?.budget || 'moderate',
            paceId: tripContext.preferences?.pace || 'balanced',
          },
        });

        return suggestions.slice(0, maxResults).map(s => ({
          id: s.id,
          name: s.name,
          country: s.country,
          score: s.score,
          travelMinutes: s.travelMinutes,
          transportMode: s.transportDetails?.mode,
          matchReasons: s.matchReasons || [],
        }));
      } catch (error) {
        console.error('Error getting suggestions:', error);
        return [];
      }
    }

    case 'get_travel_info': {
      const { from, to } = toolInput;
      const fromCity = cityLookup[from];
      const toCity = cityLookup[to];

      if (!fromCity || !toCity) {
        return { error: 'City not found' };
      }

      // Try to load connections data
      try {
        const connectionsPath = `/data/${fromCity.country}/${fromCity.id}/${fromCity.id}_connections.json`;
        const response = await fetch(`${process.env.NEXT_PUBLIC_CDN_URL || ''}${connectionsPath}`);

        if (response.ok) {
          const connections = await response.json();
          const connection = connections.find(c => c.to === to);

          if (connection) {
            return {
              from: fromCity.name,
              to: toCity.name,
              travelTime: connection.time,
              mode: connection.mode,
              frequency: connection.frequency,
            };
          }
        }
      } catch {
        // Fall back to estimate
      }

      // Estimate based on distance
      const distance = calculateDistance(fromCity, toCity);
      const estimatedHours = distance < 300 ? 2 : distance < 600 ? 4 : 6;

      return {
        from: fromCity.name,
        to: toCity.name,
        travelTime: `~${estimatedHours}h`,
        mode: distance > 800 ? 'flight' : 'train',
        estimated: true,
      };
    }

    default:
      return null;
  }
}

/**
 * Calculate distance between two cities (haversine)
 */
function calculateDistance(city1, city2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(city2.latitude - city1.latitude);
  const dLon = toRad(city2.longitude - city1.longitude);
  const lat1 = toRad(city1.latitude);
  const lat2 = toRad(city2.latitude);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * Stream response as SSE
 */
function createSSEStream() {
  const encoder = new TextEncoder();
  let controller;

  const stream = new ReadableStream({
    start(c) {
      controller = c;
    },
  });

  const send = (data) => {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
  };

  const close = () => {
    controller.close();
  };

  return { stream, send, close };
}

export async function POST(request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { messages, tripContext, isStart } = await request.json();

    const client = new Anthropic({ apiKey });

    // Build the full system prompt with context
    const contextPrompt = buildContextPrompt(tripContext || {});
    const fullSystemPrompt = `${SYSTEM_PROMPT}\n\n${contextPrompt}`;

    // Build messages array
    let apiMessages = [];

    if (isStart) {
      // Starting conversation - send initial prompt
      apiMessages = [{
        role: 'user',
        content: 'Start the conversation by greeting me and asking where I want to start my trip.',
      }];
    } else {
      // Continue conversation
      apiMessages = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));
    }

    // Create SSE stream
    const { stream, send, close } = createSSEStream();

    // Start streaming in background
    (async () => {
      try {
        let continueLoop = true;
        let currentMessages = [...apiMessages];

        while (continueLoop) {
          continueLoop = false;

          const response = await client.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            system: fullSystemPrompt,
            messages: currentMessages,
            tools,
          });

          // Process response content
          for (const block of response.content) {
            if (block.type === 'text') {
              send({ type: 'content', content: block.text });
            } else if (block.type === 'tool_use') {
              // Handle tool call
              send({
                type: 'tool_use',
                id: block.id,
                name: block.name,
                input: block.input,
              });

              // Execute tool and get result
              const toolResult = await handleToolCall(block.name, block.input, tripContext);

              // If this tool returns data (not just UI), we need to continue the conversation
              if (toolResult !== null && (block.name === 'get_city_suggestions' || block.name === 'get_travel_info')) {
                // Add assistant message with tool use
                currentMessages.push({
                  role: 'assistant',
                  content: response.content,
                });

                // Add tool result
                currentMessages.push({
                  role: 'user',
                  content: [{
                    type: 'tool_result',
                    tool_use_id: block.id,
                    content: JSON.stringify(toolResult),
                  }],
                });

                continueLoop = true;
              }
            }
          }

          // Check if we need to continue (tool use with end_turn)
          if (response.stop_reason === 'tool_use' && !continueLoop) {
            // Tool was UI-only, we're done
          }
        }

        send({ type: 'done' });
      } catch (error) {
        console.error('Streaming error:', error);
        send({ type: 'error', error: error.message });
      } finally {
        close();
      }
    })();

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('API error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
