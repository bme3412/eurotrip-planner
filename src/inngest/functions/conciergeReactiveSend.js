import { inngest } from '../client';
import { sendReactiveAlert } from '@/lib/concierge/notify';

// Generates + delivers one proactive reactive alert. Concurrency-capped and
// idempotent on (trip, day, signal kind, local date) so a re-detected change on a
// later scan doesn't re-ping (the DB unique key on type='reactive' backs this up).
export const conciergeReactiveSend = inngest.createFunction(
  {
    id: 'concierge-reactive-send',
    name: 'Concierge: send a reactive alert',
    concurrency: { limit: 5 },
    idempotency: 'event.data.tripId + "-" + event.data.signal.kind + "-" + event.data.localDate',
    triggers: [{ event: 'concierge/reactive.due' }],
  },
  async ({ event, step }) => {
    const { tripId, dayNumber, signal } = event.data;
    const result = await step.run('send-reactive', () => sendReactiveAlert({ tripId, dayNumber, signal }));
    if (!result.ok) throw new Error(`reactive send failed: ${result.reason}`);
    return { ok: true, notificationId: result.notification?.id, tripId };
  }
);
