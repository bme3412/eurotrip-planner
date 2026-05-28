import fs from 'fs';
import path from 'path';

/**
 * Route Optimizer for Multi-City Trip Planning
 *
 * Uses city connections data to suggest optimal city sequences based on:
 * - Travel time (fastest route)
 * - Cost (cheapest route)
 * - Scenic value (most scenic train routes)
 */

// Cache for loaded connections data
const connectionsCache = new Map();

/**
 * Load connections data for a city
 * @param {string} cityId - City ID (e.g., 'paris')
 * @param {string} country - Country name (e.g., 'France')
 * @returns {Object|null} Connections data or null if not found
 */
function loadCityConnections(cityId, country) {
  const cacheKey = `${country}-${cityId}`;

  if (connectionsCache.has(cacheKey)) {
    return connectionsCache.get(cacheKey);
  }

  try {
    const filePath = path.join(
      process.cwd(),
      'public',
      'data',
      country,
      cityId,
      'sections',
      'connections.json'
    );

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(fileContent);

    connectionsCache.set(cacheKey, data);
    return data;
  } catch (error) {
    console.error(`Failed to load connections for ${cityId}, ${country}:`, error.message);
    return null;
  }
}

/**
 * Parse journey time to minutes
 * @param {string} timeStr - Time string like "2h", "1h30m", "45m"
 * @returns {number} Time in minutes
 */
function parseTimeToMinutes(timeStr) {
  if (!timeStr) return Infinity;

  const hours = timeStr.match(/(\d+)h/);
  const minutes = timeStr.match(/(\d+)m/);

  let totalMinutes = 0;
  if (hours) totalMinutes += parseInt(hours[1]) * 60;
  if (minutes) totalMinutes += parseInt(minutes[1]);

  return totalMinutes || Infinity;
}

/**
 * Parse price range to average price in EUR
 * @param {string} priceStr - Price string like "€25-80", "£50-120"
 * @returns {number} Average price in EUR
 */
function parsePriceToEur(priceStr) {
  if (!priceStr) return Infinity;

  // Extract currency and numbers
  const match = priceStr.match(/[€£](\d+)-(\d+)/);
  if (!match) return Infinity;

  const low = parseInt(match[1]);
  const high = parseInt(match[2]);
  const avgPrice = (low + high) / 2;

  // Convert GBP to EUR (approximate 1.15 rate)
  if (priceStr.includes('£')) {
    return avgPrice * 1.15;
  }

  return avgPrice;
}

/**
 * Build distance matrix for cities
 * @param {Array} cities - Array of city objects: [{id, name, country}, ...]
 * @returns {Map} Distance matrix with travel options
 */
function buildDistanceMatrix(cities) {
  const matrix = new Map();

  for (let i = 0; i < cities.length; i++) {
    const fromCity = cities[i];
    const connections = loadCityConnections(fromCity.id, fromCity.country);

    if (!connections || !connections.destinations) continue;

    for (let j = 0; j < cities.length; j++) {
      if (i === j) continue;

      const toCity = cities[j];
      const destination = connections.destinations.find(
        d => d.city.toLowerCase() === toCity.name.toLowerCase()
      );

      if (!destination) continue;

      const key = `${fromCity.id}-${toCity.id}`;

      // Determine best transport option
      const transport = selectBestTransport(destination, fromCity.country === toCity.country);

      matrix.set(key, {
        from: fromCity,
        to: toCity,
        transport,
        timeMinutes: parseTimeToMinutes(transport.journeyTime),
        priceEur: parsePriceToEur(transport.priceRange),
        scenic: transport.type === 'train' && transport.trainType?.includes('TGV') ? 2 : 1,
        whyGo: destination.whyGo
      });
    }
  }

  return matrix;
}

/**
 * Select best transport option between two cities
 * @param {Object} destination - Destination object from connections data
 * @param {boolean} sameCountry - Whether cities are in same country
 * @returns {Object} Transport details
 */
function selectBestTransport(destination, sameCountry) {
  // Prefer train for same-country routes
  if (sameCountry && destination.directWithinCountryTrain) {
    return {
      type: 'train',
      ...destination.directWithinCountryTrain,
      journeyTime: destination.directWithinCountryTrain.journeyTime
    };
  }

  // Use flight for international routes
  if (destination.intraEuropeFlight) {
    return {
      type: 'flight',
      journeyTime: destination.intraEuropeFlight.approxFlightTime,
      frequency: destination.intraEuropeFlight.frequency,
      priceRange: destination.intraEuropeFlight.priceRange
    };
  }

  // Fallback to train if available
  if (destination.directWithinCountryTrain) {
    return {
      type: 'train',
      ...destination.directWithinCountryTrain,
      journeyTime: destination.directWithinCountryTrain.journeyTime
    };
  }

  return {
    type: 'unknown',
    journeyTime: null,
    priceRange: null
  };
}

/**
 * Greedy nearest-neighbor TSP approximation
 * @param {Array} cities - Array of city objects
 * @param {Map} matrix - Distance matrix
 * @param {string} optimizeFor - 'time', 'cost', or 'scenic'
 * @param {Object} options - Additional options (startCity, endCity)
 * @returns {Object} Route with order, total metrics, and transfers
 */
