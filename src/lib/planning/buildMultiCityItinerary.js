import { buildItineraryWithRouting } from './buildItinerary.js';
import { allocateDays } from './dayAllocator.js';
import { getConnectionBetweenCities } from './routeOptimizer.js';
import { getCityData } from '../data-utils.js';
import { enrichItineraryLLM } from './enrichItineraryLLM.js';
import { pickInbound, pickOutbound, matchFlight } from './tripBookings.js';
import { assignFlightDayClockTimes } from './assignClockTimes.js';
import { addDays, format } from 'date-fns';

/** Map trip.pace (number 0–100 or 'relaxed'|'balanced'|'active') to a clock-time anchor label. */
function paceLabelFor(pace) {
  if (typeof pace === 'number') return pace <= 35 ? 'relaxed' : pace >= 70 ? 'active' : 'moderate';
  return pace === 'relaxed' || pace === 'active' ? pace : 'moderate';
}

/**
 * Multi-City Itinerary Builder
 *
 * Orchestrates the generation of a unified itinerary across multiple cities
 * by calling buildItinerary for each city and inserting travel days.
 */

/**
 * Generate booking URL for transport (Trainline, Omio, Skyscanner)
 * @param {Object} transfer - Transfer details
 * @param {Date} travelDate - Date of travel
 * @returns {string} Booking URL
 */
function generateBookingUrl(transfer, travelDate) {
  const { from, to, transport } = transfer;
  const dateStr = format(travelDate, 'yyyy-MM-dd');

  // For trains, use Trainline
  if (transport.type === 'train') {
    const fromSlug = from.id.toLowerCase();
    const toSlug = to.id.toLowerCase();
    return `https://www.trainline.eu/search/${fromSlug}/${toSlug}/${dateStr}`;
  }

  // For flights, use Skyscanner (simplified, doesn't include airport codes)
  if (transport.type === 'flight') {
    const fromSlug = from.id.toLowerCase();
    const toSlug = to.id.toLowerCase();
    return `https://www.skyscanner.com/transport/flights/${fromSlug}/${toSlug}/${format(travelDate, 'yyMMdd')}`;
  }

  // For bus, use Omio
  if (transport.type === 'bus') {
    return `https://www.omio.com/search/bus/from/${from.id}/to/${to.id}/departure/${dateStr}`;
  }

  // Generic Omio link for other transport types
  return `https://www.omio.com/search/from/${from.id}/to/${to.id}/departure/${dateStr}`;
}

/**
 * Default transport when no curated connection data exists between two cities.
 * Same country → train; different country → flight. Generic but honest so the
 * itinerary always shows a travel day with bookable estimates.
 * @param {boolean} sameCountry
 * @returns {Object} transport descriptor matching the connections.json shape
 */
function defaultTransport(sameCountry) {
  return sameCountry
    ? { type: 'train', journeyTime: '3–5h', priceRange: '€30–80', frequency: 'Several daily', trainType: null }
    : { type: 'flight', journeyTime: '1.5–3h', priceRange: '€60–180', frequency: 'Daily', trainType: null };
}

/**
 * Create a travel day object
 * @param {number} dayNumber - Day number in overall trip
 * @param {Date} date - Travel date
 * @param {Object} transfer - Transfer details (from routeOptimizer)
 * @returns {Object} Travel day object
 */
