/**
 * Server-side tool execution handlers for the agentic trip planner V2.
 */

import fs from 'fs';
import path from 'path';
import { mergeTripData } from './tripState';

// Load cities data once at module level
let _citiesData = null;
let _cityLookup = null;

function getCitiesData() {
  if (_citiesData) return _citiesData;
  try {
    const filePath = path.join(process.cwd(), 'src', 'generated', 'cities.json');
    _citiesData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    _citiesData = [];
  }
  return _citiesData;
}

function getCityLookup() {
  if (_cityLookup) return _cityLookup;
  const cities = getCitiesData();
  _cityLookup = new Map();
  for (const city of cities) {
    _cityLookup.set(city.id, city);
    _cityLookup.set(city.name.toLowerCase(), city);
  }
  return _cityLookup;
}

/**
 * Handle extract_trip_data tool call.
 * Merges extracted data into trip state and returns the updated state.
 */
export function handleExtractTripData(input, tripState) {
  const newState = mergeTripData(tripState, input);

  // Auto-resolve city names to canonical IDs, coordinates, and country.
  // This eliminates the need for a separate resolve_cities call.
  const lookup = getCityLookup();
  for (const city of newState.route.cities) {
    if (!city.id && city.name) {
      const match = lookup.get(city.name.toLowerCase().trim());
      if (match) {
        city.id = match.id;
        city.country = match.country;
        city.latitude = match.latitude;
        city.longitude = match.longitude;
      }
    }
  }

  return { updatedState: newState, extracted: input };
}

/**
 * Handle resolve_cities tool call.
 * Maps city name strings to canonical IDs.
 */
export function handleResolveCities(input) {
  const lookup = getCityLookup();
  const results = [];

  for (const name of (input.names || [])) {
    const key = name.toLowerCase().trim();
    const match = lookup.get(key);

    if (match) {
      results.push({
        input: name,
        resolved: true,
        id: match.id,
        name: match.name,
        country: match.country,
        latitude: match.latitude,
        longitude: match.longitude,
        description: match.description?.slice(0, 120),
      });
    } else {
      // Fuzzy match: check if name is a substring
      const cities = getCitiesData();
      const fuzzy = cities.find(c =>
        c.name.toLowerCase().includes(key) || key.includes(c.name.toLowerCase())
      );
      results.push({
        input: name,
        resolved: false,
        suggestion: fuzzy ? { id: fuzzy.id, name: fuzzy.name, country: fuzzy.country } : null,
      });
    }
  }

  return results;
}

/**
 * Handle get_route_options tool call.
 * Returns transport connections between two cities.
 */