function greedyRoute(cities, matrix, optimizeFor, options = {}) {
  const { startCity, endCity } = options;

  let unvisited = [...cities];
  let route = [];
  let transfers = [];
  let totalTime = 0;
  let totalCost = 0;

  // Start with specified city or first city
  let current = startCity
    ? cities.find(c => c.id === startCity)
    : cities[0];

  if (!current) current = cities[0];

  route.push(current);
  unvisited = unvisited.filter(c => c.id !== current.id);

  // Greedy selection of next city
  while (unvisited.length > 0) {
    let bestNext = null;
    let bestScore = Infinity;
    let bestConnection = null;

    // If this is the last step and endCity is specified, force that city
    if (unvisited.length === 1 && endCity) {
      bestNext = unvisited.find(c => c.id === endCity) || unvisited[0];
    } else {
      // Find best next city based on optimization criterion
      for (const candidate of unvisited) {
        // Skip endCity until it's the last one
        if (endCity && candidate.id === endCity && unvisited.length > 1) {
          continue;
        }

        const key = `${current.id}-${candidate.id}`;
        const connection = matrix.get(key);

        if (!connection) continue;

        let score;
        switch (optimizeFor) {
          case 'time':
            score = connection.timeMinutes;
            break;
          case 'cost':
            score = connection.priceEur;
            break;
          case 'scenic':
            score = connection.timeMinutes / connection.scenic; // Prefer scenic even if slower
            break;
          default:
            score = connection.timeMinutes;
        }

        if (score < bestScore) {
          bestScore = score;
          bestNext = candidate;
          bestConnection = connection;
        }
      }

      if (!bestNext) {
        // No connection found, just pick first unvisited
        bestNext = unvisited[0];
      }
    }

    if (bestConnection) {
      transfers.push(bestConnection);
      totalTime += bestConnection.timeMinutes;
      totalCost += bestConnection.priceEur;
    }

    route.push(bestNext);
    current = bestNext;
    unvisited = unvisited.filter(c => c.id !== bestNext.id);
  }

  return {
    order: route.map(c => c.id),
    cities: route,
    transfers,
    totalTimeMinutes: totalTime,
    totalCostEur: Math.round(totalCost),
    variant: optimizeFor
  };
}

/**
 * Format time minutes to human-readable string
 * @param {number} minutes - Time in minutes
 * @returns {string} Formatted time (e.g., "5h30m")
 */
function formatTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (mins === 0) return `${hours}h`;
  return `${hours}h${mins}m`;
}

/**
 * Optimize route for multiple cities
 * @param {Array} cities - Array of city objects: [{id, name, country}, ...]
 * @param {Object} options - Options: {startCity, endCity, preferTrains, maxFlights}
 * @returns {Object} Optimized routes with 3 variants
 */
export function optimizeRoute(cities, options = {}) {
  if (!cities || cities.length < 2) {
    throw new Error('At least 2 cities required for route optimization');
  }

  // Build distance matrix
  const matrix = buildDistanceMatrix(cities);

  if (matrix.size === 0) {
    throw new Error('No connections found between cities. Please check city connections data.');
  }

  // Generate 3 route variants
  const fastest = greedyRoute(cities, matrix, 'time', options);
  const cheapest = greedyRoute(cities, matrix, 'cost', options);
  const scenic = greedyRoute(cities, matrix, 'scenic', options);

  return {
    routes: [
      {
        variant: 'fastest',
        label: 'Fastest Route',
        order: fastest.order,
        cities: fastest.cities,
        totalTime: formatTime(fastest.totalTimeMinutes),
        totalTimeMinutes: fastest.totalTimeMinutes,
        totalCost: `€${cheapest.totalCostEur}-${Math.round(cheapest.totalCostEur * 1.5)}`,
        totalCostEur: fastest.totalCostEur,
        transfers: fastest.transfers
      },
      {
        variant: 'scenic',
        label: 'Most Scenic',
        order: scenic.order,
        cities: scenic.cities,
        totalTime: formatTime(scenic.totalTimeMinutes),
        totalTimeMinutes: scenic.totalTimeMinutes,
        totalCost: `€${scenic.totalCostEur}-${Math.round(scenic.totalCostEur * 1.5)}`,
        totalCostEur: scenic.totalCostEur,
        transfers: scenic.transfers
      },
      {
        variant: 'cheapest',
        label: 'Most Budget-Friendly',
        order: cheapest.order,
        cities: cheapest.cities,
        totalTime: formatTime(cheapest.totalTimeMinutes),
        totalTimeMinutes: cheapest.totalTimeMinutes,
        totalCost: `€${cheapest.totalCostEur}-${Math.round(cheapest.totalCostEur * 1.5)}`,
        totalCostEur: cheapest.totalCostEur,
        transfers: cheapest.transfers
      }
    ],
    matrix // Return matrix for debugging
  };
}

/**
 * Get connection details between two specific cities
 * @param {string} fromCityId - Starting city ID
 * @param {string} fromCountry - Starting city country
 * @param {string} toCityId - Destination city ID
 * @param {string} toCountry - Destination city country
 * @returns {Object|null} Connection details or null if not found
 */
export function getConnectionBetweenCities(fromCityId, fromCountry, toCityId, toCountry) {
  const connections = loadCityConnections(fromCityId, fromCountry);

  if (!connections || !connections.destinations) return null;

  const destination = connections.destinations.find(
    d => d.city.toLowerCase() === toCityId.toLowerCase()
  );

  if (!destination) return null;

  return {
    from: { id: fromCityId, country: fromCountry },
    to: { id: toCityId, country: toCountry },
    transport: selectBestTransport(destination, fromCountry === toCountry),
    whyGo: destination.whyGo
  };
}