function createTravelDay(dayNumber, date, transfer) {
  const bookingUrl = generateBookingUrl(transfer, date);

  const transportIcons = {
    train: '🚆',
    flight: '✈️',
    bus: '🚌',
    ferry: '⛴️',
    car: '🚗'
  };

  const icon = transportIcons[transfer.transport.type] || '🚌';

  return {
    dayNumber,
    date: format(date, 'yyyy-MM-dd'),
    dateLabel: format(date, 'EEE, MMM d'),
    city: null,
    country: null,
    isTravelDay: true,
    theme: `${icon} Travel from ${transfer.from.name} to ${transfer.to.name}`,
    transfer: {
      from: {
        city: transfer.from.id,
        name: transfer.from.name,
        country: transfer.from.country
      },
      to: {
        city: transfer.to.id,
        name: transfer.to.name,
        country: transfer.to.country
      },
      transport: {
        type: transfer.transport.type,
        journeyTime: transfer.transport.journeyTime,
        priceRange: transfer.transport.priceRange,
        frequency: transfer.transport.frequency,
        trainType: transfer.transport.trainType,
        bookingUrl
      },
      bookedFlight: transfer.bookedFlight || null
    },
    timeBlocks: [
      {
        time: 'morning',
        startTime: '09:00',
        endTime: '12:00',
        activity: {
          name: `Travel from ${transfer.from.name} to ${transfer.to.name}`,
          type: 'transport',
          description: `Take ${transfer.transport.type} from ${transfer.from.name} to ${transfer.to.name}. Journey time: ${transfer.transport.journeyTime}. Book tickets in advance for best prices.`,
          duration: transfer.transport.journeyTime,
          price: transfer.transport.priceRange,
          bookingRequired: true,
          bookingUrl
        }
      },
      {
        time: 'afternoon',
        startTime: '14:00',
        endTime: '18:00',
        activity: {
          name: `Arrive in ${transfer.to.name}`,
          type: 'arrival',
          description: `Check into accommodation and explore the neighborhood. ${transfer.whyGo || `Welcome to ${transfer.to.name}!`}`,
          neighborhood: null
        }
      }
    ],
    tips: [
      `Journey time: ${transfer.transport.journeyTime}`,
      `Book your ${transfer.transport.type} ticket in advance`,
      transfer.transport.type === 'train' ? 'Arrive at station 15-20 minutes early' : 'Arrive at airport 2 hours early',
      `Pack essentials in carry-on for easy access during travel`
    ]
  };
}

/**
 * Build a multi-city itinerary
 * @param {Object} trip - Trip parameters
 * @param {Array} cities - Array of city objects in optimal order: [{id, name, country}, ...]
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Multi-city itinerary
 */
