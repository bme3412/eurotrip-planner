/**
 * Client-safe city lookup helpers backed by the generated cities.json.
 * Use these on the client instead of require()-ing the JSON inside useMemo —
 * a static import lets the bundler tree-shake and caches the parsed array
 * once per module graph instead of on every render.
 */

import citiesData from '@/generated/cities.json';

const _byId = new Map();
const _byName = new Map();

for (const city of citiesData) {
  _byId.set(city.id, city);
  if (city.name) _byName.set(city.name.toLowerCase(), city);
}

export function getCityById(id) {
  if (!id) return null;
  return _byId.get(id) || null;
}

export function getCityByName(name) {
  if (!name) return null;
  return _byName.get(String(name).toLowerCase()) || null;
}

export function getAllCities() {
  return citiesData;
}
