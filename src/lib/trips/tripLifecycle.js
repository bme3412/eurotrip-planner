import { initialTripState } from '@/lib/conversation/tripState';

export const TRIP_LIFECYCLE_STATUSES = {
  DRAFT: 'draft',
  PLANNING: 'planning',
  ITINERARY_GENERATED: 'itinerary_generated',
  SHARED: 'shared',
  ARCHIVED: 'archived',
};

const PACE_TO_INT = {
  relaxed: 2,
  balanced: 3,
  active: 5,
};

export function getAnchorCities(tripState) {
  return [...(tripState?.route?.cities || [])]
    .filter((city) => city?.id && city?.name)
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
}

export function getTripTimeRange(tripState) {
  const dates = tripState?.dates || {};
  const exact = dates.startDate && dates.endDate;
  const flexible = dates.flexibleMonth && dates.totalNights;
  const nightsOnly = dates.totalNights;

  return {
    type: exact ? 'exact' : flexible ? 'flexible_month' : nightsOnly ? 'nights_only' : 'missing',
    startDate: dates.startDate || null,
    endDate: dates.endDate || null,
    flexibleMonth: dates.flexibleMonth || null,
    flexibility: dates.flexibility || null,
    totalNights: dates.totalNights || null,
  };
}

export function canPersistTripDraft(tripState) {
  return getAnchorCities(tripState).length > 0 && getTripTimeRange(tripState).type !== 'missing';
}

export function deriveTripTitle(tripState) {
  const cities = getAnchorCities(tripState);
  if (cities.length === 0) return 'Untitled Europe Trip';
  if (cities.length === 1) return `${cities[0].name} Trip`;
  const first = cities[0].name;
  const last = cities[cities.length - 1].name;
  return `${first} to ${last}`;
}

export function normalizeTripState(value) {
  return {
    ...initialTripState,
    ...(value || {}),
    route: {
      ...initialTripState.route,
      ...(value?.route || {}),
      cities: value?.route?.cities || [],
    },
    dates: {
      ...initialTripState.dates,
      ...(value?.dates || {}),
    },
    transport: {
      ...initialTripState.transport,
      ...(value?.transport || {}),
      bookings: value?.transport?.bookings || [],
    },
    preferences: {
      ...initialTripState.preferences,
      ...(value?.preferences || {}),
      interests: value?.preferences?.interests || [],
    },
    budget: {
      ...initialTripState.budget,
      ...(value?.budget || {}),
    },
    travelers: {
      ...initialTripState.travelers,
      ...(value?.travelers || {}),
      ages: value?.travelers?.ages || [],
      dietaryRestrictions: value?.travelers?.dietaryRestrictions || [],
      languages: value?.travelers?.languages || [],
    },
    brief: {
      ...initialTripState.brief,
      ...(value?.brief || {}),
      targetRegions: value?.brief?.targetRegions || [],
      intentSignals: value?.brief?.intentSignals || [],
      hardConstraints: value?.brief?.hardConstraints || [],
      negativeConstraints: value?.brief?.negativeConstraints || [],
      assumptions: value?.brief?.assumptions || [],
      notes: value?.brief?.notes || [],
    },
  };
}

export function buildTripDraftPayload(tripState, options = {}) {
  const normalized = normalizeTripState(tripState);
  const cities = getAnchorCities(normalized);
  const firstCity = cities[0] || null;
  const timeRange = getTripTimeRange(normalized);
  const routeType = cities.length <= 1
    ? 'single'
    : new Set(cities.map((city) => city.country).filter(Boolean)).size > 1
      ? 'multi-country'
      : 'multi-city';

  return {
    title: options.title || deriveTripTitle(normalized),
    user_id: options.userId || options.user_id || null,
    user_email: options.userEmail || options.user_email || null,
    city: firstCity?.id || firstCity?.name?.toLowerCase() || null,
    country: firstCity?.country || null,
    start_date: timeRange.startDate,
    end_date: timeRange.endDate,
    interests: normalized.preferences.interests || [],
    pace: PACE_TO_INT[normalized.preferences.pace] || null,
    budget: normalized.budget.style || null,
    prebookings: {
      transport: normalized.transport.bookings || [],
    },
    cities: cities.map((city) => ({
      id: city.id,
      name: city.name,
      country: city.country || null,
      latitude: city.latitude || null,
      longitude: city.longitude || null,
      role: city.role || 'stop',
      order: city.order ?? null,
      nights: city.nights || null,
      arrival_date: city.arrivalDate || null,
      departure_date: city.departureDate || null,
      notes: city.notes || null,
    })),
    route_type: routeType,
    city_sequence: cities.map((_, index) => index),
    trip_state: normalized,
    brief: normalized.brief,
    time_range: timeRange,
    status: options.status || TRIP_LIFECYCLE_STATUSES.DRAFT,
  };
}

/**
 * A coarse fingerprint of a trip used to detect duplicates. Works for both
 * synced trips (from /api/trips) and local drafts since both expose `title`,
 * `cities` and `time_range`. Pure — safe to import on the server.
 */
export function tripSignature(trip) {
  if (!trip) return '';
  const title = (trip.title || '').trim().toLowerCase();
  const cities = Array.isArray(trip.cities)
    ? trip.cities.map((city) => (city?.name || city?.id || '').toLowerCase()).join('>')
    : '';
  const tr = trip.time_range || {};
  let dates;
  if (tr.startDate && tr.endDate) {
    dates = `${tr.startDate}_${tr.endDate}`;
  } else if (tr.flexibleMonth) {
    dates = tr.flexibleMonth;
  } else if (tr.totalNights) {
    dates = `${tr.totalNights}n`;
  } else if (trip.start_date && trip.end_date) {
    dates = `${trip.start_date}_${trip.end_date}`;
  } else {
    dates = '';
  }
  return `${title}|${cities}|${dates}`;
}

export function summarizeTripForCard(trip) {
  const tripState = normalizeTripState(trip?.trip_state);
  const cities = getAnchorCities(tripState);
  const timeRange = trip?.time_range || getTripTimeRange(tripState);
  return {
    id: trip.id,
    title: trip.title || deriveTripTitle(tripState),
    status: trip.status || TRIP_LIFECYCLE_STATUSES.DRAFT,
    cities,
    timeRange,
    updatedAt: trip.updated_at || trip.created_at,
    isPublic: Boolean(trip.is_public),
    shareToken: trip.share_token || null,
    hasGeneratedItinerary: Boolean(trip.itinerary_generated_at || trip.days?.length),
  };
}