export async function buildMultiCityItinerary(trip, cities, options = {}) {
  const {
    dayAllocation = null,
    useAI = false,
    includeTransfers = true,
    routeOptimization = true,
    enrich = true,
    accommodations = {},
    flights = [],
  } = options;

  if (!cities || cities.length === 0) {
    throw new Error('At least 1 city required');
  }

  // Parse bare YYYY-MM-DD at LOCAL midnight so day numbering and per-day dates
  // don't drift back a day in timezones behind UTC (which also misaligns
  // seasonal event anchoring).
  const parseLocal = (v) => {
    if (v instanceof Date) return v;
    const m = typeof v === 'string' && v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(v);
  };
  const startDate = parseLocal(trip.start_date);
  const endDate = parseLocal(trip.end_date);
  const tripDuration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

  // Step 1: Allocate days across cities (or use provided allocation)
  let allocation;
  if (dayAllocation) {
    allocation = {
      allocation: Object.entries(dayAllocation).map(([cityId, days]) => {
        const city = cities.find(c => c.id === cityId);
        return {
          city: cityId,
          name: city?.name || cityId,
          country: city?.country || '',
          days,
          rationale: `${days} days in ${city?.name || cityId}`
        };
      }),
      travelDays: cities.length - 1,
      totalCityDays: Object.values(dayAllocation).reduce((sum, d) => sum + d, 0),
      flexDays: 0
    };
  } else {
    allocation = await allocateDays(
      cities,
      tripDuration,
      trip.interests || [],
      trip.pace || 'balanced',
      { useAI, minDaysPerCity: 2 }
    );
  }

  // Step 2: Pre-load all city data in parallel
  const cityDataMap = new Map();
  await Promise.all(
    cities.map(async (city) => {
      try {
        const data = await getCityData(city.id);
        if (data) cityDataMap.set(city.id, data);
      } catch (e) {
        console.error(`Failed to load city data for ${city.id}:`, e.message);
      }
    })
  );

  // Step 3: Build the itinerary per city.
  const allDays = [];
  const citySegments = [];
  const transfers = [];

  // 3a) Keep only cities we can actually build (have an allocation + data), and
  // schedule each one's day-numbers / dates up front. Travel days sit between
  // consecutive buildable cities. This is a cheap sequential pass — no awaits —
  // so the expensive per-city builds can then run in parallel.
  const buildable = [];
  for (const city of cities) {
    const cityAlloc = allocation.allocation.find(a => a.city === city.id);
    if (!cityAlloc) {
      console.warn(`No allocation found for city ${city.id}, skipping`);
      continue;
    }
    const cityData = cityDataMap.get(city.id);
    if (!cityData) {
      console.error(`No city data available for ${city.id}, skipping`);
      continue;
    }
    buildable.push({ city, cityAlloc, cityData });
  }

  let currentDayNumber = 1;
  let currentDate = new Date(startDate);
  buildable.forEach((entry, i) => {
    entry.startDayNumber = currentDayNumber;
    entry.startDate = new Date(currentDate);
    entry.cityTrip = {
      ...trip,
      city: entry.city.id,
      start_date: format(entry.startDate, 'yyyy-MM-dd'),
      end_date: format(addDays(entry.startDate, entry.cityAlloc.days - 1), 'yyyy-MM-dd'),
    };
    currentDayNumber += entry.cityAlloc.days;
    currentDate = addDays(currentDate, entry.cityAlloc.days);
    if (i < buildable.length - 1 && includeTransfers) {
      entry.travelAfter = { dayNumber: currentDayNumber, date: new Date(currentDate) };
      currentDayNumber++;
      currentDate = addDays(currentDate, 1);
    }
  });

  // 3b) Build every city in parallel (each does its own routing + optional
  // curation), so an LLM curation pass fans out instead of running serially.
  const built = await Promise.all(
    buildable.map((entry) =>
      buildItineraryWithRouting(entry.cityTrip, entry.cityData, {
        routeOptimization,
        travelMode: 'WALK',
      })
    )
  );

  // 3c) Assemble days + travel days in order using the precomputed schedule.
  buildable.forEach((entry, i) => {
    const { city, cityAlloc, startDayNumber, startDate: segStart } = entry;
    const cityItinerary = built[i];

    const cityDays = cityItinerary.days.map((day, idx) => {
      const dayDate = addDays(segStart, idx);
      return {
        ...day,
        dayNumber: startDayNumber + idx,
        date: format(dayDate, 'yyyy-MM-dd'),
        dateLabel: format(dayDate, 'EEE, MMM d'),
        city: city.id,
        cityName: city.name,
        country: city.country,
        isTravelDay: false,
        // Lodging rides on the first day of the city; render surfaces it under
        // the city header (and the real town, e.g. Menton under a "Nice" node).
        accommodation: idx === 0 ? (accommodations[city.id] || null) : null,
      };
    });
    allDays.push(...cityDays);

    citySegments.push({
      city: city.id,
      name: city.name,
      country: city.country,
      days: cityAlloc.days,
      dayRange: `${startDayNumber}-${startDayNumber + cityAlloc.days - 1}`,
      rationale: cityAlloc.rationale,
      summary: cityItinerary.summary,
      routing: cityItinerary.routing || null,
    });

    if (entry.travelAfter) {
      const nextCity = buildable[i + 1].city;
      // Look up curated connection details; fall back to a sensible default when
      // a city has no connections.json so a travel day is ALWAYS inserted (and
      // always carries real from/to names — the curated lookup omits names).
      const connection = getConnectionBetweenCities(
        city.id,
        city.country,
        nextCity.id,
        nextCity.country
      );

      const transfer = {
        from: { id: city.id, name: city.name, country: city.country },
        to: { id: nextCity.id, name: nextCity.name, country: nextCity.country },
        transport: connection?.transport || defaultTransport(city.country === nextCity.country),
        whyGo: connection?.whyGo || null,
        // A real booked flight for this leg, when the user pasted one.
        bookedFlight: matchFlight(flights, city.name, nextCity.name) || null,
      };

      allDays.push(createTravelDay(entry.travelAfter.dayNumber, entry.travelAfter.date, transfer));
      transfers.push({
        from: city.id,
        to: nextCity.id,
        fromName: city.name,
        toName: nextCity.name,
        dayNumber: entry.travelAfter.dayNumber,
        date: format(entry.travelAfter.date, 'yyyy-MM-dd'),
        ...transfer.transport,
        bookingUrl: generateBookingUrl(transfer, entry.travelAfter.date),
      });
    }
  });

  // Frame the trip with the user's booked flights: inbound arrival on the first
  // real day, outbound departure on the last. Render shows an arrival/checkout
  // banner; lodging check-in/out come from each city's accommodation.
  const inbound = pickInbound(flights);
  const outbound = pickOutbound(flights);
  const firstCityDay = allDays.find((d) => !d.isTravelDay);
  const lastCityDay = [...allDays].reverse().find((d) => !d.isTravelDay);
  if (inbound && firstCityDay) firstCityDay.arrival = inbound;
  if (outbound && lastCityDay) lastCityDay.departure = outbound;

  // With realistic clock times on, re-anchor the framing days around the booked
  // flights: the arrival day starts after landing + a transit/settle-in buffer, and
  // the departure day ends before the traveler must leave for the airport. Gated on
  // the same flag as the per-city clock pass (which ran before arrival was attached).
  if (process.env.ITINERARY_CLOCK_TIMES === 'true') {
    const pace = paceLabelFor(trip.pace);
    if (inbound && firstCityDay) {
      Object.assign(firstCityDay, assignFlightDayClockTimes(firstCityDay, { pace, direction: 'arrival' }));
    }
    if (outbound && lastCityDay) {
      Object.assign(lastCityDay, assignFlightDayClockTimes(lastCityDay, { pace, direction: 'departure' }));
    }
  }

  // Step 3: Generate summary
  const totalCities = cities.length;
  const totalDays = allDays.length;
  const totalTravelDays = allDays.filter(d => d.isTravelDay).length;
  const totalCityDays = totalDays - totalTravelDays;

  const cityNames = cities.map(c => c.name).join(', ').replace(/, ([^,]*)$/, ' and $1');
  const routeType = cities.every(c => c.country === cities[0].country) ? 'multi-city' : 'multi-country';

  const summary = `Your ${totalDays}-day ${routeType} European adventure through ${cityNames}. ${totalCityDays} days exploring across ${totalCities} cities, ${totalTravelDays} travel day${totalTravelDays !== 1 ? 's' : ''}.`;

  const itinerary = {
    routeType,
    cities: citySegments,
    days: allDays,
    transfers,
    summary,
    meta: {
      totalDays,
      totalCities,
      totalCityDays,
      totalTravelDays,
      startDate: trip.start_date,
      endDate: trip.end_date,
      allocation: allocation.allocation
    }
  };

  // Optional LLM polish — narration + per-day themes. No-ops (returns the
  // deterministic itinerary unchanged) when disabled, keyless, or on any error.
  return enrich ? enrichItineraryLLM(itinerary, trip) : itinerary;
}

/**
 * Build a single-city itinerary (wrapper for backward compatibility)
 * @param {Object} trip - Trip parameters
 * @param {Object} cityData - City data
 * @returns {Object} Single-city itinerary
 */
export async function buildSingleCityItinerary(trip, cityData) {
  return buildItineraryWithRouting(trip, cityData);
}
