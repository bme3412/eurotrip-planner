'use server';

import { NextResponse } from 'next/server';
import { buildMultiCityItinerary } from '@/lib/planning/buildMultiCityItinerary';
import { optimizeRoute } from '@/lib/planning/routeOptimizer';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * Validate and normalize multi-city trip payload
 */
function normalizeMultiCityPayload(input) {
  const errors = [];

  const cities = Array.isArray(input.cities) ? input.cities : [];
  const startDate = input.start_date;
  const endDate = input.end_date;
  const interests = Array.isArray(input.interests) ? input.interests : [];
  const pace = typeof input.pace === 'string' ? input.pace : 'balanced';
  const budget = typeof input.budget === 'string' ? input.budget.trim() : '';
  const routeTemplate = typeof input.route_template === 'string' ? input.route_template : null;
  const routeType = input.route_type || 'multi-city';

  // Optional day allocation (if user manually adjusted)
  const dayAllocation = input.day_allocation && typeof input.day_allocation === 'object'
    ? input.day_allocation
    : null;

  // Optional city order (if user manually ordered cities)
  const cityOrder = Array.isArray(input.city_order) ? input.city_order : null;

  const userEmail =
    typeof input.user_email === 'string' && input.user_email.trim().length > 0
      ? input.user_email.trim()
      : null;

  const userId =
    typeof input.user_id === 'string' && input.user_id.trim().length > 0
      ? input.user_id.trim()
      : null;

  // Validation
  if (cities.length < 2) {
    errors.push('At least 2 cities required for multi-city trip.');
  }

  // Validate each city has required fields
  for (const city of cities) {
    if (!city.id || !city.name) {
      errors.push(`Each city must have 'id' and 'name' fields.`);
      break;
    }
  }

  if (!startDate) errors.push('Start date is required.');
  if (!endDate) errors.push('End date is required.');
  if (!budget) errors.push('Budget is required.');

  if (errors.length > 0) {
    return { errors };
  }

  // Calculate trip duration
  const start = new Date(startDate);
  const end = new Date(endDate);
  const tripDuration = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

  const payload = {
    user_email: userEmail,
    user_id: userId,
    cities,
    start_date: startDate,
    end_date: endDate,
    interests,
    pace,
    budget,
    route_template: routeTemplate,
    route_type: routeType,
    day_allocation: dayAllocation,
    city_order: cityOrder,
    tripDuration
  };

  return { payload };
}

/**
 * Create trip with days, activities, and transfers for multi-city itinerary
 */
async function createMultiCityTrip(payload, itinerary) {
  const supabase = await getSupabaseAdmin();

  // Generate title from cities
  const cityNames = payload.cities.map(c => c.name).join(', ').replace(/, ([^,]*)$/, ' & $1');
  const title = `${cityNames} Trip`;

  // Prepare cities JSONB array with day allocations
  const citiesWithDays = itinerary.cities.map((citySegment, idx) => ({
    id: citySegment.city,
    name: citySegment.name,
    country: citySegment.country,
    days: citySegment.days,
    arrival_date: itinerary.days.find(d => d.city === citySegment.city)?.date || null,
    departure_date: itinerary.days.filter(d => d.city === citySegment.city).slice(-1)[0]?.date || null,
    sequence: idx
  }));

  // Insert trip
  const { data: trip, error: tripErr } = await supabase
    .from('trips')
    .insert({
      user_email: payload.user_email,
      user_id: payload.user_id,
      city: payload.cities[0].id, // Keep backward compatibility
      cities: citiesWithDays,
      route_type: payload.route_type,
      route_template: payload.route_template,
      start_date: payload.start_date,
      end_date: payload.end_date,
      interests: payload.interests,
      pace: payload.pace,
      budget: payload.budget,
      status: 'planning',
      title,
      initial_plan: itinerary
    })
    .select()
    .single();

  if (tripErr) {
    console.error('[createMultiCityTrip] Failed to insert trip:', tripErr);
    throw tripErr;
  }

  // Insert trip_days and trip_activities
  const days = itinerary.days || [];

  for (let i = 0; i < days.length; i++) {
    const day = days[i];
    const dayDate = day.date || computeDayDate(payload.start_date, i);

    const { data: dayRow, error: dayErr } = await supabase
      .from('trip_days')
      .insert({
        trip_id: trip.id,
        day_number: day.dayNumber || i + 1,
        date: dayDate,
        city: day.city || null,
        country: day.country || null,
        is_travel_day: day.isTravelDay || false,
        theme: day.theme || null,
        notes: null
      })
      .select()
      .single();

    if (dayErr) {
      console.error(`[createMultiCityTrip] Failed to insert day ${i + 1}:`, dayErr);
      continue;
    }

    // Insert activities for this day
    const activities = extractActivities(day);

    if (activities.length > 0) {
      const rows = activities.map((act, j) => ({
        trip_day_id: dayRow.id,
        time_block: act.timeBlock || act.time || 'morning',
        sort_order: j,
        start_time: act.startTime || null,
        end_time: act.endTime || null,
        name: act.name,
        type: act.type || null,
        description: act.description || null,
        duration_minutes: act.durationMinutes || parseDuration(act.duration),
        price_range: act.price || act.priceRange || null,
        latitude: act.latitude || act.coordinates?.[1] || null,
        longitude: act.longitude || act.coordinates?.[0] || null,
        neighborhood: act.neighborhood || null,
        address: act.address || null,
        google_place_id: act.googlePlaceId || null,
        indoor: act.indoor ?? false,
        booking_required: !!act.bookingUrl || act.bookingRequired || false,
        booking_url: act.bookingUrl || null,
        status: 'planned'
      }));

      const { error: actErr } = await supabase.from('trip_activities').insert(rows);
      if (actErr) {
        console.error(`[createMultiCityTrip] Failed to insert activities for day ${i + 1}:`, actErr);
      }
    }
  }

  // Insert trip_transfers
  const transfers = itinerary.transfers || [];

  if (transfers.length > 0) {
    const transferRows = transfers.map((transfer, idx) => ({
      trip_id: trip.id,
      from_city: transfer.from,
      to_city: transfer.to,
      from_country: payload.cities.find(c => c.id === transfer.from)?.country || '',
      to_country: payload.cities.find(c => c.id === transfer.to)?.country || '',
      travel_date: transfer.date,
      sort_order: idx,
      transport_type: transfer.type,
      journey_time: transfer.journeyTime,
      price_range: transfer.priceRange,
      frequency: transfer.frequency,
      train_type: transfer.trainType || null,
      booking_url: transfer.bookingUrl || null,
      booked: false
    }));

    const { error: transferErr } = await supabase.from('trip_transfers').insert(transferRows);
    if (transferErr) {
      console.error('[createMultiCityTrip] Failed to insert transfers:', transferErr);
    }
  }

  return trip;
}

