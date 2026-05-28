/**
 * Gap analysis for the agentic trip planner.
 *
 * Philosophy: Infer first, ask only when stuck.
 * Only cities are truly critical — everything else gets smart defaults.
 * The AI should propose a complete picture early and let the user tweak.
 */

/**
 * Compact, model-readable summary of one city's stay on the Route: line.
 * Includes nights and any accommodation info the user has provided so the
 * agent can confirm or edit a hotel by reading the brief, not by guessing.
 *
 * Example outputs:
 *   "Paris"
 *   "Paris (3n)"
 *   "Paris (3n, Hotel Ritz, Apr 12 → Apr 15)"
 *   "Paris (3n, Hotel Ritz, conf ABC123)"
 */
export function formatRouteEntry(city) {
  if (!city) return '';
  const parts = [];
  if (Number.isFinite(city.nights) && city.nights > 0) parts.push(`${city.nights}n`);

  const acc = city.accommodation;
  if (acc && typeof acc === 'object') {
    if (acc.name) parts.push(acc.name);
    if (acc.checkIn || acc.checkOut) {
      parts.push(`${acc.checkIn || '?'} → ${acc.checkOut || '?'}`);
    }
    if (acc.confirmationNumber) parts.push(`conf ${acc.confirmationNumber}`);
  }

  return parts.length > 0 ? `${city.name} (${parts.join(', ')})` : city.name;
}

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

export const INTAKE_TAXONOMY = [
  {
    id: 'routeAnchors',
    label: 'Route anchors',
    purpose: 'Determine the skeleton of the trip and any hard location constraints.',
  },
  {
    id: 'timeEnvelope',
    label: 'Time envelope',
    purpose: 'Shape seasonality, day allocation, weather fit, and pacing realism.',
  },
  {
    id: 'travelerContext',
    label: 'Traveler context',
    purpose: 'Tune accessibility, suitability, safety, meal choices, and activity intensity.',
  },
  {
    id: 'tripIntent',
    label: 'Trip intent',
    purpose: 'Choose what to optimize for when several routes are valid.',
  },
  {
    id: 'preferenceSignals',
    label: 'Preference signals',
    purpose: 'Rank cities, activities, neighborhoods, transport, and lodging tradeoffs.',
  },
  {
    id: 'negativeConstraints',
    label: 'Negative constraints',
    purpose: 'Prevent polished itineraries that violate the user’s real boundaries.',
  },
  {
    id: 'confidenceAssumptions',
    label: 'Confidence and assumptions',
    purpose: 'Move fast with editable assumptions instead of blocking on optional fields.',
  },
];

function compactList(items = [], max = 4) {
  return items.filter(Boolean).slice(0, max);
}

function getBrief(tripState) {
  return {
    intent: null,
    targetRegions: [],
    intentSignals: [],
    hardConstraints: [],
    negativeConstraints: [],
    assumptions: [],
    notes: [],
    ...(tripState.brief || {}),
  };
}

