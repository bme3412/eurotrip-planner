/**
 * Gap analysis for the agentic trip planner.
 * Determines what info is missing and what to ask next.
 */

const PRIORITY = {
  cities: 1,
  duration: 2,
  routeShape: 3,
  dates: 4,
  transport: 5,
  budget: 6,
  travelers: 7,
  interests: 8,
  accommodation: 9,
};

/**
 * Analyze the current trip state and return ordered list of gaps.
 */
export function analyzeGaps(tripState) {
  const gaps = [];
  const r = tripState.route;
  const d = tripState.dates;
  const t = tripState.transport;
  const b = tripState.budget;
  const tv = tripState.travelers;
  const p = tripState.preferences;

  // P1: At least one city
  if (r.cities.length === 0) {
    gaps.push({
      field: 'cities',
      priority: PRIORITY.cities,
      critical: true,
      question: 'Where do you want to go?',
    });
  }

  // P2: Duration
  const hasNights = d.totalNights != null;
  const hasCityNights = r.cities.some(c => c.nights != null);
  const hasDateRange = d.startDate && d.endDate;
  if (!hasNights && !hasCityNights && !hasDateRange) {
    gaps.push({
      field: 'duration',
      priority: PRIORITY.duration,
      critical: true,
      question: 'How many nights total?',
    });
  }

  // P3: Route shape (only if exactly 1 city)
  if (r.cities.length === 1 && !r.routeShape) {
    gaps.push({
      field: 'routeShape',
      priority: PRIORITY.routeShape,
      critical: false,
      question: 'Staying in one city, or visiting others too?',
      options: [
        { id: 'roundtrip', label: 'Just this city (roundtrip)' },
        { id: 'multi-city', label: 'Adding more cities' },
        { id: 'decide-later', label: 'Decide later' },
      ],
    });
  }

  // P4: Dates
  if (!d.startDate && !d.flexibleMonth && !d.flexibility) {
    gaps.push({
      field: 'dates',
      priority: PRIORITY.dates,
      critical: false,
      question: 'When are you thinking of going?',
    });
  }

  // P5: Transport (only for multi-city)
  if (r.cities.length >= 2 && !t.preferredMode && t.bookings.length === 0) {
    gaps.push({
      field: 'transport',
      priority: PRIORITY.transport,
      critical: false,
      question: 'How do you want to get between cities — train, flight, or mix?',
      options: [
        { id: 'train', label: 'Train' },
        { id: 'flight', label: 'Flight' },
        { id: 'mixed', label: 'Mix of both' },
      ],
    });
  }

  // P6: Budget
  if (!b.style && b.total == null) {
    gaps.push({
      field: 'budget',
      priority: PRIORITY.budget,
      critical: false,
      question: 'Any budget preference?',
      options: [
        { id: 'budget', label: 'Budget-friendly' },
        { id: 'moderate', label: 'Moderate' },
        { id: 'premium', label: 'Premium' },
      ],
    });
  }

  // P7: Travelers
  if (!tv.groupType && tv.count == null) {
    gaps.push({
      field: 'travelers',
      priority: PRIORITY.travelers,
      critical: false,
      question: 'Who is going — solo, couple, family, friends?',
    });
  }

  // P8: Interests
  if (p.interests.length === 0) {
    gaps.push({
      field: 'interests',
      priority: PRIORITY.interests,
      critical: false,
      question: 'What are you most interested in — culture, food, nature, nightlife?',
    });
  }

  // P9: Accommodation
  if (!p.accommodationStyle) {
    gaps.push({
      field: 'accommodation',
      priority: PRIORITY.accommodation,
      critical: false,
      question: 'Any accommodation preference?',
    });
  }

  gaps.sort((a, b) => a.priority - b.priority);

  const total = Object.keys(PRIORITY).length;
  const filled = total - gaps.length;
  const completeness = Math.round((filled / total) * 100);

  return {
    gaps,
    nextQuestion: gaps[0] || null,
    completeness,
    isReadyToFinalize: gaps.filter(g => g.critical).length === 0 && completeness >= 40,
  };
}

/**
 * Build compact context string for Claude showing current state + gaps.
 */
export function buildAgentContext(tripState) {
  const { gaps, completeness, nextQuestion } = analyzeGaps(tripState);
  const lines = [];
  const r = tripState.route;
  const d = tripState.dates;
  const t = tripState.transport;
  const b = tripState.budget;
  const tv = tripState.travelers;
  const p = tripState.preferences;

  lines.push(`## Trip State (${completeness}% complete)`);

  // Route
  if (r.cities.length > 0) {
    const routeStr = r.cities.map(c => {
      let s = c.name;
      if (c.nights) s += ` (${c.nights}n)`;
      return s;
    }).join(' → ');
    lines.push(`Route: ${routeStr}`);
    if (r.routeShape) lines.push(`Shape: ${r.routeShape}`);
  }

  // Dates
  if (d.startDate) {
    lines.push(`Dates: ${d.startDate} to ${d.endDate || '?'}`);
  } else if (d.flexibleMonth) {
    lines.push(`When: ${d.flexibleMonth} (flexible)`);
  }
  if (d.totalNights) lines.push(`Duration: ${d.totalNights} nights`);

  // Transport
  if (t.bookings.length > 0) {
    lines.push(`Bookings: ${t.bookings.length} transport booking(s)`);
    t.bookings.forEach(bk => {
      lines.push(`  ${bk.type}: ${bk.fromCity} → ${bk.toCity} ${bk.departureDate || ''} ${bk.provider || ''} ${bk.flightNumber || ''}`);
    });
  }
  if (t.preferredMode) lines.push(`Transport: ${t.preferredMode}`);

  // Budget
  if (b.total) lines.push(`Budget: ${b.total} ${b.currency}`);
  else if (b.style) lines.push(`Budget: ${b.style}`);

  // Travelers
  if (tv.count) lines.push(`Travelers: ${tv.count} (${tv.groupType || 'group'})`);

  // Preferences
  if (p.interests.length > 0) lines.push(`Interests: ${p.interests.join(', ')}`);
  if (p.pace) lines.push(`Pace: ${p.pace}`);

  // Gaps
  lines.push('');
  lines.push(`## Missing Info (${gaps.length} gaps)`);
  if (nextQuestion) {
    lines.push(`→ NEXT ASK: ${nextQuestion.question}`);
  }
  gaps.forEach(g => {
    lines.push(`  [P${g.priority}] ${g.field}: ${g.question}`);
  });

  return lines.join('\n');
}
