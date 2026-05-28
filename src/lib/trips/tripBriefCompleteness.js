function orderedCities(tripState) {
  return [...(tripState?.route?.cities || [])]
    .filter((city) => city?.name || city?.id)
    .sort((a, b) => {
      const ao = Number.isFinite(a.order) ? a.order : 999;
      const bo = Number.isFinite(b.order) ? b.order : 999;
      return ao - bo;
    });
}

function hasTransportBooking(bookings, direction, route) {
  const list = bookings || [];
  if (list.length === 0) return false;
  const norm = (s) => (typeof s === 'string' ? s.trim().toLowerCase() : '');
  const routeNames = (route?.cities || [])
    .map((c) => norm(c?.name))
    .filter(Boolean);
  const firstCity = routeNames[0] || '';
  const lastCity = routeNames[routeNames.length - 1] || '';
  const inRoute = (name) => Boolean(name) && routeNames.includes(name);

  return list.some((booking) => {
    if (!booking) return false;
    if (booking.direction === direction) return true;
    const from = norm(booking.fromCity);
    const to = norm(booking.toCity);
    if (direction === 'inbound') {
      if (to && (to === firstCity || (inRoute(to) && !inRoute(from)))) return true;
      // Legacy fallback for bookings missing both direction and a recognizable arrival anchor.
      return Boolean(booking.arrivalDate || booking.arrivalTime) && !booking.toCity;
    }
    if (direction === 'outbound') {
      if (from && (from === lastCity || (inRoute(from) && !inRoute(to)))) return true;
      return Boolean(booking.departureDate || booking.departureTime) && !booking.fromCity;
    }
    return false;
  });
}

function cityHasStayInfo(city) {
  return Boolean(
    Number.isFinite(city?.nights) ||
    city?.arrivalDate ||
    city?.departureDate ||
    city?.stayName ||
    city?.lodging ||
    city?.accommodation
  );
}

function group(id, label, complete, prompt, message) {
  return { id, label, complete, prompt, message };
}

export function getTripBriefCompleteness(tripState) {
  const cities = orderedCities(tripState);
  const bookings = tripState?.transport?.bookings || [];
  const hasExactDates = Boolean(tripState?.dates?.startDate && tripState?.dates?.endDate);
  const hasDuration = hasExactDates || Number.isFinite(tripState?.dates?.totalNights);
  const hasRoute = cities.length >= 2;
  const hasNights = cities.length > 0 && cities.every(cityHasStayInfo);
  const hasInbound = hasTransportBooking(bookings, 'inbound', tripState?.route);
  const hasOutbound = hasTransportBooking(bookings, 'outbound', tripState?.route);
  const hasTransportPreference = Boolean(tripState?.transport?.preferredMode);
  const hasTravelerProfile = Boolean(tripState?.travelers?.count || tripState?.travelers?.groupType);
  const hasPreferences = Boolean(
    tripState?.preferences?.pace ||
    tripState?.preferences?.interests?.length ||
    tripState?.budget?.style
  );
  const hasConstraints = Boolean(
    tripState?.brief?.hardConstraints?.length ||
    tripState?.brief?.negativeConstraints?.length ||
    tripState?.brief?.notes?.length
  );

  const groups = [
    group(
      'dates',
      'Dates',
      hasDuration,
      'Pick dates or total nights.',
      'My trip dates or total nights are...'
    ),
    group(
      'route',
      'Cities',
      hasRoute,
      'Confirm your start, end, and must-see cities.',
      'My route anchors are...'
    ),
    group(
      'stays',
      'Nights',
      hasNights,
      'Assign nights per city.',
      'Help me assign nights and fixed stays.'
    ),
    group(
      'flights',
      'Travel in & out',
      hasInbound && hasOutbound,
      'Add inbound and outbound flights or trains.',
      'I want to add my flights or transport bookings.'
    ),
    group(
      'travelers',
      'Travelers',
      hasTravelerProfile,
      'Group size and any needs.',
      'My traveler group is...'
    ),
    group(
      'style',
      'Style',
      hasPreferences,
      'Pace, budget, and interests.',
      'My pace, budget, and interests are...'
    ),
    group(
      'constraints',
      'Constraints',
      hasConstraints,
      'Hard times or no-go cities.',
      'My hard constraints are...'
    ),
  ];

  const missing = groups.filter((item) => !item.complete);
  const completed = groups.filter((item) => item.complete);
  const coreReady = hasDuration && hasRoute && hasPreferences;
  const itineraryReady = coreReady && hasNights;
  const next = missing[0] || null;

  return {
    groups,
    missing,
    completed,
    coreReady,
    itineraryReady,
    completionRatio: groups.length === 0 ? 0 : completed.length / groups.length,
    next,
  };
}
