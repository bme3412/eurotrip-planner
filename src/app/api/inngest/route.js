import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
import { conciergeTick } from '@/inngest/functions/conciergeTick';
import { conciergeSend } from '@/inngest/functions/conciergeSend';
import { conciergeWeatherWatch } from '@/inngest/functions/conciergeWeatherWatch';
import { conciergeReactiveSend } from '@/inngest/functions/conciergeReactiveSend';

export const runtime = 'nodejs';
// conciergeSend generates a ~19s brief; give the function room.
export const maxDuration = 60;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [conciergeTick, conciergeSend, conciergeWeatherWatch, conciergeReactiveSend],
});
