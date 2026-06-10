import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { requireTripWriteAccess } from '@/lib/trips/requireTripAccess';
import { decideProposal } from '@/lib/concierge/proposalDecision';
import { isInvited } from '@/lib/concierge/invites';

export const runtime = 'nodejs';

/**
 * POST /api/trips/[id]/agent/apply   body: { messageId, decision: 'apply'|'skip' }
 *
 * The Apply/Skip button behind every agent proposal. Thin wrapper over
 * decideProposal (shared with the Telegram inline buttons), which reads the
 * intent from the message row and re-validates on a fresh trip read.
 */
export async function POST(request, { params }) {
  const { id: tripId } = await params;

  const { requester, response } = await requireTripWriteAccess(request, tripId);
  if (response) return response;

  const supabase = await getSupabaseAdmin();
  const invited = await isInvited({ supabase, email: requester.userEmail, userId: requester.userId });
  if (!invited) {
    return NextResponse.json({ error: 'Early access required.', code: 'not_invited' }, { status: 403 });
  }

  let body = {};
  try { body = await request.json(); } catch { /* */ }
  const messageId = typeof body?.messageId === 'string' ? body.messageId : null;
  const decision = body?.decision === 'skip' ? 'skip' : body?.decision === 'apply' ? 'apply' : null;
  if (!messageId || !decision) {
    return NextResponse.json({ error: 'messageId and decision are required.' }, { status: 400 });
  }

  const result = await decideProposal(supabase, {
    tripId,
    userId: requester.userId,
    userEmail: requester.userEmail,
    messageId,
    decision,
  });

  if (!result.ok) {
    const status = result.status === 'failed' ? 409 : 404;
    return NextResponse.json({ ok: false, status: result.status || 'error', error: result.error }, { status });
  }
  return NextResponse.json(result);
}
