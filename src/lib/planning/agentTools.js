/**
 * Shared agent tools and prompt for both OpenAI and Bedrock Converse agent routes.
 * Used by: /api/plan/agent (OpenAI), /api/plan/agent-bedrock (Bedrock Converse).
 */

import { getCityData } from '@/lib/data-utils';
import { getPlaceDetails, getNearbyPlaces } from '@/lib/google-places/index';
import { getTripWithDetails, swapActivity } from '@/lib/trips/tripState';

// ── OpenAI tool definitions (for /api/plan/agent) ───────────────────────────

export const OPENAI_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_city_attractions',
      description:
        'Returns curated attractions for a city, optionally filtered by interest categories. ' +
        'Always call this before recommending any new attraction not already in the plan.',
      parameters: {
        type: 'object',
        required: ['city'],
        properties: {
          city: { type: 'string', description: 'City slug e.g. "barcelona"' },
          interests: {
            type: 'array',
            items: { type: 'string' },
            description: 'Interest tags to filter by e.g. ["food", "history", "outdoor"]',
          },
          exclude_names: {
            type: 'array',
            items: { type: 'string' },
            description: 'Attraction names already in the plan that should be excluded from results',
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_place_details',
      description:
        'Fetches live Google Places data for a specific place: current opening hours, rating, ' +
        'review count, price level, and photo references. Use this to verify a place before swapping it in.',
      parameters: {
        type: 'object',
        required: ['place_id'],
        properties: {
          place_id: { type: 'string', description: 'Google Place ID' },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_nearby',
      description:
        'Finds places near a geographic location using Google Nearby Search. Useful when looking ' +
        'for restaurant alternatives, cafes, or unexpected discoveries near a point on the itinerary.',
      parameters: {
        type: 'object',
        required: ['latitude', 'longitude', 'type'],
        properties: {
          latitude: { type: 'number' },
          longitude: { type: 'number' },
          type: {
            type: 'string',
            description: 'Place type e.g. "restaurant", "museum", "park", "cafe"',
          },
          radius: { type: 'number', description: 'Search radius in meters, default 500' },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_itinerary',
      description:
        'Swaps an existing activity in the itinerary with a new one. Persists the change to the ' +
        'database and emits an activity_updated event so the UI refreshes immediately. ' +
        'You MUST call get_city_attractions or get_place_details first to get accurate details for the new activity.',
      parameters: {
        type: 'object',
        required: ['trip_id', 'activity_id', 'new_activity', 'reason'],
        properties: {
          trip_id: { type: 'string' },
          activity_id: { type: 'string', description: 'ID of the existing trip_activity row to replace' },
          reason: { type: 'string', description: 'Human-readable reason for the swap shown in the UI' },
          new_activity: {
            type: 'object',
            required: ['name'],
            properties: {
              name: { type: 'string' },
              type: { type: 'string' },
              description: { type: 'string' },
              duration_minutes: { type: 'number' },
              price_range: { type: 'string' },
              latitude: { type: 'number' },
              longitude: { type: 'number' },
              neighborhood: { type: 'string' },
              indoor: { type: 'boolean' },
              booking_url: { type: 'string' },
              google_place_id: { type: 'string' },
            },
            additionalProperties: false,
          },
        },
        additionalProperties: false,
      },
    },
  },
];

// ── Bedrock Converse API toolConfig (for /api/plan/agent-bedrock) ────────────

export const BEDROCK_TOOL_CONFIG = {
  tools: [
    {
      toolSpec: {
        name: 'get_city_attractions',
        description:
          'Returns curated attractions for a city, optionally filtered by interest categories. ' +
          'Always call this before recommending any new attraction not already in the plan.',
        inputSchema: {
          json: {
            type: 'object',
            properties: {
              city: { type: 'string', description: 'City slug e.g. "barcelona"' },
              interests: {
                type: 'array',
                items: { type: 'string' },
                description: 'Interest tags to filter by e.g. ["food", "history", "outdoor"]',
              },
              exclude_names: {
                type: 'array',
                items: { type: 'string' },
                description: 'Attraction names already in the plan that should be excluded from results',
              },
            },
            required: ['city'],
          },
        },
      },
    },
    {
      toolSpec: {
        name: 'get_place_details',
        description:
          'Fetches live Google Places data for a specific place: current opening hours, rating, ' +
          'review count, price level. Use this to verify a place before swapping it in.',
        inputSchema: {
          json: {
            type: 'object',
            properties: {
              place_id: { type: 'string', description: 'Google Place ID' },
            },
            required: ['place_id'],
          },
        },
      },
    },
    {
      toolSpec: {
        name: 'search_nearby',
        description:
          'Finds places near a geographic location using Google Nearby Search. Useful for ' +
          'restaurant alternatives, cafes, or discoveries near a point on the itinerary.',
        inputSchema: {
          json: {
            type: 'object',
            properties: {
              latitude: { type: 'number' },
              longitude: { type: 'number' },
              type: {
                type: 'string',
                description: 'Place type e.g. "restaurant", "museum", "park", "cafe"',
              },
              radius: { type: 'number', description: 'Search radius in meters, default 500' },
            },
            required: ['latitude', 'longitude', 'type'],
          },
        },
      },
    },
    {
      toolSpec: {
        name: 'update_itinerary',
        description:
          'Swaps an existing activity in the itinerary with a new one. Persists the change. ' +
          'Call get_city_attractions or get_place_details first to get accurate details for the new activity.',
        inputSchema: {
          json: {
            type: 'object',
            properties: {
              trip_id: { type: 'string' },
              activity_id: { type: 'string', description: 'ID of the existing trip_activity row to replace' },
              reason: { type: 'string', description: 'Human-readable reason for the swap' },
              new_activity: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  type: { type: 'string' },
                  description: { type: 'string' },
                  duration_minutes: { type: 'number' },
                  price_range: { type: 'string' },
                  latitude: { type: 'number' },
                  longitude: { type: 'number' },
                  neighborhood: { type: 'string' },
                  indoor: { type: 'boolean' },
                  booking_url: { type: 'string' },
                  google_place_id: { type: 'string' },
                },
                required: ['name'],
              },
            },
            required: ['trip_id', 'activity_id', 'new_activity', 'reason'],
          },
        },
      },
    },
  ],
};

// ── Tool executors ───────────────────────────────────────────────────────────

export async function execGetCityAttractions({ city, interests = [], exclude_names = [] }) {
  const cityData = await getCityData(city);
  if (!cityData) return { error: `No data found for city: ${city}` };

  let attractions = Array.isArray(cityData.attractions) ? cityData.attractions : [];

  if (interests.length > 0) {
    const interestLower = interests.map((i) => i.toLowerCase());
    attractions = attractions.filter((a) => {
      const text = `${a.type || ''} ${a.name || ''} ${a.description || ''}`.toLowerCase();
      return interestLower.some((tag) => text.includes(tag));
    });
  }

  const excludeLower = (exclude_names || []).map((n) => n.toLowerCase());
  attractions = attractions.filter((a) => !excludeLower.includes((a.name || '').toLowerCase()));

  const results = attractions.slice(0, 15).map((a) => ({
    name: a.name,
    type: a.type,
    description: a.description?.slice(0, 150),
    price_range: a.price_range,
    indoor: a.indoor,
    latitude: a.latitude,
    longitude: a.longitude,
    best_time: a.best_time,
  }));

  return { city, total: results.length, attractions: results };
}

export async function execGetPlaceDetails({ place_id }) {
  const FIELD_MASK = [
    'id', 'displayName', 'rating', 'userRatingCount',
    'currentOpeningHours', 'regularOpeningHours',
    'priceLevel', 'websiteUri', 'googleMapsUri', 'editorialSummary',
  ].join(',');

  try {
    const details = await getPlaceDetails(place_id, FIELD_MASK);
    return {
      place_id,
      name: details.displayName?.text || details.displayName,
      rating: details.rating,
      review_count: details.userRatingCount,
      open_now: details.currentOpeningHours?.openNow,
      weekday_hours: details.regularOpeningHours?.weekdayDescriptions,
      price_level: details.priceLevel,
      website: details.websiteUri,
      maps_url: details.googleMapsUri,
      summary: details.editorialSummary?.text,
    };
  } catch (err) {
    return { error: `Could not fetch details for ${place_id}: ${err.message}` };
  }
}

export async function execSearchNearby({ latitude, longitude, type, radius = 500 }) {
  const FIELD_MASK = [
    'places.id', 'places.displayName', 'places.rating',
    'places.userRatingCount', 'places.currentOpeningHours',
    'places.priceLevel', 'places.primaryType', 'places.editorialSummary',
    'places.location',
  ].join(',');

  try {
    const results = await getNearbyPlaces(
      { latitude, longitude },
      radius,
      [type],
      FIELD_MASK
    );
    const places = (results?.places || []).slice(0, 6).map((p) => ({
      place_id: p.id,
      name: p.displayName?.text || p.displayName,
      rating: p.rating,
      review_count: p.userRatingCount,
      open_now: p.currentOpeningHours?.openNow,
      type: p.primaryType,
      summary: p.editorialSummary?.text,
      latitude: p.location?.latitude,
      longitude: p.location?.longitude,
    }));
    return { location: { latitude, longitude }, type, radius, places };
  } catch (err) {
    return { error: `Nearby search failed: ${err.message}` };
  }
}

export async function execUpdateItinerary({ trip_id, activity_id, new_activity, reason }, emit) {
  try {
    const replacement = await swapActivity(activity_id, new_activity, reason);

    const trip = await getTripWithDetails(trip_id);
    let dayNumber = null;
    let timeBlock = null;
    for (const day of trip?.days || []) {
      for (const act of day.activities || []) {
        if (act.id === replacement.id) {
          dayNumber = day.day_number;
          timeBlock = act.time_block;
          break;
        }
      }
      if (dayNumber) break;
    }

    if (emit) {
      emit('activity_updated', {
        dayNumber,
        timeBlock,
        activityId: replacement.id,
        activity: {
          name: replacement.name,
          type: replacement.type,
          description: replacement.description,
          duration_minutes: replacement.duration_minutes,
          price_range: replacement.price_range,
          indoor: replacement.indoor,
          neighborhood: replacement.neighborhood,
          latitude: replacement.latitude,
          longitude: replacement.longitude,
          google_place_id: replacement.google_place_id,
          swap_reason: reason,
        },
      });
    }

    return { success: true, activity_id: replacement.id, name: replacement.name, reason };
  } catch (err) {
    return { error: `Failed to update itinerary: ${err.message}` };
  }
}

// ── System prompt and tool summary ────────────────────────────────────────────

export function buildSystemPrompt(trip, cityData) {
  const cityName = cityData?.name || trip?.city || 'this city';
  const country = cityData?.country || '';
  const dates = trip?.start_date && trip?.end_date
    ? `${trip.start_date} to ${trip.end_date}`
    : 'unknown dates';
  const interests = (trip?.interests || []).join(', ') || 'general sightseeing';
  const pace = trip?.pace || 3;
  const paceLabel = pace <= 2 ? 'relaxed (fewer activities, more downtime)'
    : pace <= 4 ? 'moderate (balanced mix)'
    : 'active (packed days, maximum coverage)';
  const budget = trip?.budget || 'moderate';

  const activitiesSummary = (trip?.days || []).map((day, i) => {
    const acts = (day.activities || []).map((a) =>
      `    - [ID:${a.id}] ${a.time_block}: ${a.name}${a.type ? ` (${a.type})` : ''}`
    ).join('\n');
    return `  Day ${day.day_number} (${day.date || `Day ${i + 1}`}):\n${acts || '    (no activities)'}`;
  }).join('\n');

  return `You are an expert travel planner assistant for EuroTrip Planner.

TRIP CONTEXT:
- City: ${cityName}, ${country}
- Dates: ${dates}
- Interests: ${interests}
- Pace: ${paceLabel}
- Budget: ${budget}

CURRENT ITINERARY:
${activitiesSummary || '  (no activities yet)'}

YOUR RULES:
1. You MUST call get_city_attractions before recommending any attraction not already in the plan. Never invent place names, addresses, or coordinates.
2. Before swapping an activity with update_itinerary, you MUST first call get_city_attractions (or get_place_details if you have a place_id) to get accurate details for the replacement.
3. When the user asks to swap/replace/change an activity, identify its [ID:xxx] from the itinerary above and use that exact ID in update_itinerary.
4. Respond conversationally — be concise, friendly, and specific. Explain what you're doing and why the new choice fits the user's interests and pace.
5. If the user asks a question rather than a change request, answer it directly without calling tools.
6. Do not add more than 1-2 new activities per turn unless explicitly asked.`;
}

export function buildToolSummary(name, args, result) {
  switch (name) {
    case 'get_city_attractions':
      return `Found ${result.attractions?.length ?? 0} attractions in ${args.city}`;
    case 'get_place_details':
      return result.error
        ? `Could not fetch details`
        : `${result.name} — ${result.open_now ? 'Open now' : result.open_now === false ? 'Closed now' : 'Hours unknown'}, ${result.rating ? `rated ${result.rating}` : 'no rating'}`;
    case 'search_nearby':
      return `Found ${result.places?.length ?? 0} nearby ${args.type}s`;
    case 'update_itinerary':
      return result.error ? `Update failed` : `Swapped in: ${result.name}`;
    default:
      return 'Tool executed';
  }
}
