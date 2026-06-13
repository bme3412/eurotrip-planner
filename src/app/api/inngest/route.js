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

// Pin the serve endpoint to a stable, always-reachable host. Without serveHost,
// Inngest derives the function URL from the incoming request host — on Vercel
// that's the immutable per-deployment URL (e.g. *-bme3412.vercel.app), so
// superseded deployments keep receiving cron ticks. Those per-deployment URLs
// also sit behind Vercel deployment protection, so Inngest appends the bypass
// secret as a query param to reach them — the leak in Finding 1. Pinning to the
// unprotected production alias fixes both: one host is invoked, and no bypass
// secret is sent.
//
// Deliberately NOT NEXT_PUBLIC_SITE_URL: Inngest reachability must not depend on
// the user-facing custom domain's TLS cert (euro-trip.xyz). Override with
// INNGEST_SERVE_HOST once that domain serves a valid cert. Local dev
// (INNGEST_DEV) keeps the request-host default so the dev server can reach
// localhost.
const rawServeHost = process.env.INNGEST_DEV
  ? null
  : process.env.INNGEST_SERVE_HOST?.trim() || 'https://eurotrip-planner.vercel.app';
const serveHost = rawServeHost ? new URL(rawServeHost).origin : undefined;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [conciergeTick, conciergeSend, conciergeWeatherWatch, conciergeReactiveSend, conciergeHoursWatch],
  ...(serveHost ? { serveHost } : {}),
});
