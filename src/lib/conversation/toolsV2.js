/**
 * Tool definitions for the agentic trip planner (V2).
 * 12 tools in 3 categories: Extraction, Data Retrieval, UI Rendering.
 */

// ── EXTRACTION TOOLS ─────────────────────────────────────────────

const extract_trip_data = {
  name: 'extract_trip_data',
  description: `Extract HIGH-confidence trip data from the user's message: cities they explicitly named, concrete dates, transport bookings they pasted, durations and traveler counts they stated. Call this on every user message that contains specific trip info.

Do NOT include MEDIUM-confidence extractions here — for phrases like "maybe Nice" or "possibly 4 nights", use confirm_changes first. Do NOT include LOW-confidence mentions (e.g. "I've heard good things about Lyon"). When in doubt, leave the field out and clarify in text.`,
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
      tripIntent: {
        type: 'string',
        description: 'The user’s overall trip purpose or vibe, e.g. "first Europe trip", "romantic food trip", "family-friendly rail adventure".',
      },
      targetRegions: {
        type: 'array',
        items: { type: 'string' },
        description: 'Countries, regions, or broad destination areas the user wants considered but has not yet converted into specific city stops, e.g. "Albania", "Romania", "the Balkans". Do not put these in cities unless a specific city is named.',
      },
      intentSignals: {
        type: 'array',
        items: { type: 'string' },
        description: 'Natural-language signals about what the trip should feel like or optimize for.',
      },
      hardConstraints: {
        type: 'array',
        items: { type: 'string' },
        description: 'Non-negotiable requirements, e.g. "must be in Paris on June 12", "no flights", "needs wheelchair access".',
      },
      negativeConstraints: {
        type: 'array',
        items: { type: 'string' },
        description: 'Things the user wants to avoid, e.g. "no early mornings", "avoid museums", "avoid extreme heat".',
      },
      assumptions: {
        type: 'array',
        items: { type: 'string' },
        description: 'Useful assumptions explicitly stated by the user or clearly implied by their wording.',
      },
      notes: {
        type: 'array',
        items: { type: 'string' },
        description: 'Other relevant planning notes that should remain visible in the travel brief.',
      },
    },
  },
};

const remove_cities = {
  name: 'remove_cities',
  description: `Remove one or more cities from the current route. Use this whenever the user drops, swaps, or replaces a city — do NOT simply omit dropped cities from extract_trip_data (extract_trip_data is additive and cannot remove cities).

Examples of when to call remove_cities:
- "actually skip Menton" → remove_cities({ cities: ["menton"] })
- "replace Berlin with Prague" → remove_cities({ cities: ["berlin"] }) THEN extract_trip_data with Prague
- "just Paris and Nice, drop the rest" → remove_cities for every other city currently on the route

Pass canonical city ids when known, otherwise the city name. Matching is case-insensitive and tries id first, then name.`,
  input_schema: {
    type: 'object',
    properties: {
      cities: {
        type: 'array',
        items: { type: 'string' },
        description: 'City ids or names to remove from route.cities.',
      },
    },
    required: ['cities'],
  },
};

