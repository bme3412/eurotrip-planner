/**
 * Resolve [lng, lat] for an attraction, accepting either a nested
 * `coordinates: { longitude, latitude }` (or `lng/lat`) object or
 * top-level `longitude` / `latitude` fields.
 *
 * Returns null if no usable coordinates are present.
 */
export function getAttractionCoords(attraction) {
  if (!attraction) return null;
  if (attraction.coordinates) {
    const lng = attraction.coordinates.longitude || attraction.coordinates.lng;
    const lat = attraction.coordinates.latitude || attraction.coordinates.lat;
    if (lng && lat) return [lng, lat];
  }
  if (attraction.longitude && attraction.latitude) {
    return [attraction.longitude, attraction.latitude];
  }
  return null;
}