export function handleGetRouteOptions(input) {
  const { fromCityId, toCityId } = input;
  const lookup = getCityLookup();
  const fromCity = lookup.get(fromCityId);
  const toCity = lookup.get(toCityId);

  if (!fromCity || !toCity) {
    return { error: `City not found: ${!fromCity ? fromCityId : toCityId}` };
  }

  // Try loading connection data
  try {
    const manifestPath = path.join(process.cwd(), 'public', 'data', 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const cityInfo = manifest.cities?.[fromCityId];

    if (cityInfo) {
      const connPath = path.join(
        process.cwd(), 'public', 'data',
        cityInfo.country, cityInfo.directoryName,
        `${cityInfo.directoryName}_connections.json`
      );

      if (fs.existsSync(connPath)) {
        const connections = JSON.parse(fs.readFileSync(connPath, 'utf-8'));
        const dest = connections.connections?.find(c =>
          c.city?.toLowerCase() === toCityId ||
          c.city?.toLowerCase() === toCity.name.toLowerCase()
        );

        if (dest) {
          return {
            from: { id: fromCityId, name: fromCity.name, country: fromCity.country },
            to: { id: toCityId, name: toCity.name, country: toCity.country },
            options: dest.transport_options || dest.transportOptions || [],
            travelTime: dest.travel_time || dest.travelTime || null,
          };
        }
      }
    }
  } catch (e) {
    console.warn('[toolHandlers] Connection data load failed:', e.message);
  }

  // Fallback: estimate from distance
  const R = 6371;
  const dLat = (toCity.latitude - fromCity.latitude) * Math.PI / 180;
  const dLon = (toCity.longitude - fromCity.longitude) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(fromCity.latitude * Math.PI / 180) * Math.cos(toCity.latitude * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const mode = km > 800 ? 'flight' : 'train';
  const hours = mode === 'flight' ? km / 800 + 1.5 : km / 100;

  return {
    from: { id: fromCityId, name: fromCity.name, country: fromCity.country },
    to: { id: toCityId, name: toCity.name, country: toCity.country },
    estimated: true,
    distance: `${Math.round(km)} km`,
    suggestedMode: mode,
    estimatedTime: `${Math.round(hours)}h`,
  };
}

/**
 * Handle suggest_cities tool call.
 */
export async function handleSuggestCities(input) {
  try {
    const { getSuggestionsForGap } = await import('../planning/gapSuggester.js');
    const suggestions = await getSuggestionsForGap({
      fromCity: input.fromCityId,
      toCity: input.toCityId || null,
      interests: input.interests || [],
      budget: input.budget || 'moderate',
      maxResults: input.maxResults || 6,
    });
    return suggestions;
  } catch (e) {
    console.warn('[toolHandlers] Suggestion failed:', e.message);
    // Fallback: return nearby cities from database
    const cities = getCitiesData();
    const from = getCityLookup().get(input.fromCityId);
    if (!from) return [];

    return cities
      .filter(c => c.id !== input.fromCityId)
      .map(c => {
        const dlat = c.latitude - from.latitude;
        const dlon = c.longitude - from.longitude;
        const dist = Math.sqrt(dlat * dlat + dlon * dlon);
        return { ...c, dist };
      })
      .sort((a, b) => a.dist - b.dist)
      .slice(0, input.maxResults || 6)
      .map(c => ({
        id: c.id,
        name: c.name,
        country: c.country,
        score: Math.round(80 - c.dist * 10),
        travelMinutes: Math.round(c.dist * 60),
      }));
  }
}

/**
 * Handle get_city_info tool call.
 */
export function handleGetCityInfo(input) {
  const lookup = getCityLookup();
  const city = lookup.get(input.cityId);
  if (!city) return { error: `City not found: ${input.cityId}` };

  return {
    id: city.id,
    name: city.name,
    country: city.country,
    description: city.description,
    categories: city.tourismCategories || [],
    region: city.region || null,
  };
}

/**
 * Handle optimize_route tool call.
 */
export async function handleOptimizeRoute(input) {
  try {
    const { optimizeRoute } = await import('../planning/routeOptimizer');
    const lookup = getCityLookup();
    const cities = input.cityIds.map(id => lookup.get(id)).filter(Boolean);

    const result = optimizeRoute(cities, {
      startCity: input.startCityId,
      endCity: input.endCityId,
    });

    if (result?.routes?.[0]) {
      return {
        optimizedOrder: result.routes[0].order,
        totalTime: result.routes[0].totalTime,
        variant: result.routes[0].variant,
      };
    }
  } catch (e) {
    console.warn('[toolHandlers] Route optimization failed:', e.message);
  }

  // Fallback: return original order
  return { optimizedOrder: input.cityIds, totalTime: null, variant: 'original' };
}

/**
 * Dispatch a tool call to the appropriate handler.
 */
export async function executeToolCall(toolName, toolInput, tripState) {
  switch (toolName) {
    case 'extract_trip_data':
      return handleExtractTripData(toolInput, tripState);

    case 'resolve_cities':
      return handleResolveCities(toolInput);

    case 'get_route_options':
      return handleGetRouteOptions(toolInput);

    case 'suggest_cities':
      return await handleSuggestCities(toolInput);

    case 'get_city_info':
      return handleGetCityInfo(toolInput);

    case 'optimize_route':
      return await handleOptimizeRoute(toolInput);

    // UI tools are not executed server-side — they pass through to the client
    case 'render_trip_card':
    case 'render_city_picker':
    case 'render_options':
    case 'render_date_picker':
    case 'render_nights_allocator':
    case 'confirm_changes':
    case 'finalize_trip':
      return null; // No server-side execution needed

    default:
      console.warn('[toolHandlers] Unknown tool:', toolName);
      return null;
  }
}
