import { buildItineraryWithRouting } from './buildItinerary.js';
import { allocateDays } from './dayAllocator.js';
import { getConnectionBetweenCities } from './routeOptimizer.js';
import { getCityData } from '../data-utils.js';
import { addDays, format } from 'date-fns';

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
      }
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
  } = options;

  if (!cities || cities.length === 0) {
    throw new Error('At least 1 city required');
  }

  const startDate = new Date(trip.start_date);
  const endDate = new Date(trip.end_date);
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

  // Step 3: Build itinerary for each city (sequential — order matters for transfers)
  const allDays = [];
  const citySegments = [];
  const transfers = [];

  let currentDayNumber = 1;
  let currentDate = new Date(startDate);

  for (let i = 0; i < cities.length; i++) {
    const city = cities[i];
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

    // Create temporary trip object for this city segment
    const cityTrip = {
      ...trip,
      city: city.id,
      start_date: format(currentDate, 'yyyy-MM-dd'),
      end_date: format(addDays(currentDate, cityAlloc.days - 1), 'yyyy-MM-dd')
    };

    // Build itinerary for this city
    const cityItinerary = await buildItineraryWithRouting(cityTrip, cityData, {
      routeOptimization,
      travelMode: 'WALK',
    });

    // Add city metadata to each day
    const cityDays = cityItinerary.days.map((day, idx) => {
      const dayDate = addDays(currentDate, idx);
      return {
        ...day,
        dayNumber: currentDayNumber + idx,
        date: format(dayDate, 'yyyy-MM-dd'),
        dateLabel: format(dayDate, 'EEE, MMM d'),
        city: city.id,
        cityName: city.name,
        country: city.country,
        isTravelDay: false
      };
    });

    allDays.push(...cityDays);

    citySegments.push({
      city: city.id,
      name: city.name,
      country: city.country,
      days: cityAlloc.days,
      dayRange: `${currentDayNumber}-${currentDayNumber + cityAlloc.days - 1}`,
      rationale: cityAlloc.rationale,
      summary: cityItinerary.summary,
      routing: cityItinerary.routing || null
    });

    currentDayNumber += cityAlloc.days;
    currentDate = addDays(currentDate, cityAlloc.days);

    // Insert travel day after this city (except for last city)
    if (i < cities.length - 1 && includeTransfers) {
      const nextCity = cities[i + 1];

      // Get connection details
      const connection = getConnectionBetweenCities(
        city.id,
        city.country,
        nextCity.id,
        nextCity.country
      );

      if (connection) {
        const travelDay = createTravelDay(currentDayNumber, currentDate, connection);
        allDays.push(travelDay);

        transfers.push({
          from: city.id,
          to: nextCity.id,
          fromName: city.name,
          toName: nextCity.name,
          dayNumber: currentDayNumber,
          date: format(currentDate, 'yyyy-MM-dd'),
          ...connection.transport,
          bookingUrl: generateBookingUrl(connection, currentDate)
        });

        currentDayNumber++;
        currentDate = addDays(currentDate, 1);
      }
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

  return {
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
