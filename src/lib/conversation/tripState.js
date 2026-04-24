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
/**
 * Sanitize extracted data before merging.
 */
function sanitizeExtraction(extracted) {
  const warnings = [];
  const data = JSON.parse(JSON.stringify(extracted));

  if (data.cities) {
    for (const city of data.cities) {
      if (city.nights != null) {
        if (city.nights < 0) {
          warnings.push(`Ignored negative nights (${city.nights}) for ${city.name}`);
          city.nights = null;
        } else if (city.nights > 30) {
          warnings.push(`Capped nights at 30 for ${city.name} (was ${city.nights})`);
          city.nights = 30;
        } else {
          city.nights = Math.round(city.nights);
        }
      }
    }
  }

  if (data.totalNights != null) {
    if (data.totalNights < 1 || data.totalNights > 90) {
      warnings.push(`Total nights ${data.totalNights} clamped to 1-90 range`);
      data.totalNights = Math.max(1, Math.min(90, Math.round(data.totalNights)));
    }
  }

  if (data.travelers?.count != null) {
    if (data.travelers.count < 1 || data.travelers.count > 50) {
      warnings.push(`Traveler count ${data.travelers.count} clamped to 1-50`);
      data.travelers.count = Math.max(1, Math.min(50, data.travelers.count));
    }
  }

  if (data.budget?.total != null && data.budget.total <= 0) {
    warnings.push(`Ignored non-positive budget ${data.budget.total}`);
    data.budget.total = null;
  }

  if (data.startDate && data.endDate) {
    if (new Date(data.endDate) <= new Date(data.startDate)) {
      warnings.push(`End date ${data.endDate} is not after start date ${data.startDate}`);
      data.endDate = null;
    }
  }

  return { data, warnings };
}

export function mergeTripData(current, extracted) {
  const { data: sanitized, warnings } = sanitizeExtraction(extracted);
  const next = JSON.parse(JSON.stringify(current)); // deep clone
  // Use sanitized data for all merging below
  const ext = sanitized;

  // ── Route ──────────────────────────────────────────────────
  if (ext.cities && ext.cities.length > 0) {
    for (const city of ext.cities) {
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

    // Only auto-assign start/end roles if no explicit roles in this extraction
    const hasExplicitRoles = ext.cities?.some(c => c.role);
    if (!hasExplicitRoles) {
      if (next.route.cities.length > 0 && !next.route.cities.some(c => c.role === 'start')) {
        next.route.cities[0].role = 'start';
      }
      if (next.route.cities.length > 1 && !next.route.cities.some(c => c.role === 'end')) {
        next.route.cities[next.route.cities.length - 1].role = 'end';
      }
    }
  }

  if (ext.routeShape) {
    next.route.routeShape = ext.routeShape;
  }

  // ── Transport ──────────────────────────────────────────────
  if (ext.transportPreference) {
    next.transport.preferredMode = ext.transportPreference;
  }

  if (ext.transportBookings && ext.transportBookings.length > 0) {
    for (const booking of ext.transportBookings) {
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
  if (ext.totalNights != null) next.dates.totalNights = ext.totalNights;
  if (ext.startDate) next.dates.startDate = ext.startDate;
  if (ext.endDate) next.dates.endDate = ext.endDate;
  if (ext.flexibleMonth) next.dates.flexibleMonth = ext.flexibleMonth;
  if (ext.flexibility) next.dates.flexibility = ext.flexibility;

  // Derive totalNights from dates if both are set
  if (next.dates.startDate && next.dates.endDate && !next.dates.totalNights) {
    const start = new Date(next.dates.startDate);
    const end = new Date(next.dates.endDate);
    const nights = Math.round((end - start) / (1000 * 60 * 60 * 24));
    if (nights > 0) next.dates.totalNights = nights;
  }

  // ── Budget ─────────────────────────────────────────────────
  if (ext.budget) {
    if (ext.budget.total != null) next.budget.total = ext.budget.total;
    if (ext.budget.currency) next.budget.currency = ext.budget.currency;
    if (ext.budget.style) next.budget.style = ext.budget.style;
    if (ext.budget.dailyCap != null) next.budget.dailyCap = ext.budget.dailyCap;
  }

  // ── Travelers ──────────────────────────────────────────────
  if (ext.travelers) {
    const t = ext.travelers;
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
  if (ext.preferences) {
    const p = ext.preferences;
    if (p.interests?.length) {
      next.preferences.interests = [...new Set([...next.preferences.interests, ...p.interests])];
    }
    if (p.pace) next.preferences.pace = p.pace;
    if (p.accommodationStyle) next.preferences.accommodationStyle = p.accommodationStyle;
    if (p.weatherTolerance) next.preferences.weatherTolerance = p.weatherTolerance;
  }

  return next;
}
