import { NextResponse } from 'next/server';
import { getRequesterFromAuthHeader } from '@/lib/supabase/requestAuth';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { enforceRateLimit, RATE_LIMITS } from '@/lib/rateLimit';
import { normalizeWaitlistSignup } from '@/lib/concierge/waitlist';
import { sendOperatorSignupEmail } from '@/lib/concierge/email';

export const runtime = 'nodejs';

/**
 * POST /api/concierge/waitlist   body: { email, channels?: {push, email}, source? }
 * Early-access signup for the travel agent. Anonymous-friendly (the form shows
 * to signed-out visitors); when a session is present we link the user. Upserts
 * on email so re-joining refreshes preferences instead of erroring.
 */
export async function POST(request) {
  const limited = await enforceRateLimit(request, {
    route: 'concierge-waitlist',
    ...RATE_LIMITS.waitlist,
  });
  if (limited) return limited;

  let body = {};
  try { body = await request.json(); } catch { /* */ }

  const { record, error } = normalizeWaitlistSignup(body);
  if (error) return NextResponse.json({ error }, { status: 400 });

  // Best-effort identity link — signup itself never requires auth.
  const { requester } = await getRequesterFromAuthHeader(request, { required: false });

  const supabase = await getSupabaseAdmin();
  const { error: dbError } = await supabase.from('concierge_waitlist').upsert(
    {
      ...record,
      ...(requester?.userId ? { user_id: requester.userId } : {}),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'email' }
  );
  if (dbError) {
    console.error('[concierge/waitlist] upsert failed:', dbError.message);
    return NextResponse.json({ error: 'Could not save your signup — try again in a moment.' }, { status: 502 });
  }

  // Tell the operator someone's waiting. Awaited (serverless would cut off a
  // dangling promise) but best-effort — a notify failure never fails the signup.
  try {
    await sendOperatorSignupEmail({
      email: record.email,
      source: record.source,
      wantsPush: record.wants_push,
      wantsEmail: record.wants_email,
    });
  } catch (err) {
    console.error('[concierge/waitlist] operator notify failed:', err?.message);
  }

  return NextResponse.json({ ok: true });
}
