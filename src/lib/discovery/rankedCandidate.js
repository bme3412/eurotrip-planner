function firstTruthy(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== '');
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function extractWeather(candidate) {
  const weatherHighlight = candidate.highlights?.find?.((item) => item.type === 'weather');
  return {
    temperature:
      candidate.weather?.highC ??
      candidate.weather?.avgC ??
      candidate.v4?.factors?.timing?.details?.weather?.highC ??
      null,
    label: weatherHighlight?.name || candidate.weather?.summary || null,
  };
}

function extractEvents(candidate) {
  const eventHighlights = candidate.highlights?.filter?.((item) => item.type === 'event') || [];
  if (eventHighlights.length > 0) {
    return eventHighlights.map((event) => ({
      name: event.name,
      date: event.date || null,
      description: event.description || null,
    }));
  }
  return candidate.events || candidate.v4?.factors?.timing?.details?.events || [];
}

export function normalizeRankedCandidate(candidate, options = {}) {
  if (!candidate) return null;

  const cityId = firstTruthy(candidate.cityId, candidate.id, candidate.slug, slugify(candidate.title || candidate.cityName || candidate.name));
  const name = firstTruthy(candidate.cityName, candidate.title, candidate.name, cityId?.replace(/-/g, ' '));
  if (!cityId || !name) return null;

  const finalScore = candidate.v4?.finalScore ?? candidate.score ?? candidate.matchScore ?? null;
  const rank = options.rank ?? candidate.rank ?? null;
  const weather = extractWeather(candidate);
  const crowds = candidate.crowdLevel || candidate.v4?.factors?.crowds?.details?.crowdLevel || null;
  const events = extractEvents(candidate);
  const reason = firstTruthy(
    candidate.whyExpanded,
    candidate.why,
    candidate.reason,
    candidate.shortTagline,
    candidate.highlights?.[0]?.description
  );

  return {
    cityId,
    id: cityId,
    name,
    cityName: name,
    country: candidate.country || null,
    score: finalScore,
    rank,
    tier: candidate.tier || candidate.v4?.tier || null,
    reason: reason || null,
    dateWindow: {
      start: options.startDate || candidate.dateWindow?.start || candidate.startDate || null,
      end: options.endDate || candidate.dateWindow?.end || candidate.endDate || null,
    },
    weather,
    crowds,
    events,
    value: candidate.v4?.factors?.value?.score ?? candidate.valueScore ?? null,
    logistics: candidate.v4?.factors?.logistics?.score ?? candidate.logisticsScore ?? null,
    route: {
      travelTime: firstTruthy(candidate.transportTime, candidate.travelTime, candidate.route?.travelTime),
      travelMinutes: firstTruthy(candidate.travelMinutes, candidate.route?.travelMinutes),
      transportType: firstTruthy(candidate.transportType, candidate.route?.transportType),
      recommendedDays: firstTruthy(candidate.recommendedDays, candidate.route?.recommendedDays),
    },
    image: candidate.image || candidate.thumbnail || null,
    raw: candidate,
  };
}

export function rankedCandidateToPlanPrompt(candidate) {
  const normalized = normalizeRankedCandidate(candidate);
  if (!normalized) return '';

  const parts = [`Plan a trip to ${normalized.name}`];
  if (normalized.country) parts[0] += `, ${normalized.country}`;

  const dateWindow = normalized.dateWindow || {};
  if (dateWindow.start && dateWindow.end) {
    parts.push(`for ${dateWindow.start} to ${dateWindow.end}`);
  }

  const context = [];
  if (normalized.rank) context.push(`ranked #${normalized.rank}`);
  if (normalized.score != null) context.push(`score ${Math.round(Number(normalized.score))}`);
  if (normalized.reason) context.push(normalized.reason);
  if (normalized.weather?.label) context.push(normalized.weather.label);
  if (normalized.crowds) context.push(`${normalized.crowds} crowds`);
  if (normalized.events?.length) {
    context.push(`notable timing: ${normalized.events.slice(0, 2).map((event) => event.name || event).join(', ')}`);
  }

  if (context.length > 0) {
    parts.push(`It was ${context.join('; ')}.`);
  }

  return parts.join(' ');
}

export function rankedCandidateToPlannerParams(candidate) {
  const normalized = normalizeRankedCandidate(candidate);
  const prompt = rankedCandidateToPlanPrompt(normalized);
  const params = new URLSearchParams();

  if (normalized?.cityId) params.set('city', normalized.cityId);
  if (normalized?.name) params.set('cityName', normalized.name);
  if (normalized?.dateWindow?.start) params.set('startDate', normalized.dateWindow.start);
  if (normalized?.dateWindow?.end) params.set('endDate', normalized.dateWindow.end);
  if (normalized?.rank) params.set('rank', String(normalized.rank));
  if (normalized?.reason) params.set('reason', normalized.reason.slice(0, 220));
  if (prompt) params.set('q', prompt);

  return params;
}
