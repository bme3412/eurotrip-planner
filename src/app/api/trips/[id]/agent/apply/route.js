import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { requireTripWriteAccess } from '@/lib/trips/requireTripAccess';
import { getTripWithDetails } from '@/lib/trips/tripsRepository';
import { applyProposal } from '@/lib/concierge/tripActions';
import { appendThreadMessage } from '@/lib/concierge/thread';
import { isInvited } from '@/lib/concierge/invites';

export const runtime = 'nodejs';

/**
 * POST /api/trips/[id]/agent/apply   body: { messageId, decision: 'apply'|'skip' }
 *
 * The Apply/Skip button behind every agent proposal. The proposal's INTENT is
 * read from the message row (canonical — never from the client), re-validated
 * against a fresh trip read, and only then executed. Applying posts an
 * `action` message into the thread and bumps trips.updated_at (brief caches
 * key on it).
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

  // The message must be the requester's, in a thread on THIS trip, and carry a
  // pending proposal.
  const { data: msg, error: msgErr } = await supabase
    .from('concierge_messages')
    .select('id, user_id, meta, thread_id, concierge_threads!inner(trip_id)')
    .eq('id', messageId)
    .maybeSingle();
  if (msgErr || !msg) return NextResponse.json({ error: 'Proposal not found.' }, { status: 404 });
  if (msg.user_id !== requester.userId || msg.concierge_threads?.trip_id !== tripId) {
    return NextResponse.json({ error: 'Proposal not found.' }, { status: 404 });
  }
  const proposal = msg.meta?.proposal;
  if (!proposal?.intent) return NextResponse.json({ error: 'This message has no proposal.' }, { status: 400 });
  if (proposal.status !== 'pending') {
    return NextResponse.json({ ok: true, status: proposal.status, summary: proposal.diff });
  }

  const setStatus = async (status, extra = {}) => {
    await supabase
      .from('concierge_messages')
      .update({ meta: { ...msg.meta, proposal: { ...proposal, status, ...extra } } })
      .eq('id', msg.id);
  };

  if (decision === 'skip') {
    await setStatus('skipped');
    return NextResponse.json({ ok: true, status: 'skipped' });
  }

  // Apply: fresh trip read → full re-validation → execute.
  const trip = await getTripWithDetails(tripId);
  if (!trip) return NextResponse.json({ error: 'Trip not found.' }, { status: 404 });

  const result = await applyProposal(supabase, trip, proposal.intent);
  if (result.error) {
    await setStatus('failed', { failReason: result.error });
    return NextResponse.json({ ok: false, status: 'failed', error: result.error }, { status: 409 });
  }

  await setStatus('applied');
  await appendThreadMessage(supabase, {
    threadId: msg.thread_id,
    userId: requester.userId,
    userEmail: requester.userEmail,
    role: 'olivier',
    kind: 'action',
    body: `Done — ${result.summary}.`,
    meta: { appliedFrom: msg.id },
  });

  return NextResponse.json({ ok: true, status: 'applied', summary: result.summary });
}
