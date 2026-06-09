import { buildItineraryWithRouting } from './buildItinerary.js';
import { allocateDays } from './dayAllocator.js';
import { getConnectionBetweenCities } from './routeOptimizer.js';
import { getCityData } from '../data-utils.js';
import { enrichItineraryLLM } from './enrichItineraryLLM.js';
import { pickInbound, matchFlight } from './tripBookings.js';
import { assignFlightDayClockTimes } from './assignClockTimes.js';
import { planTripDays } from './tripDaySchedule.js';
import { addDays, format } from 'date-fns';

/** Realistic clock times run by default; set ITINERARY_CLOCK_TIMES=false to opt out. */
function clockTimesEnabled() {
  return process.env.ITINERARY_CLOCK_TIMES !== 'false';
}

const parseLocalDate = (iso) => new Date(`${iso}T00:00:00`);

/** Loose city-name match ("Nice"~"nice, fr", "Paris-DeGaulle"~"Paris") for flight↔city. */
function cityNameMatches(a, b) {
  const w = (s) => (s || '').toLowerCase().trim().split(/[\s,\-]+/)[0] || '';
  return Boolean(w(a)) && w(a) === w(b);
}

/** Find a city's accommodation, tolerant of id/slug/name case mismatches. */
function lookupAccommodation(accommodations, city) {
  if (!accommodations || !city) return null;
  const keys = [city.id, city.name].filter(Boolean);
  for (const k of keys) {
    if (accommodations[k]) return accommodations[k];
    const lc = String(k).toLowerCase();
    if (accommodations[lc]) return accommodations[lc];
  }
  // Last resort: case-insensitive scan.
  const want = new Set(keys.map((k) => String(k).toLowerCase()));
  for (const [k, v] of Object.entries(accommodations)) {
    if (want.has(String(k).toLowerCase())) return v;
  }
  return null;
}

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

  // 3a) Plan the calendar. Inter-city travel rides on the arrival day (a shared
  // date), so the trip spans exactly sum(nights)+1 days and each city's dates
  // stay inside its lodging window — no per-leg inflation.
  const schedule = planTripDays(
    buildable.map((e) => ({ nights: e.cityAlloc.days })),
    startDate,
    { includeTransfers },
  );
  const cityFirstDate = new Map();
  for (const slot of schedule.slots) {
    if (slot.kind === 'city' && !cityFirstDate.has(slot.cityIndex)) {
      cityFirstDate.set(slot.cityIndex, slot.date);
    }
  }
  buildable.forEach((entry, i) => {
    entry.activityDays = schedule.perCityActivityDays[i];
    const start = cityFirstDate.get(i);
    if (entry.activityDays > 0 && start) {
      entry.cityTrip = {
        ...trip,
        city: entry.city.id,
        start_date: start,
        end_date: format(addDays(parseLocalDate(start), entry.activityDays - 1), 'yyyy-MM-dd'),
      };
    }
  });

  // 3b) Build each city's day templates in parallel (routing + optional curation).
  const built = await Promise.all(
    buildable.map((entry) =>
      entry.activityDays > 0
        ? buildItineraryWithRouting(entry.cityTrip, entry.cityData, { routeOptimization, travelMode: 'WALK' })
        : Promise.resolve({ days: [], summary: null, routing: null }),
    ),
  );

  // 3c) Walk the schedule in calendar order, emitting travel + city day entries.
  const cityCursor = new Array(buildable.length).fill(0);
  for (const slot of schedule.slots) {
    if (slot.kind === 'travel') {
      const fromCity = buildable[slot.fromIndex].city;
      const toCity = buildable[slot.toIndex].city;
      const connection = getConnectionBetweenCities(fromCity.id, fromCity.country, toCity.id, toCity.country);
      const transfer = {
        from: { id: fromCity.id, name: fromCity.name, country: fromCity.country },
        to: { id: toCity.id, name: toCity.name, country: toCity.country },
        transport: connection?.transport || defaultTransport(fromCity.country === toCity.country),
        whyGo: connection?.whyGo || null,
        bookedFlight: matchFlight(flights, fromCity.name, toCity.name) || null,
      };
      allDays.push(createTravelDay(slot.dayNumber, parseLocalDate(slot.date), transfer));
      transfers.push({
        from: fromCity.id,
        to: toCity.id,
        fromName: fromCity.name,
        toName: toCity.name,
        dayNumber: slot.dayNumber,
        date: slot.date,
        ...transfer.transport,
        bookingUrl: generateBookingUrl(transfer, parseLocalDate(slot.date)),
      });
    } else {
      const entry = buildable[slot.cityIndex];
      const template = built[slot.cityIndex].days[cityCursor[slot.cityIndex]] || {};
      cityCursor[slot.cityIndex] += 1;
      allDays.push({
        ...template,
        dayNumber: slot.dayNumber,
        date: slot.date,
        dateLabel: format(parseLocalDate(slot.date), 'EEE, MMM d'),
        city: entry.city.id,
        cityName: entry.city.name,
        country: entry.city.country,
        isTravelDay: false,
        // Lodging rides on the city's first day; render surfaces it under the header.
        accommodation: slot.activityIndex === 0 ? (lookupAccommodation(accommodations, entry.city) || null) : null,
      });
    }
  }

  // City segments for grouping/labels (dayRange spans the city's travel + days).
  buildable.forEach((entry, i) => {
    const dayNums = schedule.slots.filter((s) => s.cityIndex === i).map((s) => s.dayNumber);
    citySegments.push({
      city: entry.city.id,
      name: entry.city.name,
      country: entry.city.country,
      days: entry.cityAlloc.days,
      dayRange: dayNums.length ? `${Math.min(...dayNums)}-${Math.max(...dayNums)}` : '',
      rationale: entry.cityAlloc.rationale,
      summary: built[i].summary,
      routing: built[i].routing || null,
    });
  });

  // Frame the trip with the user's booked flights: inbound arrival on the first
  // real day, outbound departure on the last — but ONLY when the flight's city
  // matches that end of the route. A round-trip booked from the first city
  // (open-jaw vs the actual last stop) must not paint a "Depart <first city>"
  // banner on the final day of a different city.
  const firstCityDay = allDays.find((d) => !d.isTravelDay);
  const lastCityDay = [...allDays].reverse().find((d) => !d.isTravelDay);
  // Inbound: the trip's arrival flight, attached only if it actually lands in the
  // first city. Outbound: the flight that LEAVES the last city — found by matching
  // its origin to the last city, so an onward return leg from a different airport
  // (e.g. a CDG→home connector) never paints a wrong "Depart <city>" banner.
  const inbound = pickInbound(flights);
  if (inbound && firstCityDay && cityNameMatches(inbound.toCity, firstCityDay.cityName)) {
    firstCityDay.arrival = inbound;
  }
  const outbound = lastCityDay
    ? flights.find((b) => b?.type === 'flight' && b.departureDate && cityNameMatches(b.fromCity, lastCityDay.cityName)) || null
    : null;
  if (outbound && lastCityDay) lastCityDay.departure = outbound;

  // Realistic clock times run by default (set ITINERARY_CLOCK_TIMES=false to opt
  // out). Re-anchor the framing days around the booked flights: the arrival day
  // starts after landing + a settle-in buffer, the departure day ends before the
  // traveler must leave for the airport. Runs after arrival/departure attach.
  if (clockTimesEnabled()) {
    const pace = paceLabelFor(trip.pace);
    if (firstCityDay?.arrival) {
      Object.assign(firstCityDay, assignFlightDayClockTimes(firstCityDay, { pace, direction: 'arrival' }));
    }
    if (lastCityDay?.departure) {
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
      // Derive from the actual assembled days so the header label always matches
      // what's rendered (never a stale/over-long end date).
      startDate: allDays[0]?.date || trip.start_date,
      endDate: allDays[allDays.length - 1]?.date || trip.end_date,
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