function buildIntakeStatus(tripState, hardFilled, softFilled, defaults) {
  const r = tripState.route;
  const d = tripState.dates;
  const tv = tripState.travelers;
  const p = tripState.preferences;
  const b = tripState.budget;
  const brief = getBrief(tripState);

  const routeSummary = r.cities.length
    ? r.cities.map((c) => c.name).join(' → ')
    : null;
  const routeIntentSummary = brief.targetRegions.length
    ? `Target regions: ${compactList(brief.targetRegions).join(', ')}`
    : null;
  const timingSummary = d.startDate
    ? `${d.startDate}${d.endDate ? ` to ${d.endDate}` : ''}`
    : d.flexibleMonth || (d.totalNights ? `${d.totalNights} nights` : null);
  const travelerSummary = tv.count
    ? `${tv.count} ${tv.groupType || 'traveler(s)'}`
    : tv.groupType;
  const preferenceSummary = [
    p.interests.length ? p.interests.join(', ') : null,
    p.pace,
    b.style,
    tripState.transport.preferredMode,
  ].filter(Boolean).join('; ');

  return {
    routeAnchors: {
      status: hardFilled.has('cities') ? 'confirmed' : 'needed',
      summary: [routeSummary, routeIntentSummary].filter(Boolean).join('; ') || 'No route anchors yet',
      purpose: INTAKE_TAXONOMY[0].purpose,
    },
    timeEnvelope: {
      status: hardFilled.has('dates') || hardFilled.has('duration') ? 'confirmed' : 'assumed',
      summary: timingSummary || `Assume ~${defaults.totalNights} nights until the user specifies timing`,
      purpose: INTAKE_TAXONOMY[1].purpose,
    },
    travelerContext: {
      status: hardFilled.has('travelers') ? 'confirmed' : 'assumed',
      summary: travelerSummary || 'Assume adults with no special constraints',
      purpose: INTAKE_TAXONOMY[2].purpose,
    },
    tripIntent: {
      status: brief.intent || brief.intentSignals.length ? 'confirmed' : 'unknown',
      summary: brief.intent || compactList(brief.intentSignals).join(', ') || 'No explicit trip intent yet',
      purpose: INTAKE_TAXONOMY[3].purpose,
    },
    preferenceSignals: {
      status: preferenceSummary ? 'confirmed' : 'assumed',
      summary: preferenceSummary || `Assume ${defaults.pace} pace, ${defaults.budget} budget, ${defaults.interests.join(', ')}`,
      purpose: INTAKE_TAXONOMY[4].purpose,
    },
    negativeConstraints: {
      status: brief.hardConstraints.length || brief.negativeConstraints.length ? 'confirmed' : 'open',
      summary: [
        ...compactList(brief.hardConstraints),
        ...compactList(brief.negativeConstraints),
      ].join('; ') || 'No avoid/prevent constraints captured',
      purpose: INTAKE_TAXONOMY[5].purpose,
    },
    confidenceAssumptions: {
      status: softFilled.size > 0 || brief.assumptions.length ? 'assumed' : 'confirmed',
      summary: compactList([
        ...brief.assumptions,
        softFilled.has('duration') ? `~${defaults.totalNights} nights` : null,
        softFilled.has('dates') ? 'dates flexible' : null,
        !hardFilled.has('budget') ? `${defaults.budget} budget` : null,
      ]).join('; ') || 'No major assumptions',
      purpose: INTAKE_TAXONOMY[6].purpose,
    },
  };
}

