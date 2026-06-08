'use server';

import { NextResponse } from 'next/server';
import { buildMultiCityItinerary } from '@/lib/planning/buildMultiCityItinerary';
import { optimizeRoute } from '@/lib/planning/routeOptimizer';
import { deriveTripWindow, accommodationsByCity, getBookings } from '@/lib/planning/tripBookings';

function nightsBetween(start, end) {
  if (!start || !end) return null;
  const s = new Date(`${start}T00:00:00`);
  const e = new Date(`${end}T00:00:00`);
  if (Number.isNaN(s) || Number.isNaN(e)) return null;
  return Math.round((e - s) / 86400000);
}

/**
 * POST /api/trips/generate
 *
 * Generates an itinerary without requiring Supabase.
 * Returns the itinerary JSON directly for inline display.
 *
 * Body: {
 *   cities: [{ id, name, country }],
 *   start_date: 'YYYY-MM-DD',
 *   end_date: 'YYYY-MM-DD',
 *   interests?: string[],
 *   pace?: string,
 *   budget?: string,
 *   day_allocation?: { [cityId]: number },
 *   city_order?: string[],
 * }
 */
export async function POST(request) {
  try {
    const body = await request.json();

    const {
      cities,
      start_date,
      end_date,
      interests = [],
      pace = 'balanced',
      budget = 'moderate',
      day_allocation = null,
      city_order = null,
      weather_tolerance = null,
      travelers = null,
      dietary = [],
      mobility = null,
    } = body;

    // Validation
    const errors = [];
    if (!Array.isArray(cities) || cities.length < 1) {
      errors.push('At least 1 city is required.');
    }
    if (!start_date) errors.push('start_date is required.');
    if (!end_date) errors.push('end_date is required.');

    if (cities?.some(c => !c.id || !c.name)) {
      errors.push('Each city must have id and name fields.');
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(' ') }, { status: 400 });
    }

    // Determine city order
    let orderedCities = cities;

    if (city_order && Array.isArray(city_order)) {
      // Use explicit order
      const cityMap = Object.fromEntries(cities.map(c => [c.id, c]));
      orderedCities = city_order
        .map(id => cityMap[id])
        .filter(Boolean);
    } else if (cities.length >= 3) {
      // Optimize route for 3+ cities
      try {
        const result = optimizeRoute(cities, {
          startCity: cities[0].id,
          endCity: cities[cities.length - 1].id,
        });
        if (result?.routes?.[0]?.cities) {
          orderedCities = result.routes[0].cities;
        }
      } catch (e) {
        console.warn('[generate] Route optimization failed, using original order:', e.message);
      }
    }

    // Fold in captured flights + lodging when the client sent the full tripState
    // (the planner does). Constrain the window to the booked flights and re-fit
    // the night allocation so day-count, dates, and flights agree.
    const tripState = body.tripState || null;
    const flightWindow = tripState ? deriveTripWindow(tripState) : null;
    const effectiveStart = flightWindow?.startDate || start_date;
    const effectiveEnd = flightWindow?.endDate || end_date;

    let dayAllocation = day_allocation;
    const windowNights = nightsBetween(effectiveStart, effectiveEnd);
    const allocatedNights = dayAllocation
      ? Object.values(dayAllocation).reduce((a, b) => a + b, 0)
      : null;
    if (windowNights != null && allocatedNights != null && allocatedNights !== windowNights) {
      dayAllocation = null;
    }

    // Build the trip params object
    const trip = {
      start_date: effectiveStart,
      end_date: effectiveEnd,
      interests,
      pace,
      budget,
      weather_tolerance,
      travelers,
      dietary,
      mobility,
    };

    // Build the itinerary
    const itinerary = await buildMultiCityItinerary(trip, orderedCities, {
      dayAllocation,
      includeTransfers: true,
      accommodations: tripState ? accommodationsByCity(tripState) : {},
      flights: tripState ? getBookings(tripState) : [],
    });

    return NextResponse.json({ itinerary });
  } catch (error) {
    console.error('[generate] Failed to generate itinerary:', error);
    return NextResponse.json(
      { error: 'Failed to generate itinerary. Please try again.' },
      { status: 500 }
    );
  }
}
