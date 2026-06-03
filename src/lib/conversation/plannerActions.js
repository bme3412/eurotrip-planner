import { addDays, parseIsoDate, toIsoDate, totalAssignedNights } from './dayAssignments';

function cityKey(city) {
  return city?.id || city?.name?.toLowerCase?.() || null;
}

function orderedCities(tripState) {
  return [...(tripState?.route?.cities || [])].sort((a, b) => {
    const ao = Number.isFinite(a.order) ? a.order : 999;
    const bo = Number.isFinite(b.order) ? b.order : 999;
    return ao - bo;
  });
}

export function formatShortDate(value) {
  const parsed = parseIsoDate(value);
  if (!parsed) return null;
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatCityDateRange(city) {
  const start = formatShortDate(city?.arrivalDate);
  const end = formatShortDate(city?.departureDate);
  if (start && end) return `${start}-${end}`;
  if (start) return start;
  return null;
}

export function buildRouteSummary(tripState) {
  const cities = orderedCities(tripState).map((city) => city.name).filter(Boolean);
  const totalNights = tripState?.dates?.totalNights;
  const placed = totalAssignedNights(tripState);
  const parts = [];
  if (cities.length > 0) parts.push(cities.join(' -> '));
  if (Number.isFinite(totalNights)) parts.push(`${totalNights} nights`);
  if (Number.isFinite(totalNights)) parts.push(`${placed} placed`);
  return parts.join(' · ') || 'Trip route';
}

function nextUnplacedCity(tripState) {
  return orderedCities(tripState).find((city) => !Number.isFinite(city.nights) || city.nights === 0);
}

export function buildPlannerAction(type, { before = null, after = null, city = null, cities = [], dayIndices = [], partial = null } = {}) {
  const totalNights = after?.dates?.totalNights;
  const placed = totalAssignedNights(after);
  const remaining = Number.isFinite(totalNights) ? Math.max(0, totalNights - placed) : null;
  const activeCity = city || after?.route?.cities?.find((item) => cityKey(item) === cityKey(city));
  const cityName = activeCity?.name || city?.name || 'the route';
  const range = formatCityDateRange(activeCity);
  const unplacedCity = nextUnplacedCity(after);

  let title = 'Trip updated';
  let confirmation = 'Trip updated.';
  let nextPrompt = null;

  if (type === 'assign_days_to_city') {
    const nightLabel = `${dayIndices.length} ${dayIndices.length === 1 ? 'night' : 'nights'}`;
    title = `${cityName} scheduled`;
    confirmation = `Assigned ${nightLabel} to ${cityName}${range ? ` (${range})` : ''}.`;
  } else if (type === 'set_city_accommodation') {
    title = `${cityName} stay updated`;
    confirmation = `Updated stay details for ${cityName}.`;
  } else if (type === 'set_city_nights') {
    const nights = Number.isFinite(activeCity?.nights) ? activeCity.nights : 0;
    title = `${cityName} set to ${nights}n`;
    confirmation = `Set ${cityName} to ${nights} ${nights === 1 ? 'night' : 'nights'}${range ? ` (${range})` : ''}.`;
  } else if (type === 'set_trip_dates') {
    title = 'Trip dates set';
    confirmation = `Set trip dates to ${partial?.startDate || after?.dates?.startDate || 'start'} through ${partial?.endDate || after?.dates?.endDate || 'end'}.`;
  } else if (type === 'add_city') {
    title = `${cityName} added`;
    confirmation = `Added ${cityName} to the route.`;
  } else if (type === 'add_cities') {
    const names = (cities || []).map((item) => item?.name).filter(Boolean);
    const label =
      names.length <= 1
        ? names[0] || 'new stops'
        : names.length === 2
          ? `${names[0]} and ${names[1]}`
          : `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
    title = `${names.length} ${names.length === 1 ? 'stop' : 'stops'} added`;
    confirmation = `Added ${label} to the route.`;
  } else if (type === 'unassign_days') {
    const nightLabel = `${dayIndices.length} ${dayIndices.length === 1 ? 'night' : 'nights'}`;
    title = `${nightLabel} freed`;
    confirmation = `Freed ${nightLabel} for reassignment.`;
  } else if (type === 'accept_allocation') {
    title = 'Dates assigned';
    confirmation = `Applied the suggested night split: ${buildRouteSummary(after)}.`;
  }

  if (unplacedCity) {
    nextPrompt = `Next: assign nights to ${unplacedCity.name}.`;
  } else if (remaining > 0) {
    nextPrompt = `Next: place ${remaining} remaining ${remaining === 1 ? 'night' : 'nights'}.`;
  } else if (after?.route?.cities?.length > 1) {
    nextPrompt = 'Next: compare transport between each leg.';
  }

  return {
    type,
    title,
    confirmation,
    nextPrompt,
    routeSummary: buildRouteSummary(after || before),
    shouldSave: true,
  };
}

export function buildSuggestedAllocation(tripState) {
  const cities = orderedCities(tripState);
  const totalNights = tripState?.dates?.totalNights;
  const start = parseIsoDate(tripState?.dates?.startDate);
  if (!start || !Number.isFinite(totalNights) || totalNights <= 0 || cities.length < 2) return null;

  const locked = cities.map((city) => (Number.isFinite(city.nights) && city.nights > 0 ? city.nights : 0));
  const lockedTotal = locked.reduce((sum, nights) => sum + nights, 0);
  const openIndices = cities.map((city, index) => ({ city, index })).filter(({ index }) => locked[index] === 0);
  const remaining = totalNights - lockedTotal;
  if (remaining <= 0 || openIndices.length === 0) return null;

  const base = Math.floor(remaining / openIndices.length);
  let extra = remaining % openIndices.length;
  const nights = [...locked];
  for (const { index } of openIndices) {
    nights[index] = base + (extra > 0 ? 1 : 0);
    extra -= 1;
  }

  let cursor = 0;
  const segments = cities.map((city, index) => {
    const count = nights[index] || 0;
    const arrivalDate = count > 0 ? toIsoDate(addDays(start, cursor)) : null;
    const departureDate = count > 0 ? toIsoDate(addDays(start, cursor + count)) : null;
    cursor += count;
    return {
      cityId: cityKey(city),
      cityName: city.name,
      country: city.country,
      nights: count,
      arrivalDate,
      departureDate,
      label: `${city.name}: ${formatShortDate(arrivalDate) || '?'}-${formatShortDate(departureDate) || '?'}`,
    };
  });

  return { segments };
}

export function applySuggestedAllocation(tripState, allocation) {
  if (!allocation?.segments?.length) return tripState;
  const next = JSON.parse(JSON.stringify(tripState));
  for (const segment of allocation.segments) {
    const city = next.route.cities.find((item) => cityKey(item) === segment.cityId);
    if (!city) continue;
    city.nights = segment.nights;
    city.arrivalDate = segment.arrivalDate;
    city.departureDate = segment.departureDate;
  }
  const assigned = orderedCities(next).filter((city) => Number.isFinite(city.nights) && city.nights > 0);
  assigned.forEach((city, index) => {
    if (index === 0) city.role = 'start';
    else if (index === assigned.length - 1) city.role = 'end';
    else city.role = 'stop';
  });
  return next;
}
