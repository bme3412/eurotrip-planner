/**
 * Generate Visit Description
 *
 * Creates contextual, human-readable descriptions for why to visit
 * a city during specific dates based on weather, events, and city traits.
 */

/**
 * Generate a contextual "why visit now" description for a city
 *
 * @param {Object} city - City data with name, whyGo, traits, etc.
 * @param {Object} dateScore - Date-specific scoring (weather, events, crowds)
 * @param {string} startDate - Gap start date (YYYY-MM-DD)
 * @param {string} endDate - Gap end date (YYYY-MM-DD)
 * @returns {string} Human-readable description paragraph
 */
export function generateVisitDescription(city, dateScore, startDate, endDate) {
  const parts = [];

  // Get month name for context
  const month = startDate
    ? new Date(startDate + 'T12:00:00').toLocaleString('en', { month: 'long' })
    : null;

  // === WEATHER OPENER ===
  const weatherOpener = getWeatherOpener(dateScore?.weather, month);
  if (weatherOpener) parts.push(weatherOpener);

  // === EVENT HIGHLIGHT ===
  const eventHighlight = getEventHighlight(dateScore?.events, month);
  if (eventHighlight) parts.push(eventHighlight);

  // === WHY GO (from connection data) ===
  if (city.whyGo) {
    // Trim if too long
    const whyGo = city.whyGo.length > 150
      ? city.whyGo.slice(0, 147) + '...'
      : city.whyGo;
    parts.push(whyGo);
  } else if (city.description) {
    // Fallback to city description (first sentence)
    const firstSentence = city.description.split(/[.!?]/)[0];
    if (firstSentence && firstSentence.length < 150) {
      parts.push(firstSentence + '.');
    }
  }

  // === CROWD CONTEXT ===
  const crowdContext = getCrowdContext(dateScore?.crowds);
  if (crowdContext) parts.push(crowdContext);

  // === SEASONAL TIP ===
  const seasonalTip = getSeasonalTip(city, month);
  if (seasonalTip && parts.length < 4) parts.push(seasonalTip);

  // Fallback if no content generated
  if (parts.length === 0) {
    return `${city.name} is a wonderful destination worth exploring.`;
  }

  return parts.join(' ');
}

/**
 * Get weather-based opener sentence
 */
function getWeatherOpener(weather, month) {
  if (!weather) return null;

  const temp = weather.label || weather.avgC;
  const score = weather.score ?? 70;

  if (score >= 85) {
    return month
      ? `Perfect weather in ${month}!`
      : 'Excellent weather conditions!';
  }

  if (score >= 70) {
    if (typeof temp === 'string' && temp.includes('°')) {
      return `Great weather expected (${temp}).`;
    }
    return 'Good weather for exploring.';
  }

  if (score >= 50) {
    return 'Weather is pleasant for sightseeing.';
  }

  // Below 50 - might be cold or rainy, but don't be negative
  return null;
}

/**
 * Get event highlight sentence
 */
function getEventHighlight(events, month) {
  if (!events || events.length === 0) return null;

  // Get the first/most important event
  const event = events[0];
  const eventName = event?.name || event;

  if (!eventName) return null;

  // Shorten long event names
  const displayName = eventName.length > 40
    ? eventName.slice(0, 37) + '...'
    : eventName;

  // Check for major festival types
  const isFestival = /festival|carnival|carnevale|fête|fiesta/i.test(eventName);
  const isMarket = /market|marché|mercado/i.test(eventName);
  const isHoliday = /holiday|new year|easter|christmas/i.test(eventName);

  if (isFestival) {
    return `Don't miss the ${displayName} - live music, food, and celebrations throughout the city.`;
  }

  if (isMarket) {
    return `The ${displayName} will be in full swing during your visit.`;
  }

  if (isHoliday) {
    return `Your dates coincide with ${displayName} - expect festive atmosphere and special events.`;
  }

  return `${displayName} is happening during your visit.`;
}

/**
 * Get crowd context sentence
 */
function getCrowdContext(crowds) {
  if (!crowds) return null;

  const level = (crowds.level || crowds.label || '').toLowerCase();

  if (level === 'very low' || level === 'low') {
    return 'Crowds are light, so you\'ll enjoy a more relaxed experience.';
  }

  if (level === 'moderate') {
    return null; // Don't mention moderate crowds
  }

  if (level === 'high' || level === 'very high') {
    return 'It\'s a popular time to visit, so book accommodations early.';
  }

  if (level === 'extreme') {
    return 'Peak season - expect busy attractions but vibrant energy.';
  }

  return null;
}

/**
 * Get seasonal tip based on city traits and month
 */
function getSeasonalTip(city, month) {
  if (!month) return null;

  const traits = city.traits || [];
  const monthLower = month.toLowerCase();

  // Beach cities in summer
  if (traits.includes('beachDestination')) {
    if (['june', 'july', 'august'].includes(monthLower)) {
      return 'Perfect beach weather awaits.';
    }
  }

  // Cultural cities in shoulder season
  if (traits.includes('cultural') || traits.includes('historical')) {
    if (['april', 'may', 'september', 'october'].includes(monthLower)) {
      return 'Ideal time for museum visits and walking tours.';
    }
  }

  // Winter destinations
  if (['december', 'january', 'february'].includes(monthLower)) {
    if (traits.includes('alpine') || city.name?.toLowerCase().includes('zurich') ||
        city.name?.toLowerCase().includes('innsbruck')) {
      return 'Winter wonderland atmosphere with nearby skiing options.';
    }
  }

  // Foodie cities
  if (traits.includes('foodie')) {
    return 'Be sure to try the local cuisine.';
  }

  return null;
}

/**
 * Generate a short tagline for the city card (1 sentence max)
 */
export function generateShortTagline(city, dateScore) {
  // Priority 1: Event happening
  if (dateScore?.events?.[0]) {
    const event = dateScore.events[0];
    const eventName = event?.name || event;
    if (eventName) {
      return eventName.length > 30
        ? eventName.slice(0, 27) + '...'
        : eventName;
    }
  }

  // Priority 2: Great weather
  if (dateScore?.weather?.score >= 80) {
    return 'Perfect weather';
  }

  // Priority 3: Low crowds
  const crowdLevel = (dateScore?.crowds?.level || '').toLowerCase();
  if (crowdLevel === 'very low' || crowdLevel === 'low') {
    return 'Quiet & uncrowded';
  }

  // Priority 4: City trait
  const traits = city.traits || [];
  if (traits.includes('romantic')) return 'Romantic getaway';
  if (traits.includes('cultural')) return 'Cultural gem';
  if (traits.includes('foodie')) return 'Food lover\'s paradise';
  if (traits.includes('beachDestination')) return 'Beach destination';
  if (traits.includes('hubCity')) return 'Well-connected hub';

  // Fallback
  return null;
}
