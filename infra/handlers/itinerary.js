/**
 * Lambda handler for the ItineraryMgmt action group.
 * Function: update_itinerary
 *
 * Swaps an existing activity in Supabase with a new one.
 * Uses the Supabase REST API directly (no ORM needed in Lambda).
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function bedrockResponse(event, result) {
  return {
    messageVersion: '1.0',
    response: {
      actionGroup: event.actionGroup,
      function: event.function,
      functionResponse: {
        responseBody: {
          TEXT: { body: JSON.stringify(result) },
        },
      },
    },
  };
}

async function supabaseRequest(method, path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': method === 'POST' ? 'return=representation' : 'return=representation',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Supabase ${method} ${path}: ${res.status} ${errText}`);
  }

  const data = await res.json();
  return Array.isArray(data) ? data[0] : data;
}

export async function handler(event) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return bedrockResponse(event, { error: 'Supabase credentials not configured' });
  }

  const params = Object.fromEntries(
    (event.parameters || []).map((p) => {
      let val = p.value;
      if (typeof val === 'string') {
        try { val = JSON.parse(val); } catch { /* keep as string */ }
      }
      return [p.name, val];
    })
  );

  const { activity_id, new_activity, reason } = params;

  if (!activity_id || !new_activity || !reason) {
    return bedrockResponse(event, {
      error: 'activity_id, new_activity, and reason are required',
    });
  }

  try {
    const original = await supabaseRequest(
      'PATCH',
      `trip_activities?id=eq.${activity_id}`,
      { status: 'weather_swapped' }
    );

    if (!original) {
      return bedrockResponse(event, { error: `Activity ${activity_id} not found` });
    }

    const newActivity = typeof new_activity === 'string'
      ? JSON.parse(new_activity)
      : new_activity;

    const replacement = await supabaseRequest('POST', 'trip_activities', {
      trip_day_id: original.trip_day_id,
      time_block: original.time_block,
      sort_order: original.sort_order,
      name: newActivity.name,
      type: newActivity.type || null,
      description: newActivity.description || null,
      duration_minutes: newActivity.duration_minutes || null,
      price_range: newActivity.price_range || null,
      latitude: newActivity.latitude || null,
      longitude: newActivity.longitude || null,
      neighborhood: newActivity.neighborhood || null,
      indoor: newActivity.indoor ?? false,
      booking_url: newActivity.booking_url || null,
      google_place_id: newActivity.google_place_id || null,
      original_activity_id: activity_id,
      swap_reason: reason,
      status: 'planned',
    });

    return bedrockResponse(event, {
      success: true,
      activity_id: replacement.id,
      name: replacement.name,
      reason,
    });
  } catch (err) {
    console.error('[itinerary] update error:', err);
    return bedrockResponse(event, { error: `Failed to update itinerary: ${err.message}` });
  }
}
