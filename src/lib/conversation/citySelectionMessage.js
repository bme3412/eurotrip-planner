function normalizeText(value) {
  return String(value || '').toLowerCase().trim();
}

export function buildCitySelectionMessage(city, purpose, tripState) {
  if (!city?.name) return "I'll skip adding more cities for now";

  const verb = purpose === 'start' ? 'start in' : purpose === 'end' ? 'end in' : 'add';
  const regionFocus = city.regionFocus || city.region || null;
  const routeRole = city.routeRole || null;
  const nextStep = city.nextStep || null;
  const transportNote = city.transportNote || null;
  const targetRegions = tripState?.brief?.targetRegions || [];
  const selectedCountry = normalizeText(city.country);
  const selectedRegion = normalizeText(regionFocus);
  const remainingRegions = targetRegions.filter((region) => {
    const normalized = normalizeText(region);
    if (!normalized) return false;
    if (selectedRegion && (selectedRegion.includes(normalized) || normalized.includes(selectedRegion))) {
      return false;
    }
    if (selectedCountry && (selectedCountry.includes(normalized) || normalized.includes(selectedCountry))) {
      return false;
    }
    return true;
  });

  const clauses = [`I'll ${verb} ${city.name}`];
  if (routeRole) clauses.push(`as the ${routeRole}`);
  if (regionFocus) clauses.push(`for ${regionFocus}`);

  const followUps = [];
  if (remainingRegions.length > 0) {
    followUps.push(`keep ${remainingRegions.join(' and ')} in scope too`);
  }
  followUps.push('guide me through assigning dates/nights for each segment');
  followUps.push('compare the best transport between stops before finalizing');
  if (nextStep) followUps.push(nextStep);
  if (transportNote) followUps.push(transportNote);

  return `${clauses.join(' ')}. ${followUps.join(', ')}.`;
}
