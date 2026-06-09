import { inngest } from '../client';
import { sendConciergeBrief } from '@/lib/concierge/notify';

// One brief per event. Concurrency-capped so we never hammer the Anthropic API,
// and idempotent on (trip, beat, local date) so retries/replays never double-send
// (the DB unique key is the second line of defense). Inngest retries transient
// failures automatically.
export const conciergeSend = inngest.createFunction(
  {
    id: 'concierge-send',
    name: 'Concierge: send a brief',
    concurrency: { limit: 5 },
    idempotency: 'event.data.tripId + "-" + event.data.type + "-" + event.data.localDate',
    triggers: [{ event: 'concierge/brief.due' }],
  },
  async ({ event, step }) => {
    const { tripId, dayNumber, type } = event.data;
    const result = await step.run('send-brief', () =>
      sendConciergeBrief({ tripId, dayNumber, type })
    );
    if (!result.ok) throw new Error(`send failed: ${result.reason}`); // let Inngest retry
    return { ok: true, notificationId: result.notification?.id, tripId, type };
  }
);
