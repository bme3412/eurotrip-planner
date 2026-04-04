"use server";

import Link from "next/link";
import { notFound } from "next/navigation";
import { getCityData, getCityVisitCalendar, getCityExperiences } from "@/lib/data-utils";
import { buildParisRecommendations } from "@/lib/planning/buildParisRecommendations";
import { buildItinerary } from "@/lib/planning/buildItinerary";
import { getTripWithDetails } from "@/lib/trips/tripState";
import ItineraryClient from "./ItineraryClient";

// ─── Server-side helpers ────────────────────────────────────────────────

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateRange(start, end) {
  const startDate = parseDate(start);
  const endDate = parseDate(end);
  if (!startDate || !endDate) return "Flexible dates";
  const fmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
  const fmtYear = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
  if (startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear()) {
    return `${fmt.format(startDate)} – ${endDate.getDate()}, ${endDate.getFullYear()}`;
  }
  return `${fmt.format(startDate)} – ${fmtYear.format(endDate)}`;
}

function inferDayTheme(activities) {
  if (!activities?.length) return null;
  const types = activities.map(a => (a.type || '').toLowerCase());
  const names = activities.map(a => (a.name || '').toLowerCase()).join(' ');
  if (types.some(t => t.includes('museum') || t.includes('gallery')) || names.includes('museum')) return 'Art & Culture';
  if (types.some(t => t.includes('park') || t.includes('garden')) || names.includes('park') || names.includes('garden')) return 'Parks & Nature';
  if (types.some(t => t.includes('food') || t.includes('market')) || names.includes('market') || names.includes('food')) return 'Food & Markets';
  if (types.some(t => t.includes('church') || t.includes('cathedral') || t.includes('historic')) || names.includes('cathedral')) return 'History & Heritage';
  if (names.includes('river') || names.includes('cruise') || names.includes('boat')) return 'River & Views';
  if (types.some(t => t.includes('neighborhood') || t.includes('district'))) return 'Neighborhood Exploring';
  return 'City Discovery';
}

function buildPlanFromNormalizedDays(trip) {
  const days = (trip.days || []).map((day) => {
    const timeBlocks = (day.activities || []).map((act) => ({
      time: act.time_block,
      startTime: act.start_time || null,
      endTime: act.end_time || null,
      activity: {
        name: act.name,
        type: act.type,
        description: act.description,
        duration: act.duration_minutes ? `${act.duration_minutes} min` : null,
        price: act.price_range,
        neighborhood: act.neighborhood,
        bookingUrl: act.booking_url,
        indoor: act.indoor,
        latitude: act.latitude,
        longitude: act.longitude,
        googlePlaceId: act.google_place_id || null,
        googleRating: act.google_rating,
      },
    }));

    const theme = day.theme && day.theme !== `Day ${day.day_number}`
      ? day.theme
      : inferDayTheme(day.activities);

    return {
      date: day.date,
      dayNumber: day.day_number,
      theme: theme || `Day ${day.day_number}`,
      timeBlocks,
      activityCount: day.activities?.length || 0,
    };
  });

  const paceLabel = trip.pace <= 2 ? 'Relaxed' : trip.pace <= 4 ? 'Moderate' : 'Active';
  const totalDays = days.length;
  const totalActivities = days.reduce((s, d) => s + d.activityCount, 0);

  return {
    summary: `${totalDays} days, ${totalActivities} activities — curated for your ${paceLabel.toLowerCase()} pace`,
    travelStyle: {
      headline: paceLabel,
      description: `${paceLabel} pace · ${trip.interests?.join(', ') || 'varied interests'}`,
    },
    bookImmediately: [],
    days,
  };
}

