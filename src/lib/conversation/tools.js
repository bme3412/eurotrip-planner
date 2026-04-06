/**
 * Tool definitions for the conversational trip planner
 * These tools allow the AI to interact with the UI and trip data
 */

export const tools = [
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