/**
 * Extract activities from a day object
 */
function extractActivities(day) {
  const activities = [];

  if (day.timeBlocks && Array.isArray(day.timeBlocks)) {
    day.timeBlocks.forEach(block => {
      if (block.activity) {
        activities.push({
          ...block.activity,
          timeBlock: block.time,
          startTime: block.startTime,
          endTime: block.endTime
        });
      }
    });
  }

  return activities;
}

/**
 * Parse duration string to minutes
 */
function parseDuration(durationStr) {
  if (!durationStr || typeof durationStr !== 'string') return null;

  const hours = durationStr.match(/(\d+)h/);
  const minutes = durationStr.match(/(\d+)m/);

  let totalMinutes = 0;
  if (hours) totalMinutes += parseInt(hours[1]) * 60;
  if (minutes) totalMinutes += parseInt(minutes[1]);

  return totalMinutes || null;
}

/**
 * Compute date for a specific day in the trip
 */
function computeDayDate(startDateStr, dayIndex) {
  const start = new Date(startDateStr);
  const dayDate = new Date(start);
  dayDate.setDate(start.getDate() + dayIndex);
  return dayDate.toISOString().split('T')[0]; // YYYY-MM-DD
}

/**
 * POST /api/trips/multi-city
 *
 * Create a multi-city trip with optimized routing and day allocation
 */
export async function POST(request) {
  let body;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { payload, errors } = normalizeMultiCityPayload(body);

  if (errors?.length) {
    return NextResponse.json({ error: errors.join(' ') }, { status: 400 });
  }

  try {
    // Step 1: Optimize route if city order not provided
    let orderedCities = payload.cities;

    if (!payload.city_order) {
      console.log('[multi-city] Optimizing route for cities:', payload.cities.map(c => c.name));

      const optimized = optimizeRoute(payload.cities, {
        startCity: payload.cities[0].id, // Start with first city
        preferTrains: true
      });

      // Use fastest route by default
      const fastestRoute = optimized.routes.find(r => r.variant === 'fastest');
      if (fastestRoute) {
        orderedCities = fastestRoute.cities;
        console.log('[multi-city] Optimized route order:', orderedCities.map(c => c.name));
      }
    } else {
      // User provided custom order
      orderedCities = payload.city_order.map(idx => payload.cities[idx]);
    }

    // Step 2: Build multi-city itinerary
    console.log('[multi-city] Building itinerary for', payload.tripDuration, 'days');

    const itinerary = await buildMultiCityItinerary(
      {
        start_date: payload.start_date,
        end_date: payload.end_date,
        interests: payload.interests,
        pace: payload.pace,
        budget: payload.budget
      },
      orderedCities,
      {
        dayAllocation: payload.day_allocation,
        useAI: false, // Set to true to use AI-generated rationale
        includeTransfers: true
      }
    );

    console.log('[multi-city] Itinerary generated:', {
      totalDays: itinerary.days.length,
      cities: itinerary.cities.length,
      transfers: itinerary.transfers.length
    });

    // Step 3: Save to database
    const trip = await createMultiCityTrip(payload, itinerary);

    return NextResponse.json(
      {
        ...trip,
        itinerary_preview: {
          totalDays: itinerary.meta.totalDays,
          totalCities: itinerary.meta.totalCities,
          summary: itinerary.summary
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[multi-city] Failed to create trip:', error);

    const isConfigError =
      error?.message?.includes('Missing') && error?.message?.includes('environment variable');

    const userMessage = isConfigError
      ? 'Trip storage requires Supabase configuration. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local to enable trip saving.'
      : error?.message || 'Failed to create multi-city trip. Please try again later.';

    return NextResponse.json({ error: userMessage }, { status: isConfigError ? 503 : 500 });
  }
}
