/**
 * Lambda handler for the GooglePlaces action group.
 * Functions: get_place_details, search_nearby
 *
 * Calls the Google Places API (New) and returns results
 * in the Bedrock Agent response format.
 */

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const PLACES_BASE = 'https://places.googleapis.com/v1';

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

async function getPlaceDetails(placeId) {
  const fieldMask = [
    'id', 'displayName', 'rating', 'userRatingCount',
    'currentOpeningHours', 'regularOpeningHours',
    'priceLevel', 'websiteUri', 'googleMapsUri', 'editorialSummary',
  ].join(',');

  const res = await fetch(`${PLACES_BASE}/places/${placeId}`, {
    headers: {
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': fieldMask,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Places API error ${res.status}: ${errText}`);
  }

  const details = await res.json();
  return {
    place_id: placeId,
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
}

async function searchNearby(latitude, longitude, type, radius = 500) {
  const fieldMask = [
    'places.id', 'places.displayName', 'places.rating',
    'places.userRatingCount', 'places.currentOpeningHours',
    'places.priceLevel', 'places.primaryType', 'places.editorialSummary',
    'places.location',
  ].join(',');

  const res = await fetch(`${PLACES_BASE}/places:searchNearby`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': fieldMask,
    },
    body: JSON.stringify({
      includedTypes: [type],
      locationRestriction: {
        circle: {
          center: { latitude, longitude },
          radius,
        },
      },
      maxResultCount: 6,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Nearby Search error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const places = (data.places || []).map((p) => ({
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
}

export async function handler(event) {
  if (!API_KEY) {
    return bedrockResponse(event, { error: 'GOOGLE_PLACES_API_KEY not configured' });
  }

  const funcName = event.function;
  const params = Object.fromEntries(
    (event.parameters || []).map((p) => {
      let val = p.value;
      if (typeof val === 'string' && /^[\d.]+$/.test(val)) val = parseFloat(val);
      return [p.name, val];
    })
  );

  try {
    if (funcName === 'get_place_details') {
      if (!params.place_id) {
        return bedrockResponse(event, { error: 'place_id is required' });
      }
      const result = await getPlaceDetails(params.place_id);
      return bedrockResponse(event, result);
    }

    if (funcName === 'search_nearby') {
      if (!params.latitude || !params.longitude || !params.type) {
        return bedrockResponse(event, { error: 'latitude, longitude, and type are required' });
      }
      const result = await searchNearby(
        params.latitude,
        params.longitude,
        params.type,
        params.radius || 500
      );
      return bedrockResponse(event, result);
    }

    return bedrockResponse(event, { error: `Unknown function: ${funcName}` });
  } catch (err) {
    console.error(`[googlePlaces] ${funcName} error:`, err);
    return bedrockResponse(event, { error: err.message });
  }
}
