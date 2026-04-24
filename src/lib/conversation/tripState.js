/**
 * Trip state model and reducer for the agentic trip planner.
 */

export const initialTripState = {
  route: {
    cities: [],
    // Each city: { id, name, country, latitude, longitude, role, order, nights, arrivalDate, departureDate, notes }
    routeShape: null, // 'roundtrip' | 'one-way' | 'open-jaw'
  },

  transport: {
    preferredMode: null, // 'flight' | 'train' | 'bus' | 'car' | 'mixed'
    bookings: [],
    // Each: { id, type, provider, reference, flightNumber, fromCity, toCity, departureDate, departureTime, arrivalDate, arrivalTime, raw }
  },

  dates: {
    totalNights: null,
    startDate: null,   // YYYY-MM-DD
    endDate: null,
    flexibleMonth: null,
    flexibility: null, // 'fixed' | 'flexible_week' | 'flexible_month' | 'flexible_season'
    arrivalTime: null,
    departureTime: null,
  },

  budget: {
    total: null,
    currency: 'EUR',
    style: null, // 'budget' | 'moderate' | 'premium' | 'luxury'
    dailyCap: null,
  },

  travelers: {
    groupType: null, // 'solo' | 'couple' | 'family' | 'friends' | 'group'
    count: null,
    ages: [],
    hasChildren: null,
    hasElderly: null,
    dietaryRestrictions: [],
    mobilityNeeds: null,
    languages: [],
  },

  preferences: {
    interests: [],
    pace: null, // 'relaxed' | 'balanced' | 'active'
    accommodationStyle: null, // 'hostel' | 'hotel' | 'airbnb' | 'luxury'
    weatherTolerance: null,
  },
};

/**
 * Generate a unique booking ID
 */
function bookingId() {
  return `bk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Merge extracted data into the trip state.
 * Called by the server-side extract_trip_data handler.
 *
 * @param {Object} current - Current trip state
 * @param {Object} extracted - Data extracted by Claude
 * @returns {Object} New merged trip state
 */
export function mergeTripData(current, extracted) {
  const next = JSON.parse(JSON.stringify(current)); // deep clone

  // ── Route ──────────────────────────────────────────────────
  if (extracted.cities && extracted.cities.length > 0) {
    for (const city of extracted.cities) {
      const existing = next.route.cities.find(c => c.id === city.id || c.name?.toLowerCase() === city.name?.toLowerCase());
      if (existing) {
        // Update existing city
        if (city.nights != null) existing.nights = city.nights;
        if (city.role) existing.role = city.role;
        if (city.arrivalDate) existing.arrivalDate = city.arrivalDate;
        if (city.departureDate) existing.departureDate = city.departureDate;
        if (city.notes) existing.notes = city.notes;
      } else {
        // Add new city
        next.route.cities.push({
          id: city.id || null,
          name: city.name,
          country: city.country || null,
          latitude: city.latitude || null,
          longitude: city.longitude || null,
          role: city.role || 'stop',
          order: next.route.cities.length,
          nights: city.nights || null,
          arrivalDate: city.arrivalDate || null,
          departureDate: city.departureDate || null,
          notes: city.notes || null,
        });
      }
    }

    // Ensure first city is 'start' and last is 'end' if roles not set
    if (next.route.cities.length > 0 && !next.route.cities.some(c => c.role === 'start')) {
      next.route.cities[0].role = 'start';
    }
    if (next.route.cities.length > 1 && !next.route.cities.some(c => c.role === 'end')) {
      next.route.cities[next.route.cities.length - 1].role = 'end';
    }
  }

  if (extracted.routeShape) {
    next.route.routeShape = extracted.routeShape;
  }

  // ── Transport ──────────────────────────────────────────────
  if (extracted.transportPreference) {
    next.transport.preferredMode = extracted.transportPreference;
  }

  if (extracted.transportBookings && extracted.transportBookings.length > 0) {
    for (const booking of extracted.transportBookings) {
      next.transport.bookings.push({
        id: bookingId(),
        type: booking.type || 'flight',
        provider: booking.provider || null,
        reference: booking.reference || null,
        flightNumber: booking.flightNumber || null,
        fromCity: booking.fromCity || null,
        toCity: booking.toCity || null,
        departureDate: booking.departureDate || null,
        departureTime: booking.departureTime || null,
        arrivalDate: booking.arrivalDate || null,
        arrivalTime: booking.arrivalTime || null,
        raw: booking.raw || null,
      });
    }
  }

  // ── Dates ──────────────────────────────────────────────────
  if (extracted.totalNights != null) next.dates.totalNights = extracted.totalNights;
  if (extracted.startDate) next.dates.startDate = extracted.startDate;
  if (extracted.endDate) next.dates.endDate = extracted.endDate;
  if (extracted.flexibleMonth) next.dates.flexibleMonth = extracted.flexibleMonth;
  if (extracted.flexibility) next.dates.flexibility = extracted.flexibility;
  if (extracted.arrivalTime) next.dates.arrivalTime = extracted.arrivalTime;
  if (extracted.departureTime) next.dates.departureTime = extracted.departureTime;

  // Derive totalNights from dates if both are set
  if (next.dates.startDate && next.dates.endDate && !next.dates.totalNights) {
    const start = new Date(next.dates.startDate);
    const end = new Date(next.dates.endDate);
    const nights = Math.round((end - start) / (1000 * 60 * 60 * 24));
    if (nights > 0) next.dates.totalNights = nights;
  }

  // ── Budget ─────────────────────────────────────────────────
  if (extracted.budget) {
    if (extracted.budget.total != null) next.budget.total = extracted.budget.total;
    if (extracted.budget.currency) next.budget.currency = extracted.budget.currency;
    if (extracted.budget.style) next.budget.style = extracted.budget.style;
    if (extracted.budget.dailyCap != null) next.budget.dailyCap = extracted.budget.dailyCap;
  }

  // ── Travelers ──────────────────────────────────────────────
  if (extracted.travelers) {
    const t = extracted.travelers;
    if (t.groupType) next.travelers.groupType = t.groupType;
    if (t.count != null) next.travelers.count = t.count;
    if (t.ages?.length) next.travelers.ages = t.ages;
    if (t.hasChildren != null) next.travelers.hasChildren = t.hasChildren;
    if (t.hasElderly != null) next.travelers.hasElderly = t.hasElderly;
    if (t.dietaryRestrictions?.length) {
      next.travelers.dietaryRestrictions = [...new Set([...next.travelers.dietaryRestrictions, ...t.dietaryRestrictions])];
    }
    if (t.mobilityNeeds) next.travelers.mobilityNeeds = t.mobilityNeeds;
    if (t.languages?.length) {
      next.travelers.languages = [...new Set([...next.travelers.languages, ...t.languages])];
    }
  }

  // ── Preferences ────────────────────────────────────────────
  if (extracted.preferences) {
    const p = extracted.preferences;
    if (p.interests?.length) {
      next.preferences.interests = [...new Set([...next.preferences.interests, ...p.interests])];
    }
    if (p.pace) next.preferences.pace = p.pace;
    if (p.accommodationStyle) next.preferences.accommodationStyle = p.accommodationStyle;
    if (p.weatherTolerance) next.preferences.weatherTolerance = p.weatherTolerance;
  }

  return next;
}
