import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/health — uptime probe. Verifies the database answers and reports
 * which integrations are configured (presence only, never values). 200 when
 * the core is up, 503 when the database is unreachable.
 */
export async function GET() {
  const checks = {
    database: 'unknown',
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    inngest: !!(process.env.INNGEST_EVENT_KEY && process.env.INNGEST_SIGNING_KEY) || process.env.INNGEST_DEV === '1',
    webPush: !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
    email: !!process.env.RESEND_API_KEY,
    redis: !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN),
  };

  try {
    const supabase = await getSupabaseAdmin();
    const { error } = await supabase.from('trips').select('id', { count: 'exact', head: true }).limit(1);
    checks.database = error ? 'error' : 'ok';
    if (error) console.error('[health] database check failed:', error.message);
  } catch (err) {
    checks.database = 'unconfigured';
    console.error('[health] supabase unavailable:', err?.message);
  }

  const ok = checks.database === 'ok';
  return NextResponse.json({ ok, checks }, { status: ok ? 200 : 503 });
}