function buildNextMove({ tripState, hardFilled, defaults, gaps }) {
  const r = tripState.route;
  const d = tripState.dates;
  const p = tripState.preferences;
  const brief = getBrief(tripState);

  if (r.cities.length === 0) {
    return {
      type: 'ask',
      field: 'cities',
      label: 'Get route anchors',
      question: 'What city, region, booking, or rough Europe idea should anchor the trip?',
      purpose: 'The planner needs at least one anchor before it can draft a route.',
      canDraft: false,
      options: [
        { id: 'paste', label: 'Paste what I have' },
        { id: 'suggest', label: 'Suggest a route' },
        { id: 'classic', label: 'Classic first Europe trip' },
      ],
    };
  }

  if (brief.targetRegions.length > 0) {
    const targets = compactList(brief.targetRegions, 3).join(' / ');
    return {
      type: 'choose',
      field: 'destinationIntent',
      label: 'Choose specific cities',
      question: `Which specific cities should represent ${targets}?`,
      purpose: 'Country or region intent needs concrete cities before it becomes a committed route stop.',
      canDraft: true,
      options: [
        { id: 'suggest-cities', label: 'Suggest specific cities' },
        { id: 'capital-route', label: 'Use capital cities' },
        { id: 'hidden-gems', label: 'Find less obvious stops' },
      ],
    };
  }

  if (!d.totalNights && !r.cities.some(c => c.nights != null) && !d.startDate && !d.flexibleMonth) {
    return {
      type: 'ask_or_draft',
      field: 'duration',
      label: 'Frame the time envelope',
      question: `How much time do you have? I can also draft around ~${defaults.totalNights} nights.`,
      purpose: 'Duration is the biggest lever for whether the route feels rushed or relaxed.',
      canDraft: true,
      options: [
        { id: 'draft', label: 'Build a first draft' },
        { id: 'suggested', label: `${defaults.totalNights} nights works` },
        { id: 'flexible', label: "I'm flexible" },
      ],
    };
  }

  if (!brief.intent && brief.intentSignals.length === 0 && p.interests.length === 0) {
    return {
      type: 'ask_or_draft',
      field: 'tripIntent',
      label: 'Understand the trip vibe',
      question: 'What should this trip optimize for: food, culture, beaches, nightlife, scenery, or a first-Europe overview?',
      purpose: 'Intent decides which good itinerary is actually right for this traveler.',
      canDraft: true,
      options: [
        { id: 'food', label: 'Prioritize food' },
        { id: 'culture', label: 'Culture and history' },
        { id: 'overview', label: 'First-Europe highlights' },
        { id: 'draft', label: 'Build a first draft' },
      ],
    };
  }

  if (!d.startDate && !d.flexibleMonth && !d.flexibility) {
    return {
      type: 'ask_or_draft',
      field: 'dates',
      label: 'Tune for seasonality',
      question: 'When are you thinking of going? If dates are flexible, I’ll keep the first draft season-neutral.',
      purpose: 'Dates improve weather, crowd, event, and opening-hours choices.',
      canDraft: true,
      options: [
        { id: 'spring', label: 'Spring' },
        { id: 'fall', label: 'Fall' },
        { id: 'flexible', label: "I'm flexible" },
        { id: 'draft', label: 'Build a first draft' },
      ],
    };
  }

  if (gaps.some(g => g.field === 'routeGap')) {
    const gap = gaps.find(g => g.field === 'routeGap');
    return {
      type: 'suggest',
      field: 'routeGap',
      label: 'Fill route gap',
      question: gap.question,
      purpose: 'Unallocated nights can become a useful stop or extra breathing room.',
      canDraft: true,
      options: [
        { id: 'suggest-stop', label: 'Suggest a stop' },
        { id: 'spread-out', label: 'Spread the nights out' },
        { id: 'draft', label: 'Build a first draft' },
      ],
    };
  }

  return {
    type: 'draft',
    field: 'draft',
    label: 'Ready to draft',
    question: 'Ready to build the detailed itinerary, or would you like to adjust the brief first?',
    purpose: 'The planner has enough to create a coherent itinerary and can keep assumptions editable.',
    canDraft: true,
    options: [
      { id: 'draft', label: 'Build the itinerary' },
      { id: 'slower', label: 'Make it slower' },
      { id: 'avoid-flights', label: 'Avoid flights' },
    ],
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
  const defaults = getSmartDefaults(tripState);
  const nextMove = buildNextMove({ tripState, hardFilled, defaults, gaps });
  const intake = buildIntakeStatus(tripState, hardFilled, softFilled, defaults);
  const draftReadiness = r.cities.length === 0
    ? 'needs_anchor'
    : nextMove.field === 'draft'
      ? 'ready'
      : 'draft_with_assumptions';

  return {
    gaps,
    nextQuestion: nextMove,
    nextMove,
    intake,
    taxonomy: INTAKE_TAXONOMY,
    draftReadiness,
    canDraft: nextMove.canDraft,
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
  const { gaps, completeness, nextMove, intake, draftReadiness } = analyzeGaps(tripState);
  const defaults = getSmartDefaults(tripState);
  const lines = [];
  const r = tripState.route;
  const d = tripState.dates;
  const t = tripState.transport;
  const b = tripState.budget;
  const tv = tripState.travelers;
  const p = tripState.preferences;
  const brief = getBrief(tripState);

  lines.push(`## Living Travel Brief (${draftReadiness}; ${completeness}% explicit)`);

  // Route
  if (r.cities.length > 0) {
    const routeStr = r.cities.map(c => formatRouteEntry(c)).join(' → ');
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
  if (brief.intent) lines.push(`Trip intent: ${brief.intent}`);
  if (brief.targetRegions.length > 0) lines.push(`Target regions: ${brief.targetRegions.join(', ')}`);
  if (brief.intentSignals.length > 0) lines.push(`Intent signals: ${brief.intentSignals.join(', ')}`);
  if (brief.hardConstraints.length > 0) lines.push(`Hard constraints: ${brief.hardConstraints.join('; ')}`);
  if (brief.negativeConstraints.length > 0) lines.push(`Avoid: ${brief.negativeConstraints.join('; ')}`);
  if (brief.notes.length > 0) lines.push(`Notes: ${brief.notes.join('; ')}`);

  lines.push('');
  lines.push('## Intake Map (purpose-based, not a checklist)');
  for (const item of INTAKE_TAXONOMY) {
    const status = intake[item.id];
    if (!status) continue;
    lines.push(`- ${item.label}: ${status.status} — ${status.summary}`);
    lines.push(`  Purpose: ${item.purpose}`);
  }

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

  lines.push('');
  lines.push('## Next Best Move');
  lines.push(`Mode: ${nextMove.type}`);
  lines.push(`Question: ${nextMove.question}`);
  lines.push(`Why it matters: ${nextMove.purpose}`);
  lines.push(`Can draft now: ${nextMove.canDraft ? 'yes' : 'no'}`);

  // Remaining gaps — things to weave in naturally, not a required checklist.
  const remaining = gaps.filter((g) => g.field !== nextMove.field);
  if (remaining.length > 0) {
    lines.push('');
    lines.push(`## Other Signals That Would Improve the Draft (${remaining.length}; do not interrogate)`);
    remaining.forEach(g => {
      lines.push(`  - ${g.field}: ${g.question}`);
    });
  }

  return lines.join('\n');
}
