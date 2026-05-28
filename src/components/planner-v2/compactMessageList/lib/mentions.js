// Build the list of cities that should be flag-decorated in chat copy.
// Dedupes by lowercase name and sorts by name length DESC so that "Saint-Jean-de-Luz"
// matches before any shorter substring city would.
export function buildMentionCities(trip) {
  const cities = [
    trip?.startCity,
    ...(trip?.stops || []),
    trip?.endCity,
  ].filter((city) => city?.name && city?.country);

  const seen = new Set();
  return cities
    .filter((city) => {
      const key = city.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.name.length - a.name.length);
}
