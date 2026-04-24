'use server';

import { NextResponse } from 'next/server';
import { buildMultiCityItinerary } from '@/lib/planning/buildMultiCityItinerary';
import { optimizeRoute } from '@/lib/planning/routeOptimizer';

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

    // Build the trip params object
    const trip = {
      start_date,
      end_date,
      interests,
      pace,
      budget,
    };

    // Build the itinerary
    const itinerary = await buildMultiCityItinerary(trip, orderedCities, {
      dayAllocation: day_allocation,
      includeTransfers: true,
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
