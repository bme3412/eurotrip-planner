/**
 * Tool definitions for the conversational trip planner
 * These tools allow the AI to interact with the UI and trip data
 */

export const tools = [
  // Intent classification - MUST be called first on any new conversation
  {
    name: 'classify_intent',
    description: `Classify the user's intent on their FIRST message. Call this BEFORE any other tool.

Intents:
- "plan": User wants to create a new trip (mentions cities, dates, travel plans)
- "review": User is pasting/describing an existing itinerary to review/improve
- "browse": User is asking questions about cities, travel, or seeking info without planning

Extract any useful details from their message (cities mentioned, dates, interests, etc.)`,
    input_schema: {
      type: 'object',
      properties: {
        intent: {
          type: 'string',
          enum: ['plan', 'review', 'browse'],
          description: 'The classified intent',
        },
        confidence: {
          type: 'number',
          description: 'Confidence score 0-1',
        },
        extracted: {
          type: 'object',
          description: 'Any details extracted from the message',
          properties: {
            cities: {
              type: 'array',
              items: { type: 'string' },
              description: 'City names mentioned',
            },
            dates: {
              type: 'object',
              properties: {
                start: { type: 'string' },
                end: { type: 'string' },
                month: { type: 'string' },
                duration: { type: 'string' },
                flexible: { type: 'boolean' },
              },
            },
            interests: {
              type: 'array',
              items: { type: 'string' },
              description: 'Interests or preferences mentioned',
            },
            rawItinerary: {
              type: 'string',
              description: 'If review intent, the pasted itinerary text',
            },
            question: {
              type: 'string',
              description: 'If browse intent, the question being asked',
            },
          },
        },
      },
      required: ['intent', 'extracted'],
    },
  },
  // Review-path tool — used when the user has ALREADY described a trip and
  // wants it reviewed. Pulls raw text into a structured itinerary so the UI
  // can render an editable summary and the planner can validate it.
  {
    name: 'parse_itinerary',
    description: `Structure a free-text itinerary the user pasted or described.
Call this on REVIEW intent, the moment the user says something like
"I'm in Paris Mon-Wed, then Rome Thu-Sun" or pastes a draft trip.

Extract every city the user mentioned, in the order they said it, with
however many nights they are spending there. Guess only the details you
are confident about. Leave unknowns null — do not invent dates or durations.

After this tool runs, the UI will show the user an editable summary; do
NOT also call update_trip or show_route_summary in the same turn.`,
    input_schema: {
      type: 'object',
      properties: {
        cities: {
          type: 'array',
          description: 'Cities in the order visited',
          items: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'City name exactly as the user said it (e.g. "Paris", "Rome"). Do not translate or normalize.',
              },
              nights: {
                type: 'number',
                description: 'Number of nights in this city. Leave blank if unclear.',
              },
              startDate: {
                type: 'string',
                description: 'Arrival date in YYYY-MM-DD if the user gave a real date. Leave blank for weekday-only refs like "Mon".',
              },
              endDate: {
                type: 'string',
                description: 'Departure date in YYYY-MM-DD if the user gave one. Leave blank otherwise.',
              },
              notes: {
                type: 'string',
                description: 'Anything specific the user said about this stop (e.g. "museum-heavy", "day trip to Versailles").',
              },
            },
            required: ['name'],
          },
        },
        totalNights: {
          type: 'number',
          description: 'Total nights across the trip if the user stated it explicitly. Leave blank otherwise.',
        },
        travelYear: {
          type: 'number',
          description: 'The year the user is travelling if stated (e.g. 2026). Leave blank otherwise.',
        },
        confidence: {
          type: 'string',
          enum: ['high', 'medium', 'low'],
          description: 'How confident you are in the structure. High = explicit dates + cities. Low = vague.',
        },
        rawText: {
          type: 'string',
          description: 'The exact snippet of the user message you parsed (for the UI to quote).',
        },
      },
      required: ['cities', 'confidence'],
    },
  },
  {
    name: 'show_options',
    description: 'Display clickable option buttons for the user to choose from. Use this when presenting choices.',
    input_schema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Optional text to show before the options',
        },
        options: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Unique identifier for this option' },
              label: { type: 'string', description: 'Button text to display' },
              description: { type: 'string', description: 'Optional subtext explaining the option' },
              emoji: { type: 'string', description: 'Optional emoji to show before label' },
            },
            required: ['id', 'label'],
          },
          description: 'Array of options (2-4 recommended)',
        },
        allowMultiple: {
          type: 'boolean',
          description: 'Whether user can select multiple options',
          default: false,
        },
      },
      required: ['options'],
    },
  },
  {
    name: 'show_city_search',
    description: 'Display a city search input for the user to find and select a city.',
    input_schema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Text to show above the search input',
        },
        purpose: {
          type: 'string',
          enum: ['start', 'end', 'stop'],
          description: 'What this city selection is for',
        },
        suggestions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional array of suggested city names to show as quick picks',
        },
      },
      required: ['purpose'],
    },
  },
  {
    name: 'show_city_cards',
    description: 'Display a grid of city suggestion cards for the user to browse and select.',
    input_schema: {
      type: 'object',
      properties: {
        cities: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              country: { type: 'string' },
              score: { type: 'number', description: 'Match score 0-100' },
              travelTime: { type: 'string', description: 'e.g., "2h by train"' },
              highlight: { type: 'string', description: 'Why this city is recommended' },
            },
            required: ['id', 'name', 'country'],
          },
          description: 'Cities to display as cards',
        },
        allowMultiple: {
          type: 'boolean',
          default: true,
        },
        fromCity: {
          type: 'string',
          description: 'City these suggestions are from (for context)',
        },
      },
      required: ['cities'],
    },
  },
  {
    name: 'show_days_allocation',
    description: 'Display sliders to allocate days across cities.',
    input_schema: {
      type: 'object',
      properties: {
        cities: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              suggestedDays: { type: 'number' },
              minDays: { type: 'number', default: 1 },
              maxDays: { type: 'number', default: 7 },
            },
            required: ['id', 'name', 'suggestedDays'],
          },
        },
        totalDays: {
          type: 'number',
          description: 'Total days available for the trip',
        },
      },
      required: ['cities', 'totalDays'],
    },
  },
  {
    name: 'show_date_picker',
    description: 'Display a date picker for selecting travel dates.',
    input_schema: {
      type: 'object',
      properties: {
        mode: {
          type: 'string',
          enum: ['range', 'month', 'flexible'],
          description: 'Type of date selection',
        },
        suggestedStart: {
          type: 'string',
          description: 'Suggested start date (YYYY-MM-DD)',
        },
        duration: {
          type: 'number',
          description: 'If mode is flexible, suggested duration in days',
        },
      },
      required: ['mode'],
    },
  },
  {
    name: 'update_trip',
    description: 'Update the trip state with new information. Use this whenever the user provides trip details.',
    input_schema: {
      type: 'object',
      properties: {
        startCity: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            country: { type: 'string' },
          },
        },
        endCity: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            country: { type: 'string' },
          },
        },
        endCityFlexible: {
          type: 'boolean',
          description: 'Set to true if user wants flexible end city',
        },
        addStops: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              country: { type: 'string' },
            },
          },
          description: 'Cities to add as stops',
        },
        removeStops: {
          type: 'array',
          items: { type: 'string' },
          description: 'City IDs to remove from stops',
        },
        totalDays: {
          type: 'number',
        },
        daysPerCity: {
          type: 'object',
          additionalProperties: { type: 'number' },
          description: 'Map of cityId to number of days',
        },
        dates: {
          type: 'object',
          properties: {
            start: { type: 'string' },
            end: { type: 'string' },
            month: { type: 'string' },
            flexible: { type: 'boolean' },
          },
        },
        preferences: {
          type: 'object',
          properties: {
            interests: {
              type: 'array',
              items: { type: 'string' },
            },
            budget: {
              type: 'string',
              enum: ['budget', 'moderate', 'premium', 'flexible'],
            },
            pace: {
              type: 'string',
              enum: ['relaxed', 'balanced', 'active'],
            },
          },
        },
      },
    },
  },
  {
    name: 'show_route_summary',
    description: 'Display a visual summary of the current route with all cities and travel times.',
    input_schema: {
      type: 'object',
      properties: {
        showDays: {
          type: 'boolean',
          default: true,
          description: 'Whether to show day allocations',
        },
        showDates: {
          type: 'boolean',
          default: true,
          description: 'Whether to show specific dates',
        },
        confirmable: {
          type: 'boolean',
          default: false,
          description: 'Whether to show confirm/edit buttons',
        },
      },
    },
  },
  {
    name: 'get_city_suggestions',
    description: 'Get AI-scored city suggestions for a route segment. Returns cities ranked by fit.',
    input_schema: {
      type: 'object',
      properties: {
        fromCity: {
          type: 'string',
          description: 'City ID to get suggestions from',
        },
        toCity: {
          type: 'string',
          description: 'Optional destination city ID (for route optimization)',
        },
        interests: {
          type: 'array',
          items: { type: 'string' },
          description: 'User interests to factor into scoring',
        },
        maxResults: {
          type: 'number',
          default: 6,
        },
      },
      required: ['fromCity'],
    },
  },
  {
    name: 'get_travel_info',
    description: 'Get travel time and options between two cities.',
    input_schema: {
      type: 'object',
      properties: {
        from: { type: 'string', description: 'Origin city ID' },
        to: { type: 'string', description: 'Destination city ID' },
      },
      required: ['from', 'to'],
    },
  },
  {
    name: 'finalize_trip',
    description: 'User has confirmed the trip. Proceed to generate the detailed itinerary.',
    input_schema: {
      type: 'object',
      properties: {
        generateItinerary: {
          type: 'boolean',
          default: true,
          description: 'Whether to automatically generate day-by-day itinerary',
        },
      },
    },
  },
];

/**
 * Get tool by name
 */
export function getTool(name) {
  return tools.find(t => t.name === name);
}
