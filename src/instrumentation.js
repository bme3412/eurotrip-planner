/**
 * Next.js instrumentation hook — runs once at server boot.
 *
 * The app degrades gracefully when integrations are unconfigured (fallback
 * prose, local-only drafts, unlimited-ish rate limits), which is right for
 * dev but silent in production. Surface what's missing in one place at
 * startup instead of as scattered per-request behavior.
 */

// Feature each var unlocks; nothing here throws — boot always proceeds.
const INTEGRATIONS = [
  ['NEXT_PUBLIC_SUPABASE_URL', 'auth + saved trips'],
  ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'auth + saved trips'],
  ['SUPABASE_SERVICE_ROLE_KEY', 'trip persistence + concierge pipeline'],
  ['ANTHROPIC_API_KEY', 'planner agent + concierge prose (fallback prose without it)'],
  ['GOOGLE_PLACES_API_KEY', 'place photos + itinerary enrichment'],
  ['NEXT_PUBLIC_MAPBOX_TOKEN', 'explore map'],
];

const PROD_ONLY = [
  ['UPSTASH_REDIS_REST_URL', 'rate limits fall back to per-instance memory'],
  ['UPSTASH_REDIS_REST_TOKEN', 'rate limits fall back to per-instance memory'],
];

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const missing = INTEGRATIONS.filter(([name]) => !process.env[name]);
  if (process.env.NODE_ENV === 'production') {
    missing.push(...PROD_ONLY.filter(([name]) => !process.env[name]));
  }
  if (missing.length === 0) return;

  console.warn(
    `[env] ${missing.length} integration var(s) unset — affected features degrade or disable:\n` +
      missing.map(([name, feature]) => `  - ${name} (${feature})`).join('\n')
  );
}
