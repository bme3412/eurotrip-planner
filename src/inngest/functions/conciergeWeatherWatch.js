import { inngest } from '../client';
import { getConciergeWindowTrips } from '@/lib/trips/tripsRepository';
import { scanTripForReactive } from '@/lib/concierge/reactiveScan';

// Reactive signal monitor (v3). A few times a day, scan each active trip's TOMORROW
// for a material weather change; for each, fan out concierge/reactive.due. The cheap
// classifier (forecast + materiality) runs here; the expensive LLM alert runs in
// conciergeReactiveSend.
export const conciergeWeatherWatch = inngest.createFunction(
  { id: 'concierge-weather-watch', name: 'Concierge: weather watch', triggers: [{ cron: '0 9,15 * * *' }] },
  async ({ step }) => {
    const candidates = await step.run('load-window-trips', () => getConciergeWindowTrips());

    const now = new Date();
    const events = [];
    for (const { trip, prefs } of candidates) {
      const hit = await step.run(`scan-${trip.id}`, () => scanTripForReactive(trip, prefs, now));
      if (hit) {
        events.push({
          name: 'concierge/reactive.due',
          data: { tripId: hit.tripId, dayNumber: hit.dayNumber, signal: hit.signal, localDate: hit.localDate },
        });
      }
    }

    if (events.length) await step.sendEvent('fan-out-reactive', events);
    return { scanned: candidates.length, alerts: events.length };
  }
);
