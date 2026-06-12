import { inngest } from '../client';
import { getConciergeWindowTrips } from '@/lib/trips/tripsRepository';
import { scanTripForHours } from '@/lib/concierge/hoursCheck';
import { sendHoursAlert } from '@/lib/concierge/notify';
import { placeDetails } from '@/lib/google-places/client';

// T3 watcher: once a day (16:00 UTC ≈ 18:00 CET, ahead of the 20:00 evening
// brief), check every active trip's TOMORROW against Google Places opening
// hours. Stops that are closed — or open well after their planned slot — get
// a deterministic heads-up in the thread, with the obvious fix attached as an
// Apply/Skip proposal. No LLM in this loop; sends are cheap, so they run
// inline (notification + thread rows are idempotent per day/kind).
const FIELD_MASK = 'businessStatus,regularOpeningHours';

async function fetchPlace(placeId) {
  if (!process.env.GOOGLE_PLACES_API_KEY) return null;
  return placeDetails(placeId, FIELD_MASK);
}

export const conciergeHoursWatch = inngest.createFunction(
  { id: 'concierge-hours-watch', name: 'Concierge: opening-hours watch', triggers: [{ cron: '0 16 * * *' }] },
  async ({ step }) => {
    const candidates = await step.run('load-window-trips', () => getConciergeWindowTrips());

    const now = new Date();
    let alerts = 0;
    for (const { trip, prefs } of candidates) {
      const hit = await step.run(`scan-${trip.id}`, () => scanTripForHours(trip, prefs, now, { fetchPlace }));
      if (hit) {
        await step.run(`send-${trip.id}`, () =>
          sendHoursAlert({ tripId: hit.tripId, dayNumber: hit.dayNumber, issues: hit.issues })
        );
        alerts += 1;
      }
    }
    return { scanned: candidates.length, alerts };
  }
);
