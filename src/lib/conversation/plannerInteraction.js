import { buildDayAssignments } from './dayAssignments';

function normalizeSuggestion(suggestion) {
  if (!suggestion) return null;
  if (typeof suggestion === 'string') {
    return {
      id: suggestion.toLowerCase().replace(/\s+/g, '-'),
      name: suggestion,
    };
  }
  return {
    ...suggestion,
    id: suggestion.id || suggestion.name?.toLowerCase?.().replace(/\s+/g, '-'),
    name: suggestion.name,
  };
}

function normalizeSuggestions(suggestions = []) {
  const seen = new Set();
  const out = [];
  for (const suggestion of suggestions || []) {
    const normalized = normalizeSuggestion(suggestion);
    if (!normalized?.id || !normalized?.name) continue;
    if (seen.has(normalized.id)) continue;
    seen.add(normalized.id);
    out.push(normalized);
  }
  return out;
}

function freeNightCount(tripState) {
  const totalNights = tripState?.dates?.totalNights;
  return buildDayAssignments(tripState).filter((day) => {
    if (day.cityId) return false;
    if (Number.isFinite(totalNights) && day.dayIndex >= totalNights) return false;
    return true;
  }).length;
}

function isPendingInputValid(pendingInput, tripState) {
  if (!pendingInput?.type) return false;
  const hasCities = (tripState?.route?.cities || []).length > 0;
  const type = pendingInput.type;

  if (type === 'render_city_picker' || type === 'show_city_search') return true;
  if (type === 'render_date_picker' || type === 'show_date_picker') return true;
  if (type === 'render_nights_allocator' || type === 'show_days_allocation') return hasCities;
  if (type === 'render_options' || type === 'show_options') return true;
  if (type === 'confirm_changes' || type === 'render_trip_card' || type === 'show_route_summary') return true;
  if (type === 'parse_itinerary') return true;
  return false;
}

function activeWidgetForPending(pendingInput, tripState) {
  if (!isPendingInputValid(pendingInput, tripState)) return 'none';
  switch (pendingInput.type) {
    case 'render_city_picker':
    case 'show_city_search':
      return 'city_picker';
    case 'render_date_picker':
    case 'show_date_picker':
      return 'date_picker';
    case 'render_nights_allocator':
    case 'show_days_allocation':
      return 'night_allocator';
    case 'render_options':
    case 'show_options':
      return 'route_options';
    case 'confirm_changes':
    case 'render_trip_card':
    case 'show_route_summary':
    case 'parse_itinerary':
      return 'route_review';
    default:
      return 'none';
  }
}

function modeForState({ tripState, gaps, pendingInput, generationPhase, activeWidget, freeNights }) {
  if (generationPhase === 'generating') return 'generate_itinerary';
  if (activeWidget === 'city_picker') {
    const purpose = pendingInput?.data?.purpose;
    const hasCities = (tripState?.route?.cities || []).length > 0;
    return hasCities || purpose === 'suggest_stops' ? 'choose_stops' : 'collect_anchor';
  }
  if (activeWidget === 'date_picker') return 'collect_time';
  if (activeWidget === 'night_allocator') return 'allocate_nights';
  if (activeWidget === 'route_options') return 'choose_stops';
  if (activeWidget === 'route_review') return 'review_route';

  const hasCities = (tripState?.route?.cities || []).length > 0;
  if (!hasCities) return 'collect_anchor';
  if ((gaps?.nextMove || gaps?.nextQuestion)?.field === 'destinationIntent') return 'choose_stops';
  if ((gaps?.nextMove || gaps?.nextQuestion)?.field === 'duration') return 'collect_time';
  if (freeNights > 0 && gaps?.gaps?.some((gap) => gap.field === 'routeGap')) return 'allocate_nights';
  if (gaps?.canDraft) return 'review_route';
  return 'idle';
}

