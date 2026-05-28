import { computeTravelMatrix, isGoogleRoutesConfigured } from '../google-routes/client.js';

function pointFromBlock(block) {
  const coords = block?.activity?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const [longitude, latitude] = coords;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
}

function travelCost(matrix, from, to) {
  const edge = matrix?.[from]?.[to];
  if (!edge || !Number.isFinite(edge.durationSeconds)) return Infinity;
  return edge.durationSeconds;
}

function buildGreedyOrder(matrix, startIndex) {
  const order = [startIndex];
  const remaining = new Set(matrix.map((_, index) => index).filter((index) => index !== startIndex));
  let totalSeconds = 0;

  while (remaining.size > 0) {
    const current = order[order.length - 1];
    let bestIndex = null;
    let bestCost = Infinity;

    for (const candidate of remaining) {
      const cost = travelCost(matrix, current, candidate);
      if (cost < bestCost) {
        bestCost = cost;
        bestIndex = candidate;
      }
    }

    if (bestIndex == null) bestIndex = Array.from(remaining)[0];
    const edgeCost = travelCost(matrix, current, bestIndex);
    if (Number.isFinite(edgeCost)) totalSeconds += edgeCost;

    order.push(bestIndex);
    remaining.delete(bestIndex);
  }

  return { order, totalSeconds };
}

function findBestOrder(matrix) {
  const candidates = matrix.map((_, index) => buildGreedyOrder(matrix, index));
  return candidates.reduce((best, candidate) => (
    candidate.totalSeconds < best.totalSeconds ? candidate : best
  ), candidates[0]);
}

function annotateTravel(activity, edge, travelMode) {
  if (!edge) return activity;
  return {
    ...activity,
    nextTravel: {
      source: 'google_routes',
      travelMode,
      durationMinutes: edge.durationSeconds ? Math.round(edge.durationSeconds / 60) : null,
      distanceMeters: edge.distanceMeters ?? null,
    },
  };
}

async function optimizeDay(day, options = {}) {
  const visitEntries = day.timeBlocks
    .map((block, slotIndex) => ({ block, slotIndex, point: pointFromBlock(block) }))
    .filter((entry) => entry.point);

  if (visitEntries.length < 2) return day;

  const matrixResult = await computeTravelMatrix(
    visitEntries.map((entry) => entry.point),
    { travelMode: options.travelMode || 'WALK' }
  );

  if (!matrixResult?.matrix) return day;

  const best = findBestOrder(matrixResult.matrix);
  const orderedEntries = best.order.map((index) => visitEntries[index]);
  const nextBlocks = day.timeBlocks.map((block) => ({ ...block, activity: { ...block.activity } }));

  visitEntries.forEach((entry, replacementIndex) => {
    const orderedEntry = orderedEntries[replacementIndex];
    const sourceIndex = best.order[replacementIndex];
    const nextSourceIndex = best.order[replacementIndex + 1];
    const edge = nextSourceIndex == null ? null : matrixResult.matrix[sourceIndex]?.[nextSourceIndex];

    nextBlocks[entry.slotIndex] = {
      ...entry.block,
      activity: annotateTravel(orderedEntry.block.activity, edge, matrixResult.travelMode),
    };
  });

  return {
    ...day,
    timeBlocks: nextBlocks,
    routeOptimization: {
      source: matrixResult.source,
      travelMode: matrixResult.travelMode,
      totalTravelMinutes: Math.round(best.totalSeconds / 60),
      optimizedStops: visitEntries.length,
    },
  };
}

export async function applyGoogleRouteOrdering(itinerary, options = {}) {
  if (!itinerary?.days?.length) return itinerary;
  if (!isGoogleRoutesConfigured()) {
    return {
      ...itinerary,
      routing: {
        source: 'proximity_fallback',
        fallback: true,
        reason: 'missing_api_key',
      },
    };
  }

  try {
    const days = await Promise.all(
      itinerary.days.map((day) => day.isTravelDay ? day : optimizeDay(day, options))
    );

    return {
      ...itinerary,
      days,
      routing: {
        source: 'google_routes',
        travelMode: options.travelMode || 'WALK',
        fallback: false,
      },
    };
  } catch (error) {
    console.warn('[google-routes] Route ordering unavailable, using proximity fallback:', error.message);
    return {
      ...itinerary,
      routing: {
        source: 'proximity_fallback',
        fallback: true,
        reason: error?.status ? `http_${error.status}` : 'unavailable',
      },
    };
  }
}
