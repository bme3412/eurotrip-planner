/**
 * Gap analysis for the agentic trip planner.
 *
 * Philosophy: Infer first, ask only when stuck.
 * Only cities are truly critical — everything else gets smart defaults.
 * The AI should propose a complete picture early and let the user tweak.
 */

/**
 * Smart defaults for anything the user hasn't specified.
 */
export function getSmartDefaults(tripState) {
  const cityCount = tripState.route.cities.length || 1;
  const hasNights = tripState.dates.totalNights != null;
  const hasCityNights = tripState.route.cities.some(c => c.nights != null);

  return {
    nightsPerCity: 3,
    totalNights: hasNights
      ? tripState.dates.totalNights
      : hasCityNights
        ? tripState.route.cities.reduce((s, c) => s + (c.nights || 3), 0)
        : cityCount * 3,
    transport: 'train',
    budget: 'moderate',
    accommodation: 'hotel',
    pace: 'balanced',
    interests: ['culture', 'food', 'walking'],
  };
}

/**
 * Analyze the current trip state and return gaps + smart defaults.
 *
 * Gaps are things the AI should naturally weave into conversation,
 * NOT a rigid checklist to interrogate the user about.
 */
export function analyzeGaps(tripState) {
  const gaps = [];
  const r = tripState.route;
  const d = tripState.dates;
  const b = tripState.budget;
  const tv = tripState.travelers;
  const p = tripState.preferences;
  // hardFilled: user has explicitly provided this info. Drives completeness %.
  // softFilled: we have a safe default so it shouldn't block, but we still
  // surface it as a gap the agent can weave into conversation. Not counted
  // toward completeness so the bar and the category dots agree.
  const hardFilled = new Set();
  const softFilled = new Set();

  // ── Critical: cities ──────────────────────────────────────
  // This is the only thing we truly need from the user.
  if (r.cities.length === 0) {
    gaps.push({
      field: 'cities',
      priority: 1,
      critical: true,
      question: 'Which European cities are you interested in visiting?',
    });
  } else {
    hardFilled.add('cities');
  }

  // ── Important: duration ───────────────────────────────────
  // Good to know, but we can default to ~3 nights per city.
  const hasNights = d.totalNights != null;
  const hasCityNights = r.cities.some(c => c.nights != null);
  const hasDateRange = d.startDate && d.endDate;
  if (!hasNights && !hasCityNights && !hasDateRange) {
    softFilled.add('duration');
    if (r.cities.length > 0) {
      gaps.push({
        field: 'duration',
        priority: 3,
        critical: false,
        question: `How many nights are you thinking? (I'd suggest ~${r.cities.length * 3} for ${r.cities.length} ${r.cities.length === 1 ? 'city' : 'cities'})`,
      });
    }
  } else {
    hardFilled.add('duration');
  }

  // ── Important: dates ──────────────────────────────────────
  // Useful for weather/events, but "flexible" is fine.
  if (!d.startDate && !d.flexibleMonth && !d.flexibility) {
    softFilled.add('dates');
    if (r.cities.length > 0) {
      gaps.push({
        field: 'dates',
        priority: 4,
        critical: false,
        question: 'When are you thinking of going?',
      });
    }
  } else {
    hardFilled.add('dates');
  }

  // ── Optional: interests ───────────────────────────────────
  // Helps with city suggestions and highlights. Default: balanced mix.
  if (p.interests.length === 0) {
    gaps.push({
      field: 'interests',
      priority: 5,
      critical: false,
      question: 'What are you into — culture, food, nature, nightlife?',
    });
  } else {
    hardFilled.add('interests');
  }

  // ── Optional: budget ──────────────────────────────────────
  // Default: moderate. Only ask if it would change recommendations.
  if (!b.style && b.total == null) {
    gaps.push({
      field: 'budget',
      priority: 6,
      critical: false,
      question: 'Any budget preference?',
    });
  } else {
    hardFilled.add('budget');
  }

  // ── Optional: travelers ───────────────────────────────────
  // Only matters for family/accessibility. Default: solo/couple.
  if (!tv.groupType && tv.count == null) {
    gaps.push({
      field: 'travelers',
      priority: 7,
      critical: false,
      question: 'Who is going — solo, couple, family, friends?',
    });
  } else {
    hardFilled.add('travelers');
  }

  // ── Route gaps: unallocated nights ────────────────────────
  if (r.cities.length >= 2 && d.totalNights) {
    const allocatedNights = r.cities.reduce((s, c) => s + (c.nights || 0), 0);
    const unallocated = d.totalNights - allocatedNights;
    if (unallocated >= 3) {
      gaps.push({
        field: 'routeGap',
        priority: 8,
        critical: false,
        question: `You have ${unallocated} unallocated nights. Want suggestions for stops to fill the gap?`,
      });
    }
  }

  gaps.sort((a, b) => a.priority - b.priority);

  // Completeness: only count fields the user actually specified.
  // Invariant: if a field has an entry in `gaps`, it is NOT counted as complete.
  const trackedFields = ['cities', 'duration', 'dates', 'interests', 'budget', 'travelers'];
  const filledCount = trackedFields.filter(f => hardFilled.has(f)).length;
  const completeness = Math.round((filledCount / trackedFields.length) * 100);

  return {
    gaps,
    nextQuestion: gaps[0] || null,
    completeness,
    hardFilled: Array.from(hardFilled),
    softFilled: Array.from(softFilled),
    // Ready to generate a framework as soon as we have at least 1 city
    isReadyToFinalize: r.cities.length > 0,
  };
}

/**
 * Build compact context string for Claude showing current state + defaults.
 */
export function buildAgentContext(tripState) {
  const { gaps, completeness } = analyzeGaps(tripState);
  const defaults = getSmartDefaults(tripState);
  const lines = [];
  const r = tripState.route;
  const d = tripState.dates;
  const t = tripState.transport;
  const b = tripState.budget;
  const tv = tripState.travelers;
  const p = tripState.preferences;

  lines.push(`## Trip State (${completeness}% specified)`);

  // Route
  if (r.cities.length > 0) {
    const routeStr = r.cities.map(c => {
      let s = c.name;
      if (c.nights) s += ` (${c.nights}n)`;
      return s;
    }).join(' → ');
    lines.push(`Route: ${routeStr}`);
  } else {
    lines.push('Route: not set');
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

  // Smart defaults — tell Claude what to assume for anything not specified
  lines.push('');
  lines.push('## Smart Defaults (use these for anything not specified above)');
  if (!d.totalNights && !d.startDate) {
    lines.push(`Duration: ~${defaults.totalNights} nights (~${defaults.nightsPerCity} per city)`);
  }
  if (!t.preferredMode && t.bookings.length === 0) {
    lines.push(`Transport: ${defaults.transport} for short routes, flight for 5h+`);
  }
  if (!b.style && b.total == null) {
    lines.push(`Budget: ${defaults.budget}`);
  }
  if (p.interests.length === 0) {
    lines.push(`Interests: ${defaults.interests.join(', ')}`);
  }
  lines.push(`Pace: ${p.pace || defaults.pace}`);

  // Remaining gaps — things to weave in naturally
  if (gaps.length > 0) {
    lines.push('');
    lines.push(`## Info to Weave In (${gaps.length} items — do NOT interrogate)`);
    gaps.forEach(g => {
      lines.push(`  - ${g.field}: ${g.question}`);
    });
  }

  return lines.join('\n');
}