function buildFriendlyDetails(item) {
  const lines = [];
  if (item.description) {
    lines.push(item.description.replace(/(^\w)/, (c) => c.toUpperCase()));
  }
  const minDur = item.visitProfile?.min_duration_hours ?? item.durationHours;
  const maxDur = item.visitProfile?.max_duration_hours;
  const block = item.visitProfile?.ideal_time_block;
  const bestTime = item.bestTime || item.openingHours?.weekday;
  if (bestTime || minDur || block) {
    const tidbits = [];
    if (bestTime) tidbits.push(`Sweet spot: ${bestTime.toLowerCase()}.`);
    if (minDur && maxDur && maxDur !== minDur) {
      tidbits.push(`Expect to linger for ${minDur}-${maxDur} hrs.`);
    } else if (minDur) {
      tidbits.push(`Give it about ${minDur} hr${minDur > 1 ? 's' : ''}.`);
    }
    if (block) tidbits.push(`Feels best as a ${block.toLowerCase()} moment.`);
    if (tidbits.length) lines.push(tidbits.join(' '));
  }
  if (item.bookingTips) lines.push(item.bookingTips);
  if (!item.bookingTips && item.transit?.closest_metro?.[0]) {
    const metro = item.transit.closest_metro[0];
    const walk = metro.walk_minutes ?? 5;
    lines.push(`Closest metro: line ${metro.line} ${metro.station} — about ${walk} min on foot.`);
  }
  return lines;
}

/**
 * Pre-compute friendly details for Paris-format plan so client doesn't need
 * the buildFriendlyDetails logic.
 */
function precomputeParisPlanDetails(plan) {
  if (!plan?.days) return plan;
  return {
    ...plan,
    days: plan.days.map(day => {
      if (!day.blocks) return day;
      return {
        ...day,
        blocks: day.blocks.map(block => {
          if (!block.item) return block;
          return {
            ...block,
            item: {
              ...block.item,
              friendlyDetails: buildFriendlyDetails(block.item),
            },
          };
        }),
      };
    }),
  };
}

/**
 * Extract monthly weather for the trip start month.
 */
function extractWeather(visitCalendar, startDate) {
  if (!visitCalendar?.months || !startDate) return null;
  const d = parseDate(startDate);
  if (!d) return null;
  const monthName = d.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' }).toLowerCase();
  return visitCalendar.months[monthName]?.weatherDetails || null;
}

/**
 * Build a normalized name → { score, pricingTier } lookup from experiences data.
 */
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

async function fetchTrip(tripId) {
  try {
    return await getTripWithDetails(tripId);
  } catch (error) {
    console.error("Failed to load trip", error);
    throw error;
  }
}

// ─── Page ───────────────────────────────────────────────────────────────

export default async function ItineraryPage({ params }) {
  const { tripId } = await params;

  let trip;
  try {
    trip = await fetchTrip(tripId);
  } catch {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-slate-100 py-12">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 text-slate-700">
          <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-6 shadow-sm">
            <h1 className="text-xl font-semibold text-red-800">We couldn&apos;t load this itinerary yet</h1>
            <p className="mt-2 text-sm text-red-700">
              Something went wrong while connecting to Supabase. Double-check that your environment variables are set and try again.
            </p>
            <Link
              href="/city-guides"
              className="mt-4 inline-flex w-max items-center justify-center rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:text-red-800"
            >
              &larr; Back to city guides
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!trip) notFound();

  const citySlug = trip.city || 'paris';
  const isParisTrip = citySlug.toLowerCase() === 'paris';
  const hasNormalizedDays = trip.days?.length > 0 && trip.days[0].activities?.length > 0;

  // Load city data, weather, and experience scores in parallel
  const [cityData, visitCalendar, experiences] = await Promise.all([
    getCityData(citySlug),
    getCityVisitCalendar(citySlug),
    getCityExperiences(citySlug),
  ]);

  // Build the plan
  let plan;
  if (hasNormalizedDays) {
    plan = buildPlanFromNormalizedDays(trip);
  } else if (isParisTrip) {
    plan = precomputeParisPlanDetails(buildParisRecommendations(trip, cityData));
  } else {
    plan = buildItinerary(trip, cityData);
  }

  const cityDisplay = cityData?.cityName || cityData?.name || citySlug.charAt(0).toUpperCase() + citySlug.slice(1);
  const dateRangeLabel = formatDateRange(trip.start_date, trip.end_date);
  const interestsList = trip.interests?.length ? trip.interests.join(' · ') : `${cityDisplay} essentials`;
  const weather = extractWeather(visitCalendar, trip.start_date);
  const experienceScores = buildExperienceScoreMap(experiences);

  return (
    <ItineraryClient
      plan={plan}
      tripId={tripId}
      cityDisplay={cityDisplay}
      citySlug={citySlug}
      thumbnail={cityData?.thumbnail}
      dateRangeLabel={dateRangeLabel}
      interestsList={interestsList}
      weather={weather}
      experienceScores={experienceScores}
    />
  );
}