function quickRepliesForMode(mode, gaps) {
  if (mode === 'collect_anchor') {
    return [
      { id: 'paste', label: 'Paste what I have' },
      { id: 'suggest', label: 'Suggest a route' },
      { id: 'classic', label: 'Classic first Europe trip' },
    ];
  }
  if (mode === 'collect_time') {
    return [
      { id: 'draft', label: 'Build a first draft' },
      { id: 'flexible', label: "I'm flexible" },
      { id: 'slower', label: 'Make it slower' },
    ];
  }
  if (mode === 'allocate_nights') {
    return [
      { id: 'suggest-stop', label: 'Suggest a stop' },
      { id: 'spread-out', label: 'Spread the nights out' },
      { id: 'draft', label: 'Build a first draft' },
    ];
  }
  if (mode === 'review_route') {
    return [
      { id: 'draft', label: 'Build the itinerary' },
      { id: 'slower', label: 'Make it slower' },
      { id: 'avoid-flight', label: 'Avoid flights' },
    ];
  }
  return (gaps?.nextMove || gaps?.nextQuestion)?.options || [];
}

function copyForMode(mode, gaps) {
  const next = gaps?.nextMove || gaps?.nextQuestion;
  const map = {
    collect_anchor: {
      status: 'Needs anchor',
      nextLabel: 'Get route anchor',
      placeholder: 'Tell me a city, region, booking, or rough idea...',
    },
    collect_time: {
      status: 'Set timing',
      nextLabel: 'Frame the time envelope',
      placeholder: 'Say how much time you have, or ask for a first draft...',
    },
    choose_stops: {
      status: 'Choose stops',
      nextLabel: 'Resolve destination intent',
      placeholder: 'Choose specific cities, ask for tradeoffs, or name the stop you want...',
    },
    allocate_nights: {
      status: 'Allocate nights',
      nextLabel: 'Assign open nights',
      placeholder: 'Assign open nights, spread them out, or ask for a draft...',
    },
    review_route: {
      status: 'Ready',
      nextLabel: next?.label || 'Review route',
      placeholder: 'Add constraints or say “build it”...',
    },
    generate_itinerary: {
      status: 'Generating',
      nextLabel: 'Build itinerary',
      placeholder: 'Generating...',
    },
    idle: {
      status: 'Working brief',
      nextLabel: next?.label || 'Continue',
      placeholder: 'Anything else to add?',
    },
  };
  return map[mode] || map.idle;
}

function previewSuggestionsForPending(pendingInput) {
  if (!pendingInput) return [];
  if (pendingInput.type === 'render_city_picker' || pendingInput.type === 'show_city_search') {
    return normalizeSuggestions(pendingInput.data?.suggestions || []);
  }
  if (pendingInput.type === 'render_options' || pendingInput.type === 'show_options') {
    return normalizeSuggestions(
      (pendingInput.data?.options || [])
        .map((option) => option.city || option.cityName || option.name || option.label)
    );
  }
  return [];
}

export function derivePlannerInteraction({
  tripState,
  gaps,
  pendingInput,
  messages = [],
  generationPhase = 'idle',
  isStreaming = false,
  isFinalized = false,
} = {}) {
  const hasUserMessages = messages.some((message) => message.role === 'user');
  const hasCities = (tripState?.route?.cities || []).length > 0;
  const freeNights = freeNightCount(tripState);
  const pendingValid = isPendingInputValid(pendingInput, tripState);
  const pendingWidget = activeWidgetForPending(pendingInput, tripState);
  const fallbackWidget =
    freeNights > 0 && gaps?.gaps?.some((gap) => gap.field === 'routeGap')
      ? 'night_allocator'
      : 'none';
  const activeWidget = pendingWidget !== 'none' ? pendingWidget : fallbackWidget;
  const mode = modeForState({ tripState, gaps, pendingInput, generationPhase, activeWidget, freeNights });
  const previewSuggestions = previewSuggestionsForPending(pendingInput);
  const mapMode = !hasCities
    ? (previewSuggestions.length > 0 ? 'preview_suggestions' : 'empty')
    : (previewSuggestions.length > 0 ? 'review_route' : 'confirmed_route');

  return {
    mode,
    activeWidget,
    mapMode,
    pendingInput: pendingValid ? pendingInput : null,
    pendingInputValid: pendingValid,
    previewSuggestions,
    copy: copyForMode(mode, gaps),
    quickReplies: isFinalized || isStreaming || pendingValid
      ? []
      : quickRepliesForMode(mode, gaps),
    showWelcome: !hasUserMessages && !hasCities && !pendingValid,
    showProgress: hasCities || hasUserMessages || pendingValid,
    showRouteAllocator: activeWidget === 'night_allocator',
    freeNightCount: freeNights,
  };
}
