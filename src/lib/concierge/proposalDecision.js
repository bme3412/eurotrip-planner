// Shared Apply/Skip decision logic — behind the Trip Home card AND Telegram's
// inline buttons. The proposal's INTENT is read from the message row
// (canonical, never caller-supplied), ownership is verified against the
// thread's trip, and applying re-validates on a fresh trip read.

import { getTripWithDetails } from '@/lib/trips/tripsRepository';
import { applyProposal } from './tripActions';
import { appendThreadMessage } from './thread';

/**
 * @param {object} supabase  service-role client
 * @param {object} args { tripId, userId, userEmail?, messageId, decision: 'apply'|'skip' }
 * @returns {Promise<{ ok: true, status: 'applied'|'skipped'|string, summary?: string } | { ok: false, status?: 'failed', error: string }>}
 */
export async function decideProposal(supabase, { tripId, userId, userEmail = null, messageId, decision }) {
  const { data: msg, error: msgErr } = await supabase
    .from('concierge_messages')
    .select('id, user_id, meta, thread_id, concierge_threads!inner(trip_id)')
    .eq('id', messageId)
    .maybeSingle();
  if (msgErr || !msg) return { ok: false, error: 'Proposal not found.' };
  if (msg.user_id !== userId || msg.concierge_threads?.trip_id !== tripId) {
    return { ok: false, error: 'Proposal not found.' };
  }

  const proposal = msg.meta?.proposal;
  if (!proposal?.intent) return { ok: false, error: 'This message has no proposal.' };
  if (proposal.status !== 'pending') {
    return { ok: true, status: proposal.status, summary: proposal.diff };
  }

  const setStatus = async (status, extra = {}) => {
    await supabase
      .from('concierge_messages')
      .update({ meta: { ...msg.meta, proposal: { ...proposal, status, ...extra } } })
      .eq('id', msg.id);
  };

  if (decision === 'skip') {
    await setStatus('skipped');
    return { ok: true, status: 'skipped' };
  }

  const trip = await getTripWithDetails(tripId);
  if (!trip) return { ok: false, error: 'Trip not found.' };

  const result = await applyProposal(supabase, trip, proposal.intent);
  if (result.error) {
    await setStatus('failed', { failReason: result.error });
    return { ok: false, status: 'failed', error: result.error };
  }

  await setStatus('applied');
  await appendThreadMessage(supabase, {
    threadId: msg.thread_id,
    userId,
    userEmail,
    role: 'olivier',
    kind: 'action',
    body: `Done — ${result.summary}.`,
    meta: { appliedFrom: msg.id },
  });

  return { ok: true, status: 'applied', summary: result.summary };
}
