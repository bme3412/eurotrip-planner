/**
 * Route Validator
 *
 * Analyzes proposed routes and provides soft guidance:
 * - Detects backtracking (going back the way you came)
 * - Detects long detours (adding significant travel time)
 * - Calculates route efficiency score
 *
 * All warnings are advisory - users can proceed with any route.
 */

import citiesData from '@/generated/cities.json';

// Build coordinate lookup from cities data
const cityCoords = {};
citiesData.forEach((c) => {
  if (c.latitude && c.longitude) {
    cityCoords[c.id] = { lat: c.latitude, lng: c.longitude };
  }
});

/**
 * Calculate bearing (direction) between two points in degrees
 */
function calculateBearing(from, to) {
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  return (Math.atan2(y, x) * 180) / Math.PI;
}

/**
 * Calculate haversine distance between two points in km
 */
function haversineDistance(from, to) {
  const R = 6371; // Earth radius in km
  const dLat = ((to.lat - from.lat) * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Detect backtracking in a route
 * Returns warnings when direction changes by more than 120 degrees
 */
function detectBacktracking(cities) {
  const warnings = [];

  for (let i = 1; i < cities.length - 1; i++) {
    const prev = cityCoords[cities[i - 1].id];
    const curr = cityCoords[cities[i].id];
    const next = cityCoords[cities[i + 1].id];

    if (!prev || !curr || !next) continue;

    const bearing1 = calculateBearing(prev, curr);
    const bearing2 = calculateBearing(curr, next);

    // Calculate the absolute difference in bearings
    let diff = Math.abs(bearing1 - bearing2);
    const normalizedDiff = diff > 180 ? 360 - diff : diff;

    // If direction changes by more than 120 degrees, it's backtracking
    if (normalizedDiff > 120) {
      warnings.push({
        type: 'backtrack',
        severity: 'warning',
        message: `Route doubles back at ${cities[i].name}`,
        cities: [cities[i - 1].name, cities[i].name, cities[i + 1].name],
        suggestion: `Consider visiting ${cities[i].name} in a different order`,
        angleDiff: Math.round(normalizedDiff),
      });
    }
  }

  return warnings;
}

/**
 * Calculate direct distance between start and end
 */
function calculateDirectDistance(startCity, endCity) {
  const start = cityCoords[startCity.id];
  const end = cityCoords[endCity.id];

  if (!start || !end) return 0;
  return haversineDistance(start, end);
}

/**
 * Detect if route is a significant detour
 */
function detectDetours(route, directDistance) {
  const warnings = [];

  // Calculate total route distance
  let totalDistance = 0;
  for (let i = 0; i < route.length - 1; i++) {
    const from = cityCoords[route[i].id];
    const to = cityCoords[route[i + 1].id];
    if (from && to) {
      totalDistance += haversineDistance(from, to);
    }
  }

  // If route is >50% longer than direct, warn
  if (directDistance > 0) {
    const detourRatio = totalDistance / directDistance;
    if (detourRatio > 1.5) {
      const extraPercent = Math.round((detourRatio - 1) * 100);
      warnings.push({
        type: 'detour',
        severity: 'info',
        message: `This route adds ${extraPercent}% extra distance`,
        totalDistance: Math.round(totalDistance),
        directDistance: Math.round(directDistance),
        suggestion: 'Consider a more direct path if time is limited',
      });
    }
  }

  return warnings;
}

/**
 * Calculate overall route efficiency score (0-100)
 */
function calculateEfficiencyScore(warnings) {
  let score = 100;

  warnings.forEach((warning) => {
    if (warning.type === 'backtrack') {
      score -= 15; // Each backtrack costs 15 points
    } else if (warning.type === 'detour') {
      // Deduct based on detour severity
      const extraPercent = warning.totalDistance / warning.directDistance - 1;
      score -= Math.min(extraPercent * 20, 25); // Max 25 point deduction
    }
  });

  return Math.max(0, Math.round(score));
}

/**
 * Validate a proposed route
 *
 * @param {Array} stops - Array of stop cities { id, name, ... }
 * @param {Object} startCity - Start anchor city { id, name }
 * @param {Object} endCity - End anchor city { id, name }
 * @returns {Object} Validation result with warnings and efficiency score
 */
export function validateRoute(stops, startCity, endCity) {
  // Build full route including anchors
  const fullRoute = [
    { id: startCity.id, name: startCity.name },
    ...stops.map((s) => ({ id: s.city || s.id, name: s.cityName || s.name })),
    { id: endCity.id, name: endCity.name },
  ];

  // Skip validation if route is too short
  if (fullRoute.length < 3) {
    return {
      isEfficient: true,
      efficiencyScore: 100,
      warnings: [],
      route: fullRoute,
    };
  }

  // Calculate direct distance
  const directDistance = calculateDirectDistance(startCity, endCity);

  // Gather all warnings
  const warnings = [
    ...detectBacktracking(fullRoute),
    ...detectDetours(fullRoute, directDistance),
  ];

  // Calculate efficiency score
  const efficiencyScore = calculateEfficiencyScore(warnings);

  return {
    isEfficient: warnings.filter((w) => w.severity === 'warning').length === 0,
    efficiencyScore,
    warnings,
    route: fullRoute,
    totalStops: stops.length,
    directDistance: Math.round(directDistance),
  };
}

/**
 * Get route validation summary for display
 */
export function getValidationSummary(validation) {
  if (validation.efficiencyScore >= 90) {
    return {
      status: 'excellent',
      label: 'Efficient route',
      color: 'green',
    };
  } else if (validation.efficiencyScore >= 70) {
    return {
      status: 'good',
      label: 'Good route',
      color: 'green',
    };
  } else if (validation.efficiencyScore >= 50) {
    return {
      status: 'fair',
      label: 'Route could be optimized',
      color: 'amber',
    };
  } else {
    return {
      status: 'poor',
      label: 'Inefficient route',
      color: 'amber',
    };
  }
}

/**
 * Calculate total route distance in km
 */
export function calculateTotalDistance(route) {
  let total = 0;
  for (let i = 0; i < route.length - 1; i++) {
    const from = cityCoords[route[i].id];
    const to = cityCoords[route[i + 1].id];
    if (from && to) {
      total += haversineDistance(from, to);
    }
  }
  return Math.round(total);
}

/**
 * Optimize route order using nearest-neighbor algorithm
 * Starts from startCity and visits nearest unvisited city until done
 *
 * TODO(cleanup): Duplicates the nearest-neighbor TSP heuristic in
 * `src/lib/planning/routeOptimizer.js` (used by the agent's optimize_route
 * tool). Both implementations should be unified into a single shared helper
 * — deferred to a follow-up refactor pass since the call
 * sites have different shapes (validator works on wizard `stops`, optimizer
 * works on full city objects).
 *
 * @param {Array} stops - Intermediate stops with city data
 * @param {Object} startCity - Start city { id, name }
 * @param {Object} endCity - End city { id, name }
 * @returns {Object} Optimized route data
 */
export function optimizeRouteOrder(stops, startCity, endCity) {
  if (!stops || stops.length === 0) {
    return { optimizedStops: [], savings: 0, newEfficiency: 100 };
  }

  // Prepare stops with coordinates
  const stopsWithCoords = stops.map(stop => {
    const cityId = stop.city?.id || stop.id;
    const coords = cityCoords[cityId];
    return {
      ...stop,
      cityId,
      coords,
    };
  }).filter(s => s.coords);

  if (stopsWithCoords.length === 0) {
    return { optimizedStops: stops, savings: 0, newEfficiency: 100 };
  }

  // Nearest-neighbor algorithm
  const remaining = [...stopsWithCoords];
  const optimized = [];
  let current = cityCoords[startCity.id];

  while (remaining.length > 0) {
    let nearestIdx = 0;
    let nearestDist = Infinity;

    remaining.forEach((stop, idx) => {
      if (stop.coords && current) {
        const dist = haversineDistance(current, stop.coords);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIdx = idx;
        }
      }
    });

    const nearest = remaining[nearestIdx];
    optimized.push(nearest);
    current = nearest.coords;
    remaining.splice(nearestIdx, 1);
  }

  // Calculate distances for comparison
  const originalRoute = [
    { id: startCity.id },
    ...stops.map(s => ({ id: s.city?.id || s.id })),
    { id: endCity.id },
  ];
  const optimizedRoute = [
    { id: startCity.id },
    ...optimized.map(s => ({ id: s.cityId })),
    { id: endCity.id },
  ];

  const originalDistance = calculateTotalDistance(originalRoute);
  const optimizedDistance = calculateTotalDistance(optimizedRoute);
  const savings = originalDistance - optimizedDistance;

  // Validate the optimized route
  const validation = validateRoute(
    optimized.map(s => ({ city: s.cityId, cityName: s.city?.name || s.cityName })),
    startCity,
    endCity
  );

  return {
    optimizedStops: optimized,
    originalDistance,
    optimizedDistance,
    savings,
    newEfficiency: validation.efficiencyScore,
  };
}

/**
 * Compare current route with optimized version
 */
export function compareRoutes(stops, startCity, endCity) {
  const currentValidation = validateRoute(stops, startCity, endCity);
  const optimization = optimizeRouteOrder(stops, startCity, endCity);

  return {
    current: {
      route: currentValidation.route,
      distance: calculateTotalDistance(currentValidation.route),
      efficiency: currentValidation.efficiencyScore,
      warnings: currentValidation.warnings,
    },
    optimized: {
      stops: optimization.optimizedStops,
      distance: optimization.optimizedDistance,
      efficiency: optimization.newEfficiency,
      savings: optimization.savings,
    },
    shouldOptimize: optimization.savings > 100 && optimization.newEfficiency > currentValidation.efficiencyScore,
  };
}

export default {
  validateRoute,
  getValidationSummary,
  optimizeRouteOrder,
  calculateTotalDistance,
  compareRoutes,
};
