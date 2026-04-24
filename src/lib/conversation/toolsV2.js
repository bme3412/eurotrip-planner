/**
 * Tool definitions for the agentic trip planner (V2).
 * 12 tools in 3 categories: Extraction, Data Retrieval, UI Rendering.
 */

// ── EXTRACTION TOOLS ─────────────────────────────────────────────

const extract_trip_data = {
  name: 'extract_trip_data',
  description: `Extract ALL recognizable trip data from the user's message. Parse cities, dates, durations, transport bookings, budget, traveler details, and preferences. Extract everything — do not wait for confirmation. Call this on EVERY user message with trip info.`,
  input_schema: {
    type: 'object',
    properties: {
      cities: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            role: { type: 'string', enum: ['start', 'end', 'stop'] },
            nights: { type: 'number' },
            arrivalDate: { type: 'string', description: 'YYYY-MM-DD' },
            departureDate: { type: 'string', description: 'YYYY-MM-DD' },
            notes: { type: 'string' },
          },
          required: ['name'],
        },
      },
      routeShape: { type: 'string', enum: ['roundtrip', 'one-way', 'open-jaw'] },
      totalNights: { type: 'number' },
      startDate: { type: 'string', description: 'YYYY-MM-DD' },
      endDate: { type: 'string', description: 'YYYY-MM-DD' },
      flexibleMonth: { type: 'string', description: 'Month name or season' },
      flexibility: { type: 'string', enum: ['fixed', 'flexible_week', 'flexible_month', 'flexible_season'] },
      transportPreference: { type: 'string', enum: ['flight', 'train', 'bus', 'car', 'mixed'] },
      transportBookings: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['flight', 'train', 'bus', 'ferry', 'car'] },
            provider: { type: 'string' },
            reference: { type: 'string' },
            flightNumber: { type: 'string' },
            fromCity: { type: 'string' },
            toCity: { type: 'string' },
            departureDate: { type: 'string' },
            departureTime: { type: 'string' },
            arrivalDate: { type: 'string' },
            arrivalTime: { type: 'string' },
            raw: { type: 'string' },
          },
        },
      },
      budget: {
        type: 'object',
        properties: {
          total: { type: 'number' },
          currency: { type: 'string' },
          style: { type: 'string', enum: ['budget', 'moderate', 'premium', 'luxury'] },
          dailyCap: { type: 'number' },
        },
      },
      travelers: {
        type: 'object',
        properties: {
          groupType: { type: 'string', enum: ['solo', 'couple', 'family', 'friends', 'group'] },
          count: { type: 'number' },
          ages: { type: 'array', items: { type: 'number' } },
          hasChildren: { type: 'boolean' },
          hasElderly: { type: 'boolean' },
          dietaryRestrictions: { type: 'array', items: { type: 'string' } },
          mobilityNeeds: { type: 'string' },
          languages: { type: 'array', items: { type: 'string' } },
        },
      },
      preferences: {
        type: 'object',
        properties: {
          interests: { type: 'array', items: { type: 'string' } },
          pace: { type: 'string', enum: ['relaxed', 'balanced', 'active'] },
          accommodationStyle: { type: 'string', enum: ['hostel', 'hotel', 'airbnb', 'luxury'] },
          weatherTolerance: { type: 'string', enum: ['any', 'warm_only', 'avoid_rain'] },
        },
      },
    },
  },
};

const resolve_cities = {
  name: 'resolve_cities',
  description: 'Resolve city name strings to canonical IDs from the 220-city European database. Returns IDs, coordinates, country, and description.',
  input_schema: {
    type: 'object',
    properties: {
      names: { type: 'array', items: { type: 'string' }, description: 'City names to resolve' },
    },
    required: ['names'],
  },
};

// ── DATA RETRIEVAL TOOLS ─────────────────────────────────────────

const get_route_options = {
  name: 'get_route_options',
  description: 'Get transport options and travel times between two cities.',
  input_schema: {
    type: 'object',
    properties: {
      fromCityId: { type: 'string' },
      toCityId: { type: 'string' },
    },
    required: ['fromCityId', 'toCityId'],
  },
};

