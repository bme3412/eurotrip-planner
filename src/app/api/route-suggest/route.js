import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getSuggestionsForGap } from '@/lib/planning/gapSuggester';

const anthropic = new Anthropic();

/**
 * POST /api/route-suggest
 *
 * Generate AI-powered multi-city route suggestions
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      fromCity,
      toCity,
      gapStart,
      gapEnd,
      gapDays,
      preferences = {},
      constraints = '',
    } = body;

    // Validate required fields
    if (!fromCity || !toCity || !gapDays) {
      return NextResponse.json(
        { error: 'Missing required fields: fromCity, toCity, gapDays' },
        { status: 400 }
      );
    }

    // Step 1: Get candidate cities from existing suggestion logic
    const candidates = await getSuggestionsForGap({
      fromCity: fromCity.id,
      toCity: toCity.id,
      gapStart,
      gapEnd,
      preferences,
    });

    // Take top candidates for AI to consider
    const topCandidates = candidates.slice(0, 15).map((c) => ({
      id: c.id,
      name: c.name,
      country: c.country,
      score: c.score,
      transportTime: c.transportTime,
      transportType: c.transportType,
      recommendedDays: c.recommendedDays,
      interestMatches: c.interestMatches || [],
      hasInterestMatch: c.hasInterestMatch,
      shortTagline: c.shortTagline,
    }));

    // Step 2: Build context for Claude
    const systemPrompt = `You are a European travel route optimizer. Your job is to suggest optimal multi-city routes between a start and end city, given a number of available days and user preferences.

Guidelines:
- Minimize backtracking and detours
- Match user interests when possible
- Consider travel times between cities
- Respect the traveler's pace preference
- Ensure total days allocated equals available gap days
- Prefer train connections when reasonable (under 4 hours)

Return 2-3 route options with different tradeoffs (e.g., one faster, one more scenic, one matching interests better).`;

    const userPrompt = `Plan routes from ${fromCity.name} to ${toCity.name} with ${gapDays} days available.

User interests: ${preferences.interests?.join(', ') || 'Not specified'}
Travel pace: ${preferences.paceId || 'balanced'}
Budget: ${preferences.budget || 'moderate'}
${constraints ? `Additional requirements: ${constraints}` : ''}

Available cities to choose from (already scored for this date range):
${topCandidates.map((c) => `- ${c.name} (${c.country}): ${c.transportTime} from start, ${c.recommendedDays}d recommended, score: ${c.score}${c.interestMatches?.length > 0 ? `, matches: ${c.interestMatches.join(', ')}` : ''}`).join('\n')}

Create 2-3 route options. Each route should use exactly ${gapDays} days total across 1-3 cities.`;

    // Step 3: Call Claude for route optimization
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      tools: [
        {
          name: 'suggest_routes',
          description: 'Suggest optimized multi-city routes',
          input_schema: {
            type: 'object',
            properties: {
              routes: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: {
                      type: 'string',
                      description: 'Short name for this route option (e.g., "Cultural Capitals")',
                    },
                    cities: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          cityId: { type: 'string' },
                          cityName: { type: 'string' },
                          days: { type: 'number' },
                        },
                        required: ['cityId', 'cityName', 'days'],
                      },
                    },
                    description: {
                      type: 'string',
                      description: 'Brief description of why this route works',
                    },
                    highlights: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Key highlights of this route',
                    },
                  },
                  required: ['name', 'cities', 'description'],
                },
              },
            },
            required: ['routes'],
          },
        },
      ],
      tool_choice: { type: 'tool', name: 'suggest_routes' },
    });

    // Extract the tool use result
    const toolUse = response.content.find((c) => c.type === 'tool_use');
    if (!toolUse || toolUse.name !== 'suggest_routes') {
      throw new Error('No route suggestions returned');
    }

    const { routes } = toolUse.input;

    // Step 4: Enrich routes with full city data
    const enrichedRoutes = routes.map((route, idx) => {
      const enrichedCities = route.cities.map((city) => {
        const candidate = topCandidates.find(
          (c) => c.id === city.cityId || c.name.toLowerCase() === city.cityName.toLowerCase()
        );
        return {
          ...city,
          ...(candidate || {}),
          days: city.days,
        };
      });

      // Calculate total travel time
      const totalTravelMinutes = enrichedCities.reduce((sum, city) => {
        const transportTime = city.transportTime || '0h';
        const match = transportTime.match(/(\d+)h\s*(\d+)?/);
        if (match) {
          return sum + parseInt(match[1], 10) * 60 + (parseInt(match[2], 10) || 0);
        }
        return sum;
      }, 0);

      const hours = Math.floor(totalTravelMinutes / 60);
      const mins = totalTravelMinutes % 60;
      const totalTravelTime = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;

      return {
        id: `route-${idx + 1}`,
        name: route.name,
        cities: enrichedCities,
        description: route.description,
        highlights: route.highlights || [],
        totalTravelTime,
        totalDays: enrichedCities.reduce((sum, c) => sum + c.days, 0),
      };
    });

    return NextResponse.json({
      routes: enrichedRoutes,
      meta: {
        fromCity: fromCity.name,
        toCity: toCity.name,
        gapDays,
        candidatesConsidered: topCandidates.length,
      },
    });
  } catch (error) {
    console.error('[route-suggest] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate route suggestions', details: error.message },
      { status: 500 }
    );
  }
}
