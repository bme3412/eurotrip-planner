import { getCityById, getCityByName } from '@/lib/cities/lookup';
import { getFlagForCountry } from '@/utils/countryFlags';

// Great-circle distance in km between two lat/lng pairs.
export function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Display name with a country flag prefix, e.g. "🇫🇷 Paris".
export function cityDisplayName(city) {
  if (!city?.name) return '';
  return city.country ? `${getFlagForCountry(city.country)} ${city.name}` : city.name;
}

// Merge a loose city reference (from trip state) with the canonical record
// from the city catalogue so we always have name/country/lat/lng.
export function resolveCity(city) {
  const id = city?.id || city?.name?.toLowerCase();
  const canonical = getCityById(id) || getCityByName(city?.name);
  return {
    ...city,
    id,
    name: city?.name || canonical?.name || id,
    country: city?.country || canonical?.country || null,
    latitude: city?.latitude || canonical?.latitude || null,
    longitude: city?.longitude || canonical?.longitude || null,
    description: canonical?.description || null,
  };
}
