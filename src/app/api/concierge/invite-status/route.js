import { NextResponse } from 'next/server';
import { getRequesterFromAuthHeader } from '@/lib/supabase/requestAuth';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { isInvited } from '@/lib/concierge/invites';

export const runtime = 'nodejs';

/**
 * GET /api/concierge/invite-status
 * Whether the signed-in user is in the early-access beta (CONCIERGE_ALLOWLIST
 * or an invited concierge_waitlist row). The UI uses this to show the opt-in
 * toggle vs the waitlist form; enforcement happens at send time regardless.
 */
export async function GET(request) {
  const { requester, response } = await getRequesterFromAuthHeader(request);
  if (response) return response;

  const invited = await isInvited({
    supabase: await getSupabaseAdmin(),
    email: requester.userEmail,
    userId: requester.userId,
  });

  return NextResponse.json({ invited });
}
