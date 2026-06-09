import { inngest } from '../client';
import { getConciergeWindowTrips } from '@/lib/trips/tripsRepository';
import { dueBeats } from '@/lib/concierge/schedule';

// Hourly cron: find trips in the concierge window and, for each beat due this hour
// in the trip's local timezone, fan out one `concierge/brief.due` event. The heavy
// per-trip generation happens in conciergeSend (concurrency-capped, retried), so
// this function stays fast regardless of how many trips are active.
export const conciergeTick = inngest.createFunction(
  { id: 'concierge-tick', name: 'Concierge: hourly tick', triggers: [{ cron: '0 * * * *' }] },
  async ({ step }) => {
    const candidates = await step.run('load-window-trips', () => getConciergeWindowTrips());

    const now = new Date();
    const events = [];
    for (const { trip, prefs } of candidates) {
      for (const beat of dueBeats(trip, prefs, now)) {
        events.push({
          name: 'concierge/brief.due',
          data: { tripId: trip.id, dayNumber: beat.dayNumber, type: beat.type, localDate: beat.localDate },
        });
      }
    }

    if (events.length) await step.sendEvent('fan-out-briefs', events);
    return { candidates: candidates.length, dispatched: events.length };
  }
);