const set_accommodation = {
  name: 'set_accommodation',
  description: `Record or update accommodation/lodging for one city already on the route. Use when the user states or pastes lodging info: hotel name, address, check-in/out dates, confirmation number, or notes about the stay.

Only set the fields the user actually mentioned. Passing an empty string or null clears that field. To clear all accommodation, pass null for every known field.

Examples:
- "I booked the Hotel Ritz in Paris from June 12 to June 15" →
  set_accommodation({ cityRef: "paris", name: "Hotel Ritz", checkIn: "2025-06-12", checkOut: "2025-06-15" })
- "the Barcelona Airbnb is on Carrer de Mallorca, confirmation BCN-9931" →
  set_accommodation({ cityRef: "barcelona", address: "Carrer de Mallorca", confirmationNumber: "BCN-9931" })

Match cityRef by canonical id when known, otherwise the city name. The city must already be on the route — if it is not, call extract_trip_data first.`,
  input_schema: {
    type: 'object',
    properties: {
      cityRef: {
        type: 'string',
        description: 'City id or name. Must reference a city already on route.cities.',
      },
      name: { type: 'string', description: 'Hotel / lodging name. Empty string clears.' },
      address: { type: 'string', description: 'Street address. Empty string clears.' },
      checkIn: { type: 'string', description: 'Check-in date YYYY-MM-DD. Empty string clears.' },
      checkOut: { type: 'string', description: 'Check-out date YYYY-MM-DD. Empty string clears.' },
      confirmationNumber: { type: 'string', description: 'Booking confirmation. Empty string clears.' },
      notes: { type: 'string', description: 'Free-form notes about the stay. Empty string clears.' },
    },
    required: ['cityRef'],
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
  description: 'Get scored city suggestions near a starting city, optionally bounded by a destination. Use when the user asks "where should I go?" or wants stops between two cities.',
  input_schema: {
    type: 'object',
    properties: {
      fromCityId: { type: 'string' },
      toCityId: { type: 'string' },
      startDate: { type: 'string', description: 'YYYY-MM-DD start date for ranking context' },
      endDate: { type: 'string', description: 'YYYY-MM-DD end date for ranking context' },
      interests: { type: 'array', items: { type: 'string' } },
      budget: { type: 'string' },
      pace: { type: 'string' },
      maxResults: { type: 'number' },
    },
    required: ['fromCityId'],
  },
};

const get_city_info = {
  name: 'get_city_info',
  description: 'Get the canonical description, country, region, and tourism categories for a city in the database. Useful for justifying a suggestion or answering "what is this city like?". Does NOT return live weather or events.',
  input_schema: {
    type: 'object',
    properties: {
      cityId: { type: 'string' },
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
  description: 'Display a city picker with optional suggestions. Use only when the user explicitly needs to add, replace, or choose a city. If assistant prose asks the user to choose specific cities, call this tool with those same suggestions so the UI can show preview map pins. For broad regions, include regionFocus and routeRole so the UI can show whether a city is a gateway, coastal base, castle base, etc. Do not use this when asking about trip vibe, interests, pace, budget, dates, or whether to draft.',
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
            reason: { type: 'string' },
            regionFocus: { type: 'string', description: 'Broad region this city helps satisfy, e.g. "Albanian Riviera" or "Romania".' },
            routeRole: { type: 'string', description: 'Role in the route, e.g. "coastal base", "flight gateway", "castle base", "arrival hub".' },
            nextStep: { type: 'string', description: 'What the planner should guide after selection, e.g. "assign coast nights" or "compare flights".' },
            transportNote: { type: 'string', description: 'Brief transport implication to show or preserve after selection.' },
            travelTime: { type: 'string' },
            score: { type: 'number' },
            rank: { type: 'number' },
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
  description: 'Display clickable option buttons for quick non-city choices. Use for actual interaction points only, such as route style, transport preference, or draft/refine decisions.',
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
  description: 'Display a calendar date picker only when the next interaction is selecting dates or a flexible travel window.',
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
  description: 'Display a per-city nights allocation widget only for already-confirmed cities. Do not use it for choosing new suggested stops.',
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

const confirm_changes = {
  name: 'confirm_changes',
  description: 'Show proposed changes to the trip and ask the user to confirm before applying. Use when: (1) user changes something previously set, (2) multiple fields change at once, (3) a medium-confidence extraction needs validation.',
  input_schema: {
    type: 'object',
    properties: {
      changes: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            field: { type: 'string', description: 'What is changing (e.g. "end city", "budget", "dates")' },
            from: { type: 'string', description: 'Previous value (null if new)' },
            to: { type: 'string', description: 'Proposed new value' },
            confidence: { type: 'string', enum: ['high', 'medium'], description: 'Extraction confidence' },
          },
          required: ['field', 'to'],
        },
      },
      summary: { type: 'string', description: 'One-line summary of the proposed changes' },
    },
    required: ['changes', 'summary'],
  },
};

// ── EXPORTS ──────────────────────────────────────────────────────

export const TOOLS_V2 = [
  // Extraction
  extract_trip_data,
  remove_cities,
  set_accommodation,
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
  confirm_changes,
  finalize_trip,
];

// Tools whose results should continue the agentic loop
// (Claude needs to see the result to formulate the next response)
export const DATA_TOOLS = new Set([
  'extract_trip_data',
  'remove_cities',
  'set_accommodation',
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
  'confirm_changes',
  'finalize_trip',
]);
