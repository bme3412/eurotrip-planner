// Pure helpers for turning a saved trip (normalized days) into the plan shape the
// itinerary surfaces expect. Extracted from the saved-itinerary page so the
// concierge preview route can reuse the same normalization + weather logic.

export function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateRange(start, end) {
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

export function inferDayTheme(activities) {
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

export function buildPlanFromNormalizedDays(trip) {
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

    const cityName = day.city
      ? String(day.city).charAt(0).toUpperCase() + String(day.city).slice(1)
      : null;

    return {
      date: day.date,
      dayNumber: day.day_number,
      theme: theme || `Day ${day.day_number}`,
      // Carry city/travel metadata so multi-city saved trips group by city and
      // render travel days (single-city trips just leave these null).
      city: day.city || null,
      cityName,
      country: day.country || null,
      isTravelDay: Boolean(day.is_travel_day),
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

/**
 * Extract monthly weather for the trip start month.
 */
export function extractWeather(visitCalendar, startDate) {
  if (!visitCalendar?.months || !startDate) return null;
  const d = parseDate(startDate);
  if (!d) return null;
  const monthName = d.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' }).toLowerCase();
  return visitCalendar.months[monthName]?.weatherDetails || null;
}
