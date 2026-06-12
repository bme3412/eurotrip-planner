import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
import { conciergeTick } from '@/inngest/functions/conciergeTick';
import { conciergeSend } from '@/inngest/functions/conciergeSend';
import { conciergeWeatherWatch } from '@/inngest/functions/conciergeWeatherWatch';
import { conciergeReactiveSend } from '@/inngest/functions/conciergeReactiveSend';
import { conciergeHoursWatch } from '@/inngest/functions/conciergeHoursWatch';

export const runtime = 'nodejs';
// conciergeSend's evening beat runs the agentic nightly round (multi-stop
// hours checks + the brief, 60–120s); morning/wind-down stay one-shot ~19s.
export const maxDuration = 300;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [conciergeTick, conciergeSend, conciergeWeatherWatch, conciergeReactiveSend, conciergeHoursWatch],
});
