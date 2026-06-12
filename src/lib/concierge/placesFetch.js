import { placeDetails } from '@/lib/google-places/client';

// Opening-hours fetch shared by the hours watcher and the agent's check_hours
// tool. Null-safe: without a key it returns null and callers degrade to
// "hours unavailable" rather than guessing.
const FIELD_MASK = 'businessStatus,regularOpeningHours';

export async function fetchPlaceHours(placeId) {
  if (!process.env.GOOGLE_PLACES_API_KEY) return null;
  return placeDetails(placeId, FIELD_MASK);
}
