/**
 * "Where to base your days after you choose dates" — a four-season
 * recommendation per city.
 *
 * Paris-heavy by design because the product is Paris-first; this is
 * a candidate for relocation into per-city JSON (see Tier 2 #8 in the
 * audit plan).
 */
export const getSeasonalNeighborhoods = (cityName) => {
  const cityKey = (cityName || '').toLowerCase();

  if (cityKey.includes('paris')) {
    return [
      { season: 'Spring', neighborhood: 'Saint-Germain + Luxembourg Gardens', reason: 'cafe terraces, garden blooms, and easy museum pairing' },
      { season: 'Summer', neighborhood: 'Canal Saint-Martin + the Seine', reason: 'waterside evenings, picnics, and open-air pop-ups' },
      { season: 'Fall', neighborhood: 'Le Marais + covered passages', reason: 'gallery hopping, boutiques, and rain-friendly wandering' },
      { season: 'Winter', neighborhood: 'Montmartre + Palais-Royal', reason: 'cozy bistros, holiday lights, and atmospheric walks' },
    ];
  }

  return [
    { season: 'Spring', neighborhood: 'Historic center', reason: 'best balance of walking weather and classic sights' },
    { season: 'Summer', neighborhood: 'Parks + waterfront areas', reason: 'long evenings and outdoor dining' },
    { season: 'Fall', neighborhood: 'Museum districts', reason: 'culture-heavy days when weather turns mixed' },
    { season: 'Winter', neighborhood: 'Old town + covered markets', reason: 'cozy indoor stops and seasonal food' },
  ];
};