const suggest_cities = {
  name: 'suggest_cities',
  description: 'Get scored city suggestions between two cities or from a starting city.',
  input_schema: {
    type: 'object',
    properties: {
      fromCityId: { type: 'string' },
      toCityId: { type: 'string' },
      interests: { type: 'array', items: { type: 'string' } },
      budget: { type: 'string' },
      maxResults: { type: 'number' },
    },
    required: ['fromCityId'],
  },
};

const get_city_info = {
  name: 'get_city_info',
  description: 'Get weather, events, and attractions summary for a city during specific dates.',
  input_schema: {
    type: 'object',
    properties: {
      cityId: { type: 'string' },
      month: { type: 'string' },
    },
    required: ['cityId'],
  },
};

const optimize_route = {
  name: 'optimize_route',
  description: 'Find the optimal ordering of cities by travel time, cost, or scenic value.',
  input_schema: {
    type: 'object',
    properties: {
      cityIds: { type: 'array', items: { type: 'string' } },
      startCityId: { type: 'string' },
      endCityId: { type: 'string' },
      optimizeFor: { type: 'string', enum: ['time', 'cost', 'scenic'] },
    },
    required: ['cityIds'],
  },
};

// ── UI RENDERING TOOLS ───────────────────────────────────────────

const render_trip_card = {
  name: 'render_trip_card',
  description: 'Display the current trip state as a visual summary card. Use after any significant state update.',
  input_schema: {
    type: 'object',
    properties: {
      highlightChanges: { type: 'array', items: { type: 'string' }, description: 'Fields that just changed' },
      confirmable: { type: 'boolean', description: 'Show confirm/edit buttons' },
    },
  },
};

const render_city_picker = {
  name: 'render_city_picker',
  description: 'Display a city picker with optional suggestions.',
  input_schema: {
    type: 'object',
    properties: {
      purpose: { type: 'string', enum: ['add_city', 'replace_city', 'suggest_stops'] },
      suggestions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            country: { type: 'string' },
            highlight: { type: 'string' },
            travelTime: { type: 'string' },
            score: { type: 'number' },
          },
        },
      },
      allowMultiple: { type: 'boolean' },
      prompt: { type: 'string' },
    },
  },
};

const render_options = {
  name: 'render_options',
  description: 'Display clickable option buttons for quick choices.',
  input_schema: {
    type: 'object',
    properties: {
      options: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            label: { type: 'string' },
            description: { type: 'string' },
          },
          required: ['id', 'label'],
        },
      },
      prompt: { type: 'string' },
      allowMultiple: { type: 'boolean' },
    },
    required: ['options'],
  },
};

const render_date_picker = {
  name: 'render_date_picker',
  description: 'Display a calendar date picker.',
  input_schema: {
    type: 'object',
    properties: {
      mode: { type: 'string', enum: ['range', 'month', 'flexible'] },
      suggestedStart: { type: 'string' },
      suggestedEnd: { type: 'string' },
    },
    required: ['mode'],
  },
};

const render_nights_allocator = {
  name: 'render_nights_allocator',
  description: 'Display a per-city nights allocation widget.',
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
            suggested: { type: 'number' },
          },
        },
      },
      totalNights: { type: 'number' },
    },
    required: ['cities', 'totalNights'],
  },
};

const finalize_trip = {
  name: 'finalize_trip',
  description: 'All essential info gathered. Lock the trip and trigger itinerary generation.',
  input_schema: {
    type: 'object',
    properties: {
      summary: { type: 'string', description: 'One-line trip summary' },
    },
  },
};

// ── EXPORTS ──────────────────────────────────────────────────────

export const TOOLS_V2 = [
  // Extraction
  extract_trip_data,
  resolve_cities,
  // Data retrieval
  get_route_options,
  suggest_cities,
  get_city_info,
  optimize_route,
  // UI rendering
  render_trip_card,
  render_city_picker,
  render_options,
  render_date_picker,
  render_nights_allocator,
  finalize_trip,
];

// Tools whose results should continue the agentic loop
// (Claude needs to see the result to formulate the next response)
export const DATA_TOOLS = new Set([
  'extract_trip_data',
  'resolve_cities',
  'get_route_options',
  'suggest_cities',
  'get_city_info',
  'optimize_route',
]);

// Tools that render UI on the client (passed through via SSE)
export const UI_TOOLS = new Set([
  'render_trip_card',
  'render_city_picker',
  'render_options',
  'render_date_picker',
  'render_nights_allocator',
  'finalize_trip',
]);
