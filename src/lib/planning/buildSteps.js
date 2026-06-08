import { getAnchorCities } from '@/lib/trips/tripLifecycle';

/**
 * The ordered "build steps" shown in the itinerary loading state. Mirrors the
 * real phases of buildMultiCityItinerary (map route → plan each city → add
 * transfers → polish) so the loader reflects the user's actual trip instead of
 * a generic skeleton. Pure + React-free so it can be unit-tested.
 *
 * @param {object} tripState
 * @returns {Array<{ id: string, label: string, city?: object }>}
 */
export function buildBuildSteps(tripState) {
  const cities = getAnchorCities(tripState);
  const steps = [{ id: 'route', label: 'Mapping your route' }];
  for (const city of cities) {
    steps.push({ id: `city:${city.id}`, label: `Planning ${city.name}`, city });
  }
  if (cities.length > 1) {
    steps.push({ id: 'transport', label: 'Adding transport between cities' });
  }
  steps.push({ id: 'polish', label: 'Polishing the details' });
  return steps;
}
