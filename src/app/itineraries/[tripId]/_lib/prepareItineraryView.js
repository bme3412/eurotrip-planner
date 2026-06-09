import { getCityData, getCityVisitCalendar, getCityExperiences } from '@/lib/data-utils';
import { buildItineraryWithRouting } from '@/lib/planning/buildItinerary';
import { buildPlanFromNormalizedDays, formatDateRange, extractWeather } from './buildPlan';

function buildExperienceScoreMap(experiences) {
  if (!experiences?.categories) return {};
  const map = {};
  for (const items of Object.values(experiences.categories)) {
    for (const item of items || []) {
      if (!item.name || !item.scores?.total_score) continue;
      map[item.name.toLowerCase().trim()] = {
        score: item.scores.total_score,
        pricingTier: item.pricing_tier || null,
      };
    }
  }
  return map;
}

/** Build ItineraryClient props from a loaded trip row (server or client). */
export async function prepareItineraryViewProps(trip, tripId) {
  const citySlug = trip.city || 'paris';
  const country = trip.country || 'France';
  const hasNormalizedDays = trip.days?.length > 0 && trip.days[0].activities?.length > 0;

  if (hasNormalizedDays) {
    const cityData = await getCityData(citySlug);
    const plan = buildPlanFromNormalizedDays(trip);
    const cityDisplay = cityData?.cityName || cityData?.name || citySlug.charAt(0).toUpperCase() + citySlug.slice(1);
    const dateRangeLabel = formatDateRange(trip.start_date, trip.end_date);
    const interestsList = trip.interests?.length ? trip.interests.join(' · ') : `${cityDisplay} essentials`;

    return {
      plan,
      tripState: trip.trip_state || null,
      tripId,
      cityDisplay,
      citySlug,
      country,
      thumbnail: cityData?.thumbnail,
      coordinates: cityData?.coordinates || null,
      dateRangeLabel,
      interestsList,
      hasNormalizedDays: true,
      weather: null,
      experienceScores: null,
    };
  }

  const [cityData, visitCalendar, experiences] = await Promise.all([
    getCityData(citySlug),
    getCityVisitCalendar(citySlug),
    getCityExperiences(citySlug),
  ]);

  const plan = await buildItineraryWithRouting(trip, cityData);
  const cityDisplay = cityData?.cityName || cityData?.name || citySlug.charAt(0).toUpperCase() + citySlug.slice(1);
  const dateRangeLabel = formatDateRange(trip.start_date, trip.end_date);
  const interestsList = trip.interests?.length ? trip.interests.join(' · ') : `${cityDisplay} essentials`;
  const weather = extractWeather(visitCalendar, trip.start_date);
  const experienceScores = buildExperienceScoreMap(experiences);

  return {
    plan,
    tripState: trip.trip_state || null,
    tripId,
    cityDisplay,
    citySlug,
    country,
    thumbnail: cityData?.thumbnail,
    coordinates: cityData?.coordinates || null,
    dateRangeLabel,
    interestsList,
    hasNormalizedDays: false,
    weather,
    experienceScores,
  };
}
